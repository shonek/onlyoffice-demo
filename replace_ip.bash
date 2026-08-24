SERVER_IP=$1
if [ -n "$SERVER_IP" ]; then
  echo "替换配置文件中的 IP 地址为: $SERVER_IP"
  find . -type f \( -name "*.html" -o -name "*.js" \) -exec sed -i 's/172.22.8.199/${SERVER_IP}/g' {} +
else
  echo "未提供 IP 地址，使用默认配置。"
fi