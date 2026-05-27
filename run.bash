# 构建镜像
docker build -t file-manager .

# 运行容器（建议挂载持久化目录）
docker run -d \
  -p 3001:3001 \
  -v $(pwd)/data.db:/app/data.db \
  -v $(pwd)/files:/app/files \
  --name file-manager \
  file-manager