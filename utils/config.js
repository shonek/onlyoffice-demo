// OnlyOffice 共享密钥，从环境变量 ONLY_OFFICE_KEY 读取
// 与 Document Server local.json 中的 secret.key 保持一致
const ONLY_OFFICE_SECRET = process.env.ONLY_OFFICE_KEY || "";

module.exports = { ONLY_OFFICE_SECRET };
