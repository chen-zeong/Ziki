# 任务队列与状态管理设计（仅允许单任务同时压缩）

本方案用于本地压缩类应用的任务队列与状态管理，核心目标是：任何时刻仅允许一个任务处于“压缩中”（Running）状态，其余任务按策略排队等待执行。

## 设计目标与原则
- 单实例运行：同一时间仅 1 个 Running。
- 可预期：新增任务的去向清晰，开始/结束/失败的行为可预测。
- 可控：支持取消、暂停队列（非中断当前任务）、重试、调整优先级与顺序。
- 可恢复：应用异常退出后可恢复队列与任务状态。
- 一致性：避免输出冲突、重复执行和资源竞争。

## 任务状态定义
- Created（或 Pending）：任务已创建但尚未入队（短暂态，通常立即转入 Queued）。
- Queued：等待执行。
- Running：正在压缩（全局同时仅 1 个）。
- Retrying：失败后触发自动重试的中间状态（含退避等待）。
- Paused：任务被人工暂停（若对单任务不支持安全暂停，则不提供“单任务暂停”，仅提供“暂停队列”）。
- Canceled：被取消且不会再执行。
- Completed：成功完成。
- Failed：失败且达到最大重试次数或错误为不可重试。
- Interrupted：应用崩溃/退出导致的中断（启动时根据策略转化为 Failed 或进入重试/排队）。
- Blocked：被依赖/资源占用等条件阻塞（可选）。

说明：状态是单向有序的；Queued → Running → Completed/Failed/Canceled 是最常见路径。

## 状态转换（关键）
- Created → Queued：入队成功。
- Queued → Running：调度器启动执行；需满足“当前无 Running”。
- Running → Completed：任务成功结束。
- Running → Failed：发生错误；如可重试则进入 Retrying/Queued。
- Running → Canceled：用户强制终止；立即释放执行权，调度下一个。
- Failed → Retrying：在退避窗口结束后，自动回到 Queued（或直接 Running 若空闲）。
- Interrupted → Queued/Failed：应用重启后恢复；可配置是否自动重试一次。
- 任意 → Canceled：用户取消（Queued 直接出队并标记，Running 需安全终止）。

禁止转换：
- 不允许出现两个任务同时 Running。
- 不支持“随时暂停并可无损恢复”的单任务暂停（压缩一般难以安全断点续传）；提供“暂停队列（Queue Paused）”开关：不再启动新任务，但不打断当前 Running。

## 调度与并发策略
- 并发度固定为 1。
- 全局调度器（QueueController）负责：
  - 监听队列变化与任务状态事件；
  - 若无 Running 且队列非空（且队列未暂停），取队首任务置为 Running；
  - Running 结束后（Completed/Failed/Canceled），立即尝试启动下一个。

## 入队与排队规则（现代化行为）
- 新增任务：
  - 若无 Running 且队列未暂停 → 立即 Running。
  - 否则 → 进入 Queued。
- 批量新增：按提交顺序入队（稳定排序）。
- 去重策略（可选配置）：
  - 输出冲突检测：若输出路径/文件名将冲突，提供策略：自动重命名（-1, -2…）、覆盖、跳过或合并。
  - 相同输入参数+输出目标的重复任务：默认合并或提示用户。
- 优先级：默认 Priority=Normal；支持 High/Normal/Low 三档：
  - 调度选择队首时：按 Priority 分组，使用 High > Normal > Low；同优先级按 FIFO。
  - 支持“置顶/Start Now”：将任务移动到对应优先级队首。
- 排队暂停（Queue Paused）：
  - 打开后：正在 Running 的任务继续至结束；结束后不再启动新任务。
  - 关闭后：正常从队首继续调度。

## 运行期控制
- 取消（Cancel）：
  - Queued：直接出队 → Canceled。
  - Running：尽量安全终止（若不可安全中止，提示“强制终止可能导致损坏”），→ Canceled。
- 重试（Retry）：
  - 对 Failed 的任务，手动重试：入队至队首或依据策略（可选）。
  - 自动重试：指数退避（如 1s, 2s, 4s, 8s，上限 30s），最多 N 次（默认 3）。
  - 错误分类：
    - 可重试：临时 I/O、临时权限、资源忙。
    - 不可重试：输入文件不存在/损坏、参数非法、编解码器缺失且无法自动安装。
- 跳过（Skip）：将 Queued 任务标记为 Skipped（或直接 Canceled），不影响其他任务。
- 重新排序：支持拖拽调整队列顺序（同优先级内），或修改优先级。

## 资源与一致性保障
- 输出冲突：任务启动前检查输出路径；若冲突按策略处理（重命名/覆盖/跳过/阻塞等待外部释放）。
- 磁盘空间：Running 前预检剩余空间，不足则保持在 Queued 并显示 Blocked（磁盘不足）；监控到空间足够后自动恢复到可运行。
- 文件锁：避免多个任务写同一路径（即使并发=1，也需考虑外部进程）。

## 持久化与崩溃恢复
- 持久化内容：任务列表、状态、参数、优先级、顺序、失败原因、重试计数、创建时间、最后更新时间。
- 崩溃/异常退出：上次 Running 标记为 Interrupted；
  - 启动时策略：
    - 若开启“自动恢复” → 将 Interrupted 放回队列前部并进行一次自动重试；
    - 否则 → 标记为 Failed，并提供“重试”按钮。

## UI/交互规范（建议）
- 列表中仅一个任务显示“压缩中”（Running）徽标与进度条。
- 其他项显示：Queued（位置/优先级）、Failed（错误信息/可重试）、Canceled、Completed。
- 全局控件：Pause Queue、Resume Queue、Stop After Current（当前完成后暂停队列）。
- 批量添加时：显示“已入队 N 项”，并可直接跳转到队列。

## 排序与公平性
- 采用（Priority，CreatedAt）的稳定排序；支持手动调整。
- 防饥饿：当持续有 High 优先级插入时，保证 Normal/Low 在一定时间/数量后获得调度（如高优先级连续执行 K 个后，强制插入一个低优先级任务）。可配置开关。

## 典型场景处理
1) 当前空闲，新增任务A → A 立即 Running。
2) A Running 中，新增 B、C → B、C 入队（Queued）。
3) 用户“暂停队列” → A 继续至完成；完成后不启动 B。
4) 用户“恢复队列” → 启动 B。
5) A 失败 → 自动重试 1 次（退避），仍失败 → Failed；用户可手动 Retry（入队到队首）。
6) 用户“置顶”任务 C → C 成为队首（若启用优先级，同优先级内置顶，或将 C 调到 High）。
7) 关闭应用重开：上次 Running 标记 Interrupted → 根据配置自动重试或标记 Failed。

## 简要调度伪代码
```
loop:
  if queuePaused: wait
  if running == None:
    next = pickNextTaskByPriorityAndOrder()
    if next:
      start(next) // set Running
  wait for events (taskFinished/taskFailed/taskCanceled/newTask/priorityChanged)
  on taskFinished -> running=None
  on taskFailed:
    if canRetry && retryCount < max:
      scheduleWithBackoff(task)
    else mark Failed; running=None
  on newTask/priorityChanged:
    if running==None && !queuePaused: try start immediately
```

## 扩展点
- 未来可切换并发度>1：将调度器的“running 槽位”由 1 扩展为 N；其余策略保持一致。
- 增加任务依赖/分组：支持“所有子任务完成后再执行汇总任务”。

以上方案保证“任意时刻仅一个任务在压缩中”，同时提供现代化队列所需的可控性、可恢复性与用户体验。