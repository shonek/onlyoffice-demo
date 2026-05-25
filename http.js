const express = require("express");
const cors = require("cors");
const app = express();

app.disable("etag");
app.use(cors());

app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.use(express.json({ limit: "50mb" }));

app.use(express.static("frontend/dist"));

module.exports = { app };
