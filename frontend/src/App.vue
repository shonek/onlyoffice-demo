<template>
  <div class="app-container">
    <div class="search-bar">
      <el-input
        v-model="searchKey"
        placeholder="请输入文件名进行搜索"
        clearable
        style="width: 300px"
        @keyup.enter="handleSearch"
      />
      <el-button type="primary" @click="handleSearch" style="margin-left: 12px">
        查询
      </el-button>
      <el-upload
        v-model:file-list="fileList"
        :limit="1"
        :on-exceed="handleExceed"
        :show-file-list="false"
        :http-request="handleUpload"
        :accept="'.docx,.doc'"
      >
        <el-button type="primary" style="margin-left: 12px">
          上传文件
        </el-button>
      </el-upload>
      <el-button style="margin-left: 12px" @click="handleReset">重置</el-button>
    </div>

    <el-table
      :data="tableData"
      v-loading="loading"
      border
      stripe
      style="margin-top: 16px"
    >
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column
        prop="fileName"
        label="文件名"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column prop="version" label="版本" width="120" />
      <el-table-column prop="createTime" label="创建时间" width="180" />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" link @click="handleEdit(row)">
            编辑
          </el-button>
          <el-button type="primary" size="small" link @click="handleCopy(row)">
            生成新版本
          </el-button>
          <el-button
            type="primary"
            size="small"
            link
            @click="handleDownload(row)"
          >
            下载
          </el-button>
          <el-button
            type="primary"
            size="small"
            link
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-bar">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSearch"
        @current-change="handleSearch"
      />
    </div>

    <el-dialog v-model="editDialogVisible" title="编辑" width="400px">
      <el-form
        label-width="80px"
        :model="editForm"
        ref="editFormRef"
        :rules="rules"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="editForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="权限" prop="permission">
          <el-radio-group v-model="editForm.permission">
            <el-radio value="edit">编辑</el-radio>
            <el-radio value="comment">评论</el-radio>
            <el-radio value="view">查看</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="语言" prop="lang">
          <el-radio-group v-model="editForm.lang">
            <el-radio value="zh">中文</el-radio>
            <el-radio value="en">英文</el-radio>
            <el-radio value="ja">日文</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleEditConfirm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { ElMessage, genFileId } from "element-plus";
import { getFileList, copyFile, uploadFile, deleteFile } from "./api/file.js";

const searchKey = ref("");
const tableData = ref([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const upload = ref();

const editDialogVisible = ref(false);
const editForm = ref({
  id: "",
  username: "",
  permission: "edit",
  lang: "zh",
});

const rules = ref({
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  permission: [{ required: true, message: "请选择权限", trigger: "change" }],
  lang: [{ required: true, message: "请选择语言", trigger: "change" }],
});

const editFormRef = ref(null);

const handleExceed = (files) => {
  upload.value.clearFiles();
  const file = files[0];
  file.uid = genFileId();
  upload.value.handleStart(file);
};

function fetchData() {
  loading.value = true;
  getFileList({
    page: page.value,
    pageSize: pageSize.value,
    searchKey: searchKey.value,
  })
    .then((res) => {
      if (res.data.code === 0) {
        const data = res.data.data;
        tableData.value = data.list;
        total.value = data.total;
        page.value = data.page;
        pageSize.value = data.pageSize;
      }
    })
    .catch(() => {
      ElMessage.error("查询失败，请稍后重试");
    })
    .finally(() => {
      loading.value = false;
    });
}

function handleSearch() {
  page.value = 1;
  fetchData();
}

function handleReset() {
  searchKey.value = "";
  page.value = 1;
  fetchData();
}

function handleUpload(option) {
  const formData = new FormData();
  formData.append("file", option.file);
  uploadFile(formData).then(() => {
    fetchData();
  });
}

function handleEdit(row) {
  editForm.value = {
    id: row.id,
    username: "",
    permission: "edit",
    lang: "zh",
  };
  editDialogVisible.value = true;
}

function handleEditConfirm() {
  editFormRef.value.validate().then(() => {
    editDialogVisible.value = false;
    const { id, username, permission, lang } = editForm.value;
    window.open(
      `/editor.html?id=${encodeURIComponent(id)}&username=${encodeURIComponent(username)}&permission=${encodeURIComponent(permission)}&lang=${encodeURIComponent(lang)}`,
    );
  });
}

function handleCopy(row) {
  copyFile(row.id)
    .then((res) => {
      if (res.data.code === 0) {
        ElMessage.success(res.data.message || "生成新版本成功");
        fetchData();
      }
    })
    .catch(() => {
      ElMessage.error("生成新版本失败，请稍后重试");
    });
}

function handleDownload(row) {
  window.open(`/files/download/${row.id}`);
}

function handleDelete(row) {
  deleteFile(row.id)
    .then((res) => {
      if (res.data.code === 0) {
        ElMessage.success(res.data.message || "删除成功");
        fetchData();
      }
    })
    .catch(() => {
      ElMessage.error("删除失败，请稍后重试");
    });
}

onMounted(() => {
  fetchData();
});
</script>

<style>
body {
  margin: 0;
  background: #f5f7fa;
}
.app-container {
  max-width: 1200px;
  margin: 24px auto;
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
.search-bar {
  display: flex;
  align-items: center;
}
.pagination-bar {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
