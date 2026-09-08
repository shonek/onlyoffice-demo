# 用法：
#   ./run.bash                                        # 默认 latest，无密钥
#   ./run.bash IMAGE_VERSION=v1.0                      # 指定版本
#   ./run.bash IMAGE_VERSION=v1.0 ONLY_OFFICE_KEY=xxx # 同时指定密钥
#   也可继续用环境变量：IMAGE_VERSION=v1.0 ./run.bash

# 默认值
IMAGE_VERSION="${IMAGE_VERSION:-latest}"
ONLY_OFFICE_KEY="${ONLY_OFFICE_KEY:-}"

# 解析 KEY=VALUE 形式的命令行参数
for arg in "$@"; do
  case "$arg" in
    IMAGE_VERSION=*)   IMAGE_VERSION="${arg#*=}" ;;
    ONLY_OFFICE_KEY=*)  ONLY_OFFICE_KEY="${arg#*=}" ;;
    *) echo "忽略未知参数: $arg" ;;
  esac
done

IMAGE_NAME="file-manager:${IMAGE_VERSION}"

# 构建镜像
docker build -t "$IMAGE_NAME" .

mkdir -p $(pwd)/data
mkdir -p $(pwd)/files
mkdir -p $(pwd)/logs

# 运行容器（建议挂载持久化目录）
docker run -d \
  -p 3001:3001 \
  -e ONLY_OFFICE_KEY="$ONLY_OFFICE_KEY" \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/files:/app/files \
  -v $(pwd)/logs:/app/logs \
  --name file-manager \
  "$IMAGE_NAME"
