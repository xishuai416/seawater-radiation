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
2. 输入GitHub Token连接云端，或使用本地密码登录
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
     GIST_ID: '你的Gist-ID',  // 替换为你的Gist ID
     OWNER: '你的GitHub用户名',
     REPO: 'seawater-radiation'
   };
   ```

4. **登录时输入Token**
   - 在录入页面输入GitHub Token
   - 系统会自动验证并保存

## 目录结构

```
seawater-radiation/
├── index.html          # 主页（数据展示）
├── admin.html          # 录入页面（需登录）
├── test.html           # 测试数据生成
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
- 存储：GitHub Gist API + localStorage 备份
- 部署：GitHub Pages
