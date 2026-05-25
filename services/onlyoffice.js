// ONLYOFFICE 回调接口
const { app } = require("../http");
const { downloadAndSaveFile } = require("../utils/file");
const { findByFileKey, updateFile } = require("../db");

async function updateFileInfo(url, fileKey, res) {
  try {
    if (!fileKey) {
      return res.status(400).json({ error: "缺少 fileKey 参数" });
    }
    const file = await findByFileKey(fileKey);
    if (!file) {
      return res.status(404).json({ error: "缺少 fileKey 参数" });
    }
    await downloadAndSaveFile(url, file.path);
    // 更新文件信息
    await updateFile(
      file.id,
      file.fileName,
      file.version,
      fileKey,
      file.originFileKey,
      file.path,
    );
  } catch (err) {
    console.error(`更新文件信息失败:`, err);
    // 返回错误码让 ONLYOFFICE 重试
    res.status(500).json({ error: 1 });
  }
}

app.post("/onlyoffice/callback", async (req, res) => {
  const { status, url, key, users, actions, changesurl, history } = req.body;

  console.log(`[回调] 文档 ${key} 状态: ${status}`);

  try {
    switch (status) {
      case 1:
        // 用户连接/断开连接（协同编辑时触发）
        console.log(`用户状态变更: ${JSON.stringify(actions)}`);
        break;

      case 2:
        // 文档已保存（所有用户关闭编辑器后触发）
        console.log(`文档已保存，下载地址: ${url}`);
        // 从 url 下载最新文件并覆盖存储
        await updateFileInfo(url, key, res);
        break;

      case 3:
        // 文档保存出错
        console.error(`文档 ${key} 保存失败`);
        break;

      case 4:
        // 文档关闭，无更改
        console.log(`文档 ${key} 已关闭，无更改`);
        break;

      case 6:
        // 强制保存（forcesave 触发）
        console.log(`强制保存，下载地址: ${url}`);
        await updateFileInfo(url, key, res);
        break;

      case 7:
        // 强制保存出错
        console.error(`文档 ${key} 强制保存失败`);
        break;
    }

    // 必须返回 {"error": 0}
    res.json({ error: 0 });
  } catch (err) {
    console.error(`回调处理失败:`, err);
    // 返回错误码让 ONLYOFFICE 重试
    res.status(500).json({ error: 1 });
  }
});
