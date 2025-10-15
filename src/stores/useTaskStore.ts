import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CompressionTask, TaskType } from '../types'

export const useTaskStore = defineStore('task', () => {
  // 状态
  const tasks = ref<CompressionTask[]>([])
  const selectedTaskId = ref<string | null>(null)
  const isProcessingBatch = ref(false)
  const currentBatchIndex = ref(0)
  const batchQueue = ref<CompressionTask[]>([])

  // 计算属性
  const selectedTask = computed(() => {
    return tasks.value.find(task => task.id === selectedTaskId.value) || null
  })

  const pendingTasks = computed(() => {
    return tasks.value.filter(task => task.status === 'pending')
  })

  const queuedTasks = computed(() => {
    return tasks.value.filter(task => task.status === 'queued')
  })

  const processingTasks = computed(() => {
    return tasks.value.filter(task => task.status === 'processing')
  })

  const completedTasks = computed(() => {
    return tasks.value.filter(task => task.status === 'completed')
  })

  const failedTasks = computed(() => {
    return tasks.value.filter(task => task.status === 'failed')
  })

  const pausedTasks = computed(() => {
    return tasks.value.filter(task => task.status === 'paused')
  })

  const tasksByType = computed(() => {
    return (type: TaskType) => tasks.value.filter(task => task.type === type)
  })

  const taskCount = computed(() => tasks.value.length)

  // 动作
  const addTask = (task: CompressionTask) => {
    tasks.value.push(task)
    
    // 如果当前没有选中任务，自动选中新添加的任务
    if (!selectedTaskId.value) {
      selectedTaskId.value = task.id
    }
    
    // 限制任务数量不超过99个
    if (tasks.value.length > 99) {
      const sortedTasks = [...tasks.value].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      const tasksToRemove = sortedTasks.slice(0, tasks.value.length - 99)
      tasksToRemove.forEach(taskToRemove => {
        removeTask(taskToRemove.id)
      })
    }
  }

  const addTasks = (newTasks: CompressionTask[]) => {
    newTasks.forEach(task => addTask(task))
  }

  const removeTask = (taskId: string) => {
    const index = tasks.value.findIndex(task => task.id === taskId)
    if (index !== -1) {
      tasks.value.splice(index, 1)
      
      // 如果删除的是当前选中的任务，选中第一个可用任务
      if (selectedTaskId.value === taskId) {
        selectedTaskId.value = tasks.value.length > 0 ? tasks.value[0].id : null
      }
      
      // 从批量队列中移除
      const batchIndex = batchQueue.value.findIndex(task => task.id === taskId)
      if (batchIndex !== -1) {
        batchQueue.value.splice(batchIndex, 1)
      }
    }
  }

  // 为兼容旧代码，提供别名方法
  const deleteTask = (taskId: string) => {
    removeTask(taskId)
  }

  const selectTask = (taskId: string) => {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      selectedTaskId.value = taskId
    }
  }

  const clearAllTasks = () => {
    tasks.value = []
    selectedTaskId.value = null
    batchQueue.value = []
    isProcessingBatch.value = false
    currentBatchIndex.value = 0
  }

  const getTaskById = (taskId: string) => {
    return tasks.value.find(task => task.id === taskId)
  }

  // 状态流转校验：
  // - 等待中(pending) 只能变为 排队中(queued)、压缩中(processing)、取消(cancelled)
  // - 压缩中(processing) 只能变为 暂停(paused)、完成(completed)、失败(failed)、取消(cancelled)，不可回到排队中(queued)
  const isValidStatusTransition = (
    from: CompressionTask['status'],
    to: CompressionTask['status']
  ): boolean => {
    if (from === to) return true
    if (from === 'pending') {
      return to === 'queued' || to === 'processing' || to === 'cancelled'
    }
    if (from === 'processing') {
      // 已有进度，不允许回到排队中
      return to === 'paused' || to === 'completed' || to === 'failed' || to === 'cancelled'
    }
    return true
  }

  const updateTask = (updatedTask: CompressionTask) => {
    const index = tasks.value.findIndex(task => task.id === updatedTask.id)
    if (index !== -1) {
      const prev = tasks.value[index]
      let nextTask = updatedTask
      // 若涉及状态变更，先做校验
      if (updatedTask.status && prev.status && updatedTask.status !== prev.status) {
        if (!isValidStatusTransition(prev.status, updatedTask.status)) {
          console.warn(`[TaskStore] Illegal status transition in updateTask: ${prev.status} -> ${updatedTask.status} for ${updatedTask.id}`)
          nextTask = { ...updatedTask, status: prev.status }
        }
      }
      tasks.value[index] = nextTask
      
      // 同步更新批量队列中的任务
      const batchIndex = batchQueue.value.findIndex(task => task.id === updatedTask.id)
      if (batchIndex !== -1) {
        batchQueue.value[batchIndex] = nextTask
      }
    }
  }

  const updateTaskStatus = (taskId: string, status: CompressionTask['status']) => {
    const task = getTaskById(taskId)
    if (task) {
      if (!isValidStatusTransition(task.status, status)) {
        console.warn(`[TaskStore] Illegal status transition: ${task.status} -> ${status} for ${taskId}`)
        return
      }
      const updatedTask = { ...task, status }
      updateTask(updatedTask)
    }
  }

  const updateTaskProgress = (taskId: string, progress: number) => {
    const task = getTaskById(taskId)
    if (task) {
      const updatedTask = { ...task, progress }
      updateTask(updatedTask)
    }
  }

  // 批量处理相关
  const startBatchProcessing = (tasksToProcess: CompressionTask[]) => {
    batchQueue.value = [...tasksToProcess]
    isProcessingBatch.value = true
    currentBatchIndex.value = 0
  }

  const stopBatchProcessing = () => {
    isProcessingBatch.value = false
    batchQueue.value = []
    currentBatchIndex.value = 0
  }

  const nextBatchTask = () => {
    if (currentBatchIndex.value < batchQueue.value.length - 1) {
      currentBatchIndex.value++
      return batchQueue.value[currentBatchIndex.value]
    }
    return null
  }

  const getCurrentBatchTask = () => {
    if (currentBatchIndex.value < batchQueue.value.length) {
      return batchQueue.value[currentBatchIndex.value]
    }
    return null
  }

  return {
    // 状态
    tasks,
    selectedTaskId,
    isProcessingBatch,
    currentBatchIndex,
    batchQueue,
    
    // 计算属性
    selectedTask,
    pendingTasks,
    queuedTasks,
    processingTasks,
    completedTasks,
    failedTasks,
    pausedTasks,
    tasksByType,
    taskCount,
    
    // 动作
    addTask,
    addTasks,
    removeTask,
    deleteTask,
    updateTask,
    selectTask,
    clearAllTasks,
    getTaskById,
    updateTaskStatus,
    updateTaskProgress,
    
    // 批量处理
    startBatchProcessing,
    stopBatchProcessing,
    nextBatchTask,
    getCurrentBatchTask
  }
})