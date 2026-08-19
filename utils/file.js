const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const AdmZip = require("adm-zip");

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

async function downloadFile(fileUrl) {
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
          resolve(buffer);
        });
      })
      .on("error", reject);
  });
}

// 下载并保存文件
async function downloadAndSaveFile(fileUrl, filePath) {
  const http = require("http");
  const fs = require("fs");
  const path = require("path");

  return downloadFile(fileUrl).then((buffer) => {
    fs.writeFileSync(filePath, buffer);
    console.log(`文件已保存: ${filePath}`);
    return;
  });
}

/**
 * 解析 docx 文件中的批注，返回所有批注信息
 *
 * 批注相关文件说明：
 *   word/comments.xml           — 批注内容（id, author, date, initials, text）
 *   word/commentsExtended.xml   — 批注扩展属性（paraId → done 状态, paraIdParent）
 *   word/commentsExtensible.xml — 批注持久化 ID 和时间（durableId, dateUtc）
 *   word/people.xml             — 批注作者信息
 *
 * 关联关系：
 *   comments.xml <w:comment w:id="N"> → <w:p w14:paraId="XXX">
 *   commentsExtended.xml <w15:commentEx w15:paraId="XXX"> → 通过 paraId 关联
 *   commentsExtensible.xml <w16cex:commentExtensible> → 按顺序与 comments.xml 对应
 *
 * @param {string} filePath — docx 文件路径
 * @returns {{ id: string, author: string, date: string, initials: string,
 *             text: string, resolved: boolean, parentId: string|null,
 *             durableId: string|null }[]}
 */
function extractComments(filePath) {
  const zip = new AdmZip(filePath);

  // 读取 comments.xml 获取批注内容
  const commentsXml = readZipEntry(zip, "word/comments.xml");
  if (!commentsXml) {
    return [];
  }

  // 读取 commentsExtended.xml 获取批注状态（done、parentId）
  const extendedXml = readZipEntry(zip, "word/commentsExtended.xml");

  // 读取 commentsExtensible.xml 获取 durableId
  const extensibleXml = readZipEntry(zip, "word/commentsExtensible.xml");

  // 解析 commentsExtended: 建立 paraId → { done, parentId } 的映射
  const extendedMap = parseCommentsExtended(extendedXml);

  // 解析 commentsExtensible: 按顺序获取 durableId 列表
  const durableIds = parseCommentsExtensible(extensibleXml);

  // 解析 comments.xml 中的批注
  const comments = parseCommentsXml(commentsXml, extendedMap, durableIds);

  return comments;
}

/**
 * 读取 ZIP 中的条目内容，不存在则返回 null
 */
function readZipEntry(zip, entryName) {
  const entry = zip.getEntry(entryName);
  if (!entry) return null;
  return entry.getData().toString("utf8");
}

/**
 * 解析 word/comments.xml
 * 提取每个批注的 id、author、date、initials、text
 */
function parseCommentsXml(xml, extendedMap, durableIds) {
  const comments = [];

  // 使用正则提取 <w:comment ...> ... </w:comment>
  // 匹配 comment 开始标签，提取属性
  const commentRegex =
    /<w:comment\s+w:id="(\d+)"\s+w:author="([^"]*)"\s+w:date="([^"]*)"\s+w:initials="([^"]*)"[^>]*>/g;

  // 先找到所有 comment 开始标签位置
  const commentStarts = [];
  let match;
  while ((match = commentRegex.exec(xml)) !== null) {
    commentStarts.push({
      index: match.index,
      id: match[1],
      author: unescapeXml(match[2]),
      date: match[3],
      initials: match[4],
    });
  }

  // 对每个 comment 提取文本内容
  for (let i = 0; i < commentStarts.length; i++) {
    const current = commentStarts[i];
    const next = commentStarts[i + 1];

    // 提取当前 comment 的完整 XML 片段
    const startIdx = current.index;
    const endIdx = next ? next.index : xml.length;
    const commentXml = xml.slice(startIdx, endIdx);

    // 提取 paraId
    const paraIdMatch = commentXml.match(/w14:paraId="([^"]+)"/);
    const paraId = paraIdMatch ? paraIdMatch[1] : null;

    // 提取批注文本（所有 <w:t> 元素的内容）
    const textMatches = commentXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    const textParts = [];
    for (const tm of textMatches) {
      if (tm[1]) textParts.push(tm[1]);
    }
    const text = unescapeXml(textParts.join(""));

    // 从 extendedMap 获取状态
    const extended = paraId ? extendedMap[paraId] : null;
    const resolved = extended ? extended.done : false;
    const parentId = extended ? extended.parentId : null;

    // 从 extensible 获取 durableId（按顺序对应）
    const durableId = i < durableIds.length ? durableIds[i] : null;

    comments.push({
      id: current.id,
      author: current.author,
      date: current.date,
      initials: current.initials,
      text,
      resolved,
      paraId,
      parentId,
      durableId,
    });
  }

  return comments;
}

/**
 * 解析 word/commentsExtended.xml
 * 返回 { paraId: { done: boolean, parentId: string|null } }
 */
function parseCommentsExtended(xml) {
  const map = {};
  if (!xml) return map;

  const regex =
    /<w15:commentEx\s+w15:paraId="([^"]+)"(?:\s+w15:paraIdParent="([^"]+)")?\s+w15:done="(\d)"/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    map[match[1]] = {
      done: match[3] === "1",
      parentId: match[2] || null,
    };
  }
  return map;
}

/**
 * 解析 word/commentsExtensible.xml
 * 返回 durableId 数组（按文档顺序）
 */
function parseCommentsExtensible(xml) {
  const ids = [];
  if (!xml) return ids;

  const regex = /<w16cex:commentExtensible\s+w16cex:durableId="([^"]+)"/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

/**
 * 反转义 XML 实体
 */
function unescapeXml(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * 获取指定 docx 文件的所有批注（便捷函数）
 *
 * @param {string} docxPath — docx 文件路径
 * @returns {object[]} 批注列表
 */
function getCommentsFromFile(docxPath) {
  if (!fs.existsSync(docxPath)) {
    throw new Error(`文件不存在: ${docxPath}`);
  }
  return extractComments(docxPath);
}

module.exports = {
  upload,
  generateFileKey,
  decodeFileName,
  downloadFile,
  downloadAndSaveFile,
  FILES_DIR,
  extractComments,
  getCommentsFromFile,
};
