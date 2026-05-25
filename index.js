const { app } = require("./http");
const { getDb } = require("./db");
require("./services/file");
require("./services/onlyoffice");

const PORT = 3001;

getDb().then(() => {
  app.listen(PORT, () => {
    console.log(`上传服务已启动，端口 ${PORT}`);
  });
});
