const ONLYOFFICE_URL = "http://172.22.8.36:8080";

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
    const postData = JSON.stringify({ c: "forcesave", key: fileKey });
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
