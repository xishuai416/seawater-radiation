/**
 * 海水辐射值监测平台 - GitHub API 层
 * 封装所有与 GitHub Gist 的交互逻辑
 */

// API 配置（从 config.js 导入）
// 注意：由于是纯前端项目，直接使用全局 CONFIG 对象

/**
 * 从 sessionStorage 获取 token
 * @returns {string} GitHub Token
 */
function getAuthToken() {
  return sessionStorage.getItem('github_token') || '';
}

/**
 * 保存 token 到 sessionStorage
 * @param {string} token - GitHub Token
 */
function saveAuthToken(token) {
  if (token) {
    sessionStorage.setItem('github_token', token);
  }
}

/**
 * 清除 token
 */
function clearAuthToken() {
  sessionStorage.removeItem('github_token');
}

/**
 * 验证 token 是否有效
 * @param {string} token - GitHub Token
 * @returns {Promise<boolean>} 是否有效
 */
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
    console.warn('Token 验证失败:', e);
    return false;
  }
}

/**
 * 获取数据（未登录用户有限尝试 REST API，触发 Rate Limit 时自动降级到 Raw Gist / CDN，确保不受 60次/小时 限制；登录用户使用 Token 读取）
 * @returns {Promise<Array>} 记录数组
 */
async function loadData() {
  const token = getAuthToken();
  
  // 1. 如果有 Token，优先通过 GitHub REST API 获取最新版本
  if (token) {
    try {
      const res = await fetch(`${CONFIG.API_BASE}/gists/${CONFIG.GIST_ID}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files['history.json']) {
          const parsed = JSON.parse(data.files['history.json'].content);
          setStorageItem(CONFIG.STORAGE_KEY, parsed.records || []);
          return parsed.records || [];
        }
      }
    } catch (e) {
      console.warn('使用 Token 从 Gist API 获取失败:', e);
    }
  }

  // 2. 未登录用户或 API 失败时，尝试 GitHub REST API（未认证）
  if (!token) {
    try {
      const res = await fetch(`${CONFIG.API_BASE}/gists/${CONFIG.GIST_ID}`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files['history.json']) {
          const parsed = JSON.parse(data.files['history.json'].content);
          setStorageItem(CONFIG.STORAGE_KEY, parsed.records || []);
          return parsed.records || [];
        }
      } else {
        console.warn(`Gist API 返回 ${res.status}（可能已触发 Rate Limit）`);
      }
    } catch (e) {
      console.warn('Gist REST API 请求异常:', e);
    }
  }

  // 3. 降级方案：从 Raw URL 获取数据（不占 REST API Rate Limit 额度，支持高并发/免登录访问）
  try {
    // 增加时间戳防强缓存
    const rawUrl = `${CONFIG.GIST_RAW_URL}?_t=${Date.now()}`;
    const rawRes = await fetch(rawUrl);
    if (rawRes.ok) {
      const parsed = await rawRes.json();
      setStorageItem(CONFIG.STORAGE_KEY, parsed.records || []);
      return parsed.records || [];
    }
  } catch (e) {
    console.warn('从 Raw Gist 获取失败，回退到本地缓存:', e);
  }
  
  // 4. 最终回退到 localStorage 缓存
  return getStorageItem(CONFIG.STORAGE_KEY, []);
}

/**
 * 保存数据（优先到 GitHub，回退到 localStorage）
 * @param {Object} record - 新记录
 * @returns {Promise<boolean>} 是否成功
 */
async function saveData(record) {
  // 验证并清理数据
  const validRecord = validateRecord(record);
  if (!validRecord) {
    throw new Error('数据验证失败');
  }
  
  const token = getAuthToken();
  
  // 获取现有数据
  let history = await loadData();
  
  // 添加新记录
  history.unshift(validRecord);
  
  // 只保留最近 N 条
  if (history.length > CONFIG.MAX_RECORDS) {
    history = history.slice(0, CONFIG.MAX_RECORDS);
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
      const res = await fetch(`${CONFIG.API_BASE}/gists/${CONFIG.GIST_ID}`, {
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
  setStorageItem(CONFIG.STORAGE_KEY, history);
  return true;
}

/**
 * 清除所有数据
 * @returns {Promise<boolean>} 是否成功
 */
async function clearAllData() {
  const token = getAuthToken();
  
  // 清除 localStorage
  removeStorageItem(CONFIG.STORAGE_KEY);
  
  // 尝试清除 GitHub Gist
  if (token) {
    try {
      const res = await fetch(`${CONFIG.API_BASE}/gists/${CONFIG.GIST_ID}`, {
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
              content: JSON.stringify({ records: [], metadata: { updated: new Date().toISOString() } })
            }
          }
        })
      });
      return res.ok;
    } catch (e) {
      console.warn('清除 GitHub 数据失败:', e);
      return false;
    }
  }
  
  return true;
}

/**
 * 导出所有数据为 JSON 字符串
 * @returns {Promise<string>} JSON 字符串
 */
async function exportData() {
  const data = await loadData();
  return JSON.stringify(data, null, 2);
}

/**
 * 导入数据
 * @param {string} jsonData - JSON 字符串
 * @returns {Promise<boolean>} 是否成功
 */
async function importData(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    if (Array.isArray(data)) {
      // 验证并清理数据
      const validRecords = data
        .map(item => validateRecord(item))
        .filter(item => item !== null);
      
      setStorageItem(CONFIG.STORAGE_KEY, validRecords);
      
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
      
      return validRecords.length > 0;
    }
  } catch (e) {
    console.error('导入数据失败:', e);
  }
  return false;
}

/**
 * 检查 GitHub 连接状态
 * @returns {Promise<Object>} 连接状态信息
 */
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

// 导出 API 对象（供页面使用）
const RadiationAPI = {
  loadData,
  saveData,
  clearAllData,
  exportData,
  importData,
  validateToken,
  checkGitHubConnection,
  getAuthToken,
  saveAuthToken,
  clearAuthToken
};
