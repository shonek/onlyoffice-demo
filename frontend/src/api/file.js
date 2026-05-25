import axios from "axios";

const http = axios.create({
  baseURL: "/",
  timeout: 10000,
});

export function getFileList(params) {
  return http.get("/files", { params });
}

export function copyFile(id) {
  return http.post("/files/copy", { id });
}

export function uploadFile(formData) {
  return http.post("/files/upload", formData);
}

export function deleteFile(id) {
  return http.delete(`/files/${id}`);
}
