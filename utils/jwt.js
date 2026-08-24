// OnlyOffice JWT 签发 / 校验（HS256，载荷即 config 对象，无 iat/exp）
const crypto = require("crypto");

const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
  "base64url",
);

function sign(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const data = `${header}.${body}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verify(token, secret) {
  const [h, p, s] = (token || "").split(".");
  if (!h || !p || !s) throw new Error("Invalid token format");
  const data = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  if (sig !== s) throw new Error("Invalid signature");
  return JSON.parse(Buffer.from(p, "base64url").toString());
}

module.exports = { sign, verify };
