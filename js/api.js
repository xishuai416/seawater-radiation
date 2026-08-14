// GitHub API 配置
const CONFIG = {
  GIST_ID: 'ada469ec18bdbbebf32b356ee3e4564e',  // Gist ID
  OWNER: 'xishuai416',   // GitHub用户名
  REPO: 'seawater-radiation'     // 仓库名称
};

// 后端API地址（使用GitHub Actions）
const API_URL = 'https://api.github.com/repos';

// 从localStorage获取token（第一次登录后保存）
function getAuthToken() {
  return localStorage.getItem('github_token') || '';
}

function saveAuthToken(token) {
  if (token) {
    localStorage.setItem('github_token', token);
  }
}

function clearAuthToken() {
  localStorage.removeItem('github_token');
}

// 检查token是否有效
async function validateToken(token) {
  try {
    const res = await fetch('https://api.github.com/user', {
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

// 获取数据（从GitHub API）
async function loadData() {
  const token = getAuthToken();
  
  // 如果没有token，尝试从Gist获取
  if (!token || token === 'your-github-token-here') {
    return tryLoadFromGist();
  }
  
  try {
    // 尝试从仓库文件获取
    const res = await fetch(`${API_URL}/${CONFIG.OWNER}/${CONFIG.REPO}/contents/data/history.json`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (res.ok) {
      const data = await res.json();
      const content = atob(data.content);
      return JSON.parse(content).records || [];
    }
  } catch (e) {
    console.warn('从仓库读取失败，尝试从Gist读取:', e);
  }
  
  // 回退到Gist
  return tryLoadFromGist();
}

// 从Gist获取数据
async function tryLoadFromGist() {
  try {
    const res = await fetch(`https://gist.github.com/api/v1/gists/${CONFIG.GIST_ID}`);
    if (res.ok) {
      const data = await res.json();
      if (data.files && data.files['history.json']) {
        return JSON.parse(data.files['history.json'].content).records || [];
      }
    }
  } catch (e) {
    console.warn('从Gist读取失败:', e);
  }
  return [];
}

// 保存数据（到GitHub）
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
  
  // 尝试保存到仓库
  if (token && token !== 'your-github-token-here') {
    try {
      await saveToRepo(token, newData);
      return true;
    } catch (e) {
      console.warn('保存到仓库失败，尝试保存到Gist:', e);
    }
  }
  
  // 回退到Gist
  return await saveToGist(newData);
}

// 保存到GitHub仓库
async function saveToRepo(token, data) {
  const content = btoa(JSON.stringify(data));
  
  // 先获取当前SHA
  const getRes = await fetch(
    `${API_URL}/${CONFIG.OWNER}/${CONFIG.REPO}/contents/data/history.json`,
    {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );
  
  let sha = '';
  if (getRes.ok) {
    const get = await getRes.json();
    sha = get.sha;
  }
  
  // 上传新文件
  const res = await fetch(
    `${API_URL}/${CONFIG.OWNER}/${CONFIG.REPO}/contents/data/history.json`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Update radiation data: ${new Date().toLocaleString('zh-CN')}`,
        content: content,
        sha: sha
      })
    }
  );
  
  if (!res.ok) {
    throw new Error(`保存失败: ${res.status}`);
  }
  return await res.json();
}

// 保存到Gist
async function saveToGist(data) {
  const token = getAuthToken();
  
  if (!token || token === 'your-github-token-here') {
    // 没有token，保存到localStorage作为备份
    localStorage.setItem('seawater_radiation_data', JSON.stringify(data.records));
    return true;
  }
  
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
            content: JSON.stringify(data)
          }
        }
      })
    });
    
    if (!res.ok) {
      throw new Error(`Gist保存失败: ${res.status}`);
    }
    return true;
  } catch (e) {
    console.error('保存到Gist失败，回退到localStorage:', e);
    // 回退到localStorage
    localStorage.setItem('seawater_radiation_data', JSON.stringify(data.records));
    return true;
  }
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
      return true;
    }
  } catch (e) {
    console.error('导入数据失败:', e);
  }
  return false;
}
