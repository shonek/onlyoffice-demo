const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const FILES_DIR = path.join(__dirname, "../files");
if (!fs.existsSync(FILES_DIR)) {
  fs.mkdirSync(FILES_DIR, { recursive: true });
}

const generateFileKey = (fileName) => {
  const md5 = crypto
    .createHash("md5")
    .update(fileName + Date.now())
    .digest("hex");
  return md5;
};

function decodeFileName(originalname) {
  return Buffer.from(originalname, "latin1").toString("utf8");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, FILES_DIR);
  },
  filename: (req, file, cb) => {
    const originalname = decodeFileName(file.originalname);
    const fileKey = generateFileKey(encodeURIComponent(originalname));
    const ext = path.extname(originalname);
    cb(null, `${fileKey}${ext}`);
  },
});

const upload = multer({ storage });

// 下载并保存文件
async function downloadAndSaveFile(fileUrl, filePath) {
  const http = require("http");
  const fs = require("fs");
  const path = require("path");

  return new Promise((resolve, reject) => {
    http
      .get(fileUrl, (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const buffer = Buffer.concat(chunks);
          fs.writeFileSync(filePath, buffer);
          console.log(`文件已保存: ${filePath}`);
          resolve();
        });
      })
      .on("error", reject);
  });
}

module.exports = {
  upload,
  generateFileKey,
  decodeFileName,
  downloadAndSaveFile,
  FILES_DIR,
};
