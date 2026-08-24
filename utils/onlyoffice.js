const ONLYOFFICE_URL = "http://172.22.8.199:8080";
const { sign } = require("./jwt");
const { ONLY_OFFICE_SECRET } = require("./config");

const FORCE_SAVE_ERROR = {
  0: "No errors.",
  1: "Document key is missing or no document with such key could be found.",
  2: "Callback url not correct.",
  3: "Internal server error.",
  4: "No changes were applied to the document before the forcesave command was received.",
  5: "Command not correct.",
  6: "Invalid token.",
};
async function forceSave(fileKey) {
  const http = require("http");
  const Buffer = require("buffer").Buffer;

  return new Promise((resolve, reject) => {
    const payload = { c: "forcesave", key: fileKey };
    // 开启 JWT 后，命令载荷需带 token，否则被 Document Server 以错误码 6 拒绝
    if (ONLY_OFFICE_SECRET) {
      payload.token = sign(payload, ONLY_OFFICE_SECRET);
    }
    const postData = JSON.stringify(payload);
    const req = http.request(
      ONLYOFFICE_URL + "/command",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk.toString();
        });
        res.on("end", () => {
          const obj = JSON.parse(data);
          if (obj.error === 0 || obj.error === 4) {
            resolve();
          } else {
            reject(FORCE_SAVE_ERROR[obj.error]);
          }
        });
      },
    );
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

module.exports = {
  forceSave,
};
