#!/bin/bash

# 测试帧生成时间的脚本
# 使用方法: ./test_frame_generation.sh <video_path>

if [ $# -eq 0 ]; then
    echo "使用方法: $0 <video_path>"
    echo "示例: $0 /path/to/your/video.mp4"
    exit 1
fi

VIDEO_PATH="$1"

if [ ! -f "$VIDEO_PATH" ]; then
    echo "错误: 视频文件不存在: $VIDEO_PATH"
    exit 1
fi

echo "测试视频: $VIDEO_PATH"
echo "开始测试帧生成时间..."
echo "==========================================="

# 测试获取视频时长的时间
echo "1. 测试获取视频时长:"
start_time=$(date +%s.%N)
ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$VIDEO_PATH"
end_time=$(date +%s.%N)
duration_time=$(echo "$end_time - $start_time" | bc)
echo "   耗时: ${duration_time}秒"
echo

# 测试生成单帧的时间（第0帧）
echo "2. 测试生成第0帧:"
start_time=$(date +%s.%N)
ffmpeg -i "$VIDEO_PATH" -vf "select=eq(n\,0)" -vframes 1 -f image2pipe -vcodec png - > /dev/null 2>&1
end_time=$(date +%s.%N)
frame_time=$(echo "$end_time - $start_time" | bc)
echo "   耗时: ${frame_time}秒"
echo

# 测试生成第5帧
echo "3. 测试生成第5帧:"
start_time=$(date +%s.%N)
ffmpeg -i "$VIDEO_PATH" -vf "select=eq(n\,5)" -vframes 1 -f image2pipe -vcodec png - > /dev/null 2>&1
end_time=$(date +%s.%N)
frame5_time=$(echo "$end_time - $start_time" | bc)
echo "   耗时: ${frame5_time}秒"
echo

# 测试连续生成多帧的时间
echo "4. 测试连续生成5帧:"
start_time=$(date +%s.%N)
for i in {0..4}; do
    ffmpeg -i "$VIDEO_PATH" -vf "select=eq(n\,$i)" -vframes 1 -f image2pipe -vcodec png - > /dev/null 2>&1
done
end_time=$(date +%s.%N)
multi_frame_time=$(echo "$end_time - $start_time" | bc)
avg_frame_time=$(echo "$multi_frame_time / 5" | bc -l)
echo "   总耗时: ${multi_frame_time}秒"
echo "   平均每帧: ${avg_frame_time}秒"
echo

echo "==========================================="
echo "测试总结:"
echo "- 获取视频时长: ${duration_time}秒"
echo "- 生成单帧(第0帧): ${frame_time}秒"
echo "- 生成单帧(第5帧): ${frame5_time}秒"
echo "- 连续生成5帧平均: ${avg_frame_time}秒"
echo
echo "注意: 如果您的应用需要同时生成原始帧和压缩帧，"
echo "      实际时间可能是单帧时间的2倍。"