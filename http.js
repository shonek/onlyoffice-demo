const express = require("express");
const cors = require("cors");
const { consoleLogger, fileLogger } = require("./utils/logger");
const app = express();

app.disable("etag");
app.use(cors());

app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// 日志中间件：文件记录所有请求，控制台只输出错误请求
app.use(fileLogger);
app.use(consoleLogger);

app.use(express.json({ limit: "50mb" }));

app.use(express.static("frontend/dist"));

module.exports = { app };
