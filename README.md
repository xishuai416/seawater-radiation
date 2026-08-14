# 海水辐射值监测平台

海水辐射值监测网页，支持双单位（μSv/h 和 CPM）数据录入与展示。数据存储在 GitHub Gist 中实现持久化。

## 功能特性

- 📊 **当前值显示**：实时显示最新测量的辐射值
- 📈 **初始值对比**：自动记录首次测量值作为基准
- 📉 **同比增长**：与初始值相比的变化率
- 📊 **环比增长**：与上一监测周期的变化率
- 📈 **变化趋势**：根据最近5次监测判断趋势
- 🔐 **密码保护**：数据录入页面需要登录验证
- ☁️ **云存储**：数据同步到 GitHub Gist

## 安全说明

### Token 存储方式
- ✅ 使用 **sessionStorage** 存储 Token（关闭浏览器自动清除）
- ✅ 不硬编码 Token 在代码中
- ⚠️ 密码仍使用 localStorage 备份（可选清除）

### 安全建议
1. 不要在公共电脑上保存登录状态
2. 定期更换 GitHub Token
3. 使用最小权限原则（仅需 gist 权限）

## 部署说明

### GitHub Pages 部署

1. 创建 GitHub 仓库
2. 推送代码到仓库
3. 在 Settings → Pages 启用 GitHub Pages
4. 访问 `https://用户名.github.io/仓库名`

### 本地测试

直接打开 `index.html` 文件即可预览。

## 使用说明

### 查看数据
- 访问主页即可看到最新监测数据
- 数据从 GitHub Gist 加载

### 录入数据
1. 点击右下角的"📝"按钮
2. 输入GitHub Token连接云端（推荐）或使用本地密码登录
3. 填写测量时间和辐射值
4. 提交数据后自动同步到GitHub

## 默认登录信息

- 用户名：`admin`
- 密码：`radiation2026`

## 数据持久化方案

### 存储架构
```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  用户浏览器  │────▶│  GitHub Pages    │────▶│ GitHub Gist │
│             │     │  (静态HTML/JS)   │     │ (云端存储)  │
└─────────────┘     └──────────────────┘     └─────────────┘
        │                                       │
        └───────────────────────────────────────┘
                      localStorage 备份
```

### Token 安全存储
```javascript
// 使用 sessionStorage（关闭浏览器自动清除）
sessionStorage.setItem('github_token', token);

// 不推荐：localStorage 会永久存储
// localStorage.setItem('github_token', token);
```

### 配置步骤

1. **创建GitHub Gist**
   - 访问 https://gist.github.com
   - 创建新Gist，包含 `history.json` 文件
   - 复制Gist ID（URL中的一串字符）

2. **生成Personal Access Token**
   - GitHub → Settings → Developer settings → Personal access tokens
   - 勾选 `gist` 权限
   - 复制生成的Token

3. **修改配置文件**
   编辑 `js/api.js`：
   ```javascript
   const CONFIG = {
     GIST_ID: '你的Gist-ID',
     OWNER: '你的GitHub用户名',
     REPO: 'seawater-radiation'
   };
   ```

4. **登录时输入Token**
   - 在录入页面输入GitHub Token
   - 系统会自动验证并保存到 sessionStorage

## 目录结构

```
seawater-radiation/
├── index.html          # 主页（数据展示）
├── admin.html          # 录入页面（需登录）
├── test.html           # 测试数据生成
├── api/                # API 代理目录
│   ├── README.md
│   └── index.html
├── .github/
│   └── workflows/
│       └── api.yml     # GitHub Actions workflow
├── css/
│   └── style.css       # 样式文件
├── js/
│   ├── api.js          # GitHub API层
│   ├── app.js          # 主页逻辑
│   └── admin.js        # 录入页逻辑
├── .gitignore
└── README.md
```

## 数据格式

```json
{
  "records": [
    {
      "id": 1723591320000,
      "time": "2026-08-14T08:00:00.000Z",
      "valueUsv": 0.125,
      "valueCpm": 45.50
    }
  ],
  "metadata": {
    "created": "2026-08-14",
    "lastUpdated": "2026-08-14T08:00:00Z"
  }
}
```

## 技术栈

- 纯前端：HTML5 + CSS3 + JavaScript
- 图表：Chart.js
- 存储：GitHub Gist API + sessionStorage + localStorage 备份
- 部署：GitHub Pages

## 安全最佳实践

1. **Token 管理**
   - 使用 sessionStorage 而非 localStorage
   - 关闭浏览器后 Token 自动清除
   - 定期更换 Token

2. **密码安全**
   - 不在代码中硬编码密码
   - 使用强密码
   - 考虑使用多因素认证

3. **数据备份**
   - 本地 localStorage 作为备份
   - 定期导出数据备份
   - 监控数据完整性
