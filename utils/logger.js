const morgan = require("morgan");
const fs = require("fs");
const path = require("path");

// 日志目录
const LOGS_DIR = path.join(__dirname, "../logs");
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// 按日期生成日志文件名
function getLogFileName() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  return path.join(LOGS_DIR, `${dateStr}.log`);
}

// 自定义 morgan 格式：时间 | 方法 | URL | 状态 | 响应时间 | 内容长度
morgan.token("date-local", () => {
  return new Date().toLocaleString("zh-CN", { hour12: false });
});

const logFormat =
  ":date-local | :method :url | :status | :response-time ms | :res[content-length]";

// 控制台输出（开发用，彩色）
const consoleLogger = morgan(logFormat, {
  skip: (req, res) => res.statusCode < 400,
});

// 文件输出（所有请求）
const fileStream = {
  write: (text) => {
    const line = text.trim();
    fs.appendFileSync(getLogFileName(), line + "\n");
  },
};
const fileLogger = morgan(logFormat, { stream: fileStream });

module.exports = {
  consoleLogger,
  fileLogger,
  LOGS_DIR,
};
