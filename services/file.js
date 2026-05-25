const path = require("path");
const fs = require("fs");
const {
  getDb,
  insertFile,
  findById,
  getMaxVersionByOriginFileKey,
  findFilesPaginated,
  deleteById,
} = require("../db");
const {
  upload,
  generateFileKey,
  decodeFileName,
  FILES_DIR,
} = require("../utils/file");
const { app } = require("../http");
const { forceSave } = require("../utils/onlyoffice");

app.post("/files/upload", upload.single("file"), async (req, res) => {
  try {
    await getDb();

    if (!req.file) {
      return res.status(400).json({ error: "请上传文件" });
    }

    const originalname = decodeFileName(req.file.originalname);

    const fileKey = path.basename(
      req.file.filename,
      path.extname(req.file.filename),
    );
    const version = "v1";

    const id = insertFile(
      originalname,
      version,
      fileKey,
      fileKey,
      req.file.path,
    );

    res.json({
      code: 0,
      data: {
        id,
        fileName: originalname,
        version,
        fileKey,
      },
      message: "上传成功",
    });
  } catch (err) {
    console.error("上传失败:", err);
    res.status(500).json({ error: "上传失败", detail: err.message });
  }
});

app.post("/files/copy", async (req, res) => {
  try {
    await getDb();

    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "缺少 id 参数" });
    }

    const record = findById(id);
    if (!record) {
      return res.status(404).json({ error: "文件记录不存在" });
    }

    await forceSave(record.fileKey);

    const ext = path.extname(record.path);
    const newFileKey = generateFileKey(record.fileName);

    const maxVer = getMaxVersionByOriginFileKey(record.originFileKey);
    const newVersion = maxVer != null ? `v${maxVer + 1}` : "v1";

    const destPath = path.join(FILES_DIR, `${newFileKey}${ext}`);
    fs.copyFileSync(record.path, destPath);

    const newId = insertFile(
      record.fileName,
      newVersion,
      newFileKey,
      record.originFileKey,
      destPath,
    );

    res.json({
      code: 0,
      data: {
        id: newId,
        fileName: record.fileName,
        version: newVersion,
        fileKey: newFileKey,
        originFileKey: record.originFileKey,
      },
      message: "复制成功",
    });
  } catch (err) {
    console.error("复制失败:", err);
    res.status(500).json({ error: "复制失败", detail: err.message });
  }
});

app.get("/files/download/:id", async (req, res) => {
  try {
    await getDb();

    const id = parseInt(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "缺少 id 参数" });
    }

    const record = findById(id);
    if (!record) {
      return res.status(404).json({ error: "文件记录不存在" });
    }

    if (!fs.existsSync(record.path)) {
      return res.status(404).json({ error: "文件不存在" });
    }

    res.download(record.path, record.fileName, {
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });
  } catch (err) {
    console.error("下载失败:", err);
    res.status(500).json({ error: "下载失败", detail: err.message });
  }
});

app.get("/files", async (req, res) => {
  try {
    await getDb();

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(req.query.pageSize) || 10),
    );
    const searchKey = req.query.searchKey || "";

    const {
      list,
      total,
      page: curPage,
      pageSize: curSize,
    } = findFilesPaginated(page, pageSize, searchKey);

    res.json({
      code: 0,
      data: {
        list,
        total,
        page: curPage,
        pageSize: curSize,
        totalPages: Math.ceil(total / curSize),
      },
      message: "查询成功",
    });
  } catch (err) {
    console.error("查询失败:", err);
    res.status(500).json({ error: "查询失败", detail: err.message });
  }
});

app.get("/files/:id", async (req, res) => {
  try {
    await getDb();

    const id = parseInt(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "缺少 id 参数" });
    }

    const record = findById(id);
    if (!record) {
      return res.status(404).json({ error: "文件记录不存在" });
    }

    if (!fs.existsSync(record.path)) {
      return res.status(404).json({ error: "文件不存在" });
    }

    res.json({
      code: 0,
      data: record,
      message: "获取文件成功",
    });
  } catch (err) {
    console.error("获取文件失败:", err);
    res.status(500).json({ error: "获取文件失败", detail: err.message });
  }
});

app.delete("/files/:id", async (req, res) => {
  try {
    await getDb();

    const id = parseInt(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "缺少 id 参数" });
    }

    const record = findById(id);
    if (!record) {
      return res.status(404).json({ error: "文件记录不存在" });
    }

    const filePath = record.path;
    deleteById(id);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      code: 0,
      message: "删除成功",
    });
  } catch (err) {
    console.error("删除失败:", err);
    res.status(500).json({ error: "删除失败", detail: err.message });
  }
});
