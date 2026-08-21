# 镜像版本，默认使用 latest
IMAGE_VERSION="${1:-latest}"
IMAGE_NAME="file-manager:${IMAGE_VERSION}"

# 构建镜像
docker build -t "$IMAGE_NAME" .

mkdir -p $(pwd)/data
mkdir -p $(pwd)/files
mkdir -p $(pwd)/logs

# 运行容器（建议挂载持久化目录）
docker run -d \
  -p 3001:3001 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/files:/app/files \
  -v $(pwd)/logs:/app/logs \
  --name file-manager \
  "$IMAGE_NAME"