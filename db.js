const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "./data/data.db");
let db = null;

// 运行时计算服务器时区偏移，生成 ISO 8601 格式的时间字符串
function getTimezoneOffset() {
  const offset = new Date().getTimezoneOffset(); // 分钟，UTC-本地，东八区为 -480
  const totalMinutes = -offset;
  const hours = Math.floor(Math.abs(totalMinutes) / 60);
  const minutes = Math.abs(totalMinutes) % 60;
  const sign = totalMinutes >= 0 ? "+" : "-";
  return {
    sign,
    hours,
    minutes,
    offsetStr: `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    adjustHours: totalMinutes / 60, // 用于 SQLite 的 '+N hours' 偏移
  };
}

const tz = getTimezoneOffset();

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fileName TEXT NOT NULL,
      version TEXT,
      fileKey TEXT NOT NULL,
      originFileKey TEXT NOT NULL,
      path TEXT NOT NULL,
      createTime DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%S${tz.offsetStr}', 'now', '${tz.adjustHours} hours')),
      updateTime DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%S${tz.offsetStr}', 'now', '${tz.adjustHours} hours'))
    )
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_files_time
    AFTER UPDATE ON files
    FOR EACH ROW
    BEGIN
      UPDATE files SET updateTime = strftime('%Y-%m-%dT%H:%M:%S${tz.offsetStr}', 'now', '${tz.adjustHours} hours') WHERE id = OLD.id;
    END
  `);

  saveDb();
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function insertFile(fileName, version, fileKey, originFileKey, filePath) {
  db.run(
    "INSERT INTO files (fileName, version, fileKey, originFileKey, path) VALUES (?, ?, ?, ?, ?)",
    [fileName, version, fileKey, originFileKey, filePath],
  );

  const result = db.exec("SELECT last_insert_rowid() as id");
  const id = result[0].values[0][0];

  saveDb();
  return id;
}

function findById(id) {
  const stmt = db.prepare("SELECT * FROM files WHERE id = ?");
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function findByFileKey(fileKey) {
  const stmt = db.prepare("SELECT * FROM files WHERE fileKey = ?");
  stmt.bind([fileKey]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function getMaxVersionByOriginFileKey(originFileKey) {
  const stmt = db.prepare(
    "SELECT MAX(CAST(SUBSTR(version, 2) AS INTEGER)) as maxVer FROM files WHERE originFileKey = ?",
  );
  stmt.bind([originFileKey]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row.maxVer;
  }
  stmt.free();
  return null;
}

function findFilesPaginated(page = 1, pageSize = 10, searchKey = "") {
  const offset = (page - 1) * pageSize;
  const hasSearch = searchKey && searchKey.trim() !== "";

  let totalSql = "SELECT COUNT(*) as total FROM files";
  let listSql = "SELECT * FROM files";
  let totalParams = [];
  let listParams = [];

  if (hasSearch) {
    totalSql += " WHERE fileName LIKE ?";
    listSql += " WHERE fileName LIKE ?";
    const likePattern = `%${searchKey}%`;
    totalParams = [likePattern];
    listParams = [likePattern];
  }

  listSql += " ORDER BY id DESC LIMIT ? OFFSET ?";
  listParams.push(pageSize, offset);

  const totalResult = db.exec(totalSql, totalParams);
  const total = totalResult[0].values[0][0];

  const listResult = db.exec(listSql, listParams);
  if (!listResult.length) {
    return { list: [], total, page, pageSize };
  }

  const { columns, values } = listResult[0];
  const list = values.map((row) => {
    const item = {};
    columns.forEach((col, i) => {
      item[col] = row[i];
    });
    return item;
  });

  return { list, total, page, pageSize };
}

function updateFile(id, fileName, version, fileKey, originFileKey, filePath) {
  db.run(
    "UPDATE files SET fileName = ?, version = ?, fileKey = ?, originFileKey = ?, path = ? WHERE id = ?",
    [fileName, version, fileKey, originFileKey, filePath, id],
  );
  saveDb();
}

function deleteById(id) {
  db.run("DELETE FROM files WHERE id = ?", [id]);
  saveDb();
}

module.exports = {
  getDb,
  saveDb,
  insertFile,
  findById,
  getMaxVersionByOriginFileKey,
  findFilesPaginated,
  updateFile,
  findByFileKey,
  deleteById,
};
