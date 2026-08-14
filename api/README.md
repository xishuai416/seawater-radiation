# 海水辐射值监测 - API 代理

这个目录用于 GitHub Actions API 代理。

## 说明

由于 GitHub Pages 是纯静态托管，我们无法直接使用后端 API。
解决方案是使用 GitHub Actions 作为 API 代理。

## 工作流程

1. 前端调用 `api/proxy.js`
2. 触发 GitHub Actions workflow
3. Actions 读取/写入 GitHub Gist
4. 返回结果给前端

## 配置

在 GitHub 仓库中设置以下 Secrets：
- `GIST_TOKEN`: 你的 GitHub Personal Access Token（需要 gist 权限）
- `GIST_ID`: 你的 Gist ID

## API 端点

### GET /api/data
获取所有监测数据

### POST /api/data
保存新数据记录

请求体：
```json
{
  "time": "2026-08-14T08:00:00.000Z",
  "valueUsv": 0.125,
  "valueCpm": 45.50
}
```
