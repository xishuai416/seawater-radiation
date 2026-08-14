// API 代理 - 使用 GitHub Actions 作为后端
// 注意：由于 GitHub Pages 是纯静态托管，我们采用混合方案

const CONFIG = {
  GIST_ID: 'ada469ec18bdbbebf32b356ee3e4564e',
  OWNER: 'xishuai416',
  REPO: 'seawater-radiation',
  API_BASE: 'https://api.github.com'
};

// 从 sessionStorage 获取 token（仅使用 sessionStorage，更安全）
function getAuthToken() {
  return sessionStorage.getItem('github_token') || '';
}

// 保存 token（仅使用 sessionStorage，关闭标签页自动清除）
function saveAuthToken(token) {
  if (token) {
    sessionStorage.setItem('github_token', token);
    // 不再保存到 localStorage，确保 Token 不会长期存储
  }
}

// 清除 token
function clearAuthToken() {
  sessionStorage.removeItem('github_token');
}

// 验证 token 是否有效
async function validateToken(token) {
  try {
    const res = await fetch(`${CONFIG.API_BASE}/user`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/json'
      }
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

// 获取数据（优先从 Gist，回退到 localStorage）
async function loadData() {
  const token = getAuthToken();
  
  // 如果有 token，尝试从 GitHub 获取
  if (token) {
    try {
      const res = await fetch(`https://gist.github.com/api/v1/gists/${CONFIG.GIST_ID}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files['history.json']) {
          const parsed = JSON.parse(data.files['history.json'].content);
          // 同步到 localStorage（仅数据，不含 Token）
          localStorage.setItem('seawater_radiation_data', JSON.stringify(parsed.records || []));
          return parsed.records || [];
        }
      }
    } catch (e) {
      console.warn('从 Gist 获取失败:', e);
    }
  }
  
  // 回退到 localStorage
  const localData = localStorage.getItem('seawater_radiation_data');
  return localData ? JSON.parse(localData) : [];
}

// 保存数据（优先到 GitHub，回退到 localStorage）
async function saveData(record) {
  const token = getAuthToken();
  
  // 获取现有数据
  let history = await loadData();
  
  // 添加新记录
  history.unshift(record);
  
  // 只保留最近100条
  if (history.length > 100) {
    history = history.slice(0, 100);
  }
  
  const newData = {
    records: history,
    metadata: {
      updated: new Date().toISOString()
    }
  };
  
  // 尝试保存到 GitHub Gist
  if (token) {
    try {
      const res = await fetch(`https://api.github.com/gists/${CONFIG.GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: '海水辐射值监测数据',
          files: {
            'history.json': {
              content: JSON.stringify(newData)
            }
          }
        })
      });
      
      if (res.ok) {
        return true;
      }
    } catch (e) {
      console.warn('保存到 Gist 失败:', e);
    }
  }
  
  // 回退到 localStorage
  localStorage.setItem('seawater_radiation_data', JSON.stringify(history));
  return true;
}

// 导出所有数据
async function exportData() {
  const data = await loadData();
  return JSON.stringify(data, null, 2);
}

// 导入数据
async function importData(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    if (Array.isArray(data)) {
      localStorage.setItem('seawater_radiation_data', JSON.stringify(data));
      
      // 尝试同步到 GitHub
      const token = getAuthToken();
      if (token) {
        await saveData({
          id: Date.now(),
          time: new Date().toISOString(),
          valueUsv: null,
          valueCpm: null,
          imported: true
        });
      }
      
      return true;
    }
  } catch (e) {
    console.error('导入数据失败:', e);
  }
  return false;
}

// 检查 GitHub 连接状态
async function checkGitHubConnection() {
  const token = getAuthToken();
  if (!token) return { connected: false, message: '未登录' };
  
  const isValid = await validateToken(token);
  if (isValid) {
    return { connected: true, message: '已连接GitHub' };
  } else {
    return { connected: false, message: 'Token 无效' };
  }
}

// 简化的 API（供前端使用）
const RadiationAPI = {
  loadData,
  saveData,
  exportData,
  importData,
  validateToken,
  checkGitHubConnection,
  getAuthToken,
  saveAuthToken,
  clearAuthToken
};
