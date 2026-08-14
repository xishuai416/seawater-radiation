/**
 * 海水辐射值监测平台 - GitHub API 层
 * 封装所有与 GitHub Gist 的交互逻辑
 */

/**
 * 获取 Token（优先 sessionStorage，其次 localStorage，实现本地记住 Token 功能）
 * @returns {string} GitHub Token
 */
function getAuthToken() {
  return sessionStorage.getItem(CONFIG.TOKEN_STORAGE_KEY) || localStorage.getItem(CONFIG.TOKEN_STORAGE_KEY) || '';
}

/**
 * 保存 token（同时保存到 sessionStorage 和 localStorage 实现持久化和自动填充）
 * @param {string} token - GitHub Token
 */
function saveAuthToken(token) {
  if (token) {
    sessionStorage.setItem(CONFIG.TOKEN_STORAGE_KEY, token);
    localStorage.setItem(CONFIG.TOKEN_STORAGE_KEY, token);
  }
}

/**
 * 清除 token
 */
function clearAuthToken() {
  sessionStorage.removeItem(CONFIG.TOKEN_STORAGE_KEY);
  localStorage.removeItem(CONFIG.TOKEN_STORAGE_KEY);
}

/**
 * 带加速重试的通用 fetch 封装
 * @param {string} url - 原始请求地址
 * @param {Object} options - fetch 选项
 * @returns {Promise<Response>} Response 对象
 */
async function fetchWithRetry(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (res.ok) return res;
    // 如果返回 403 (Rate Limit) 或其他 5xx 错误，且 URL 是 api.github.com，尝试代理地址
    if ((res.status === 403 || res.status >= 500) && url.includes(CONFIG.API_BASE)) {
      const proxyUrl = url.replace('https://', CONFIG.PROXY_PREFIX);
      console.warn(`直连请求失败 (${res.status})，切换到加速代理重试: ${proxyUrl}`);
      const proxyRes = await fetch(proxyUrl, options);
      if (proxyRes.ok) return proxyRes;
    }
    return res;
  } catch (e) {
    console.warn(`直连请求异常: ${e.message}，尝试使用加速代理...`);
    if (url.includes('https://')) {
      const proxyUrl = url.replace('https://', CONFIG.PROXY_PREFIX);
      try {
        const proxyRes = await fetch(proxyUrl, options);
        if (proxyRes.ok) return proxyRes;
      } catch (proxyError) {
        console.error('代理重试也失败:', proxyError);
      }
    }
    throw e;
  }
}

/**
 * 验证 token 是否有效
 * @param {string} token - GitHub Token
 * @returns {Promise<boolean>} 是否有效
 */
async function validateToken(token) {
  try {
    const res = await fetchWithRetry(`${CONFIG.API_BASE}/user`, {
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
 * 获取数据（无需 Token 即可公开读取，自动带代理重试/Raw 降级）
 * @returns {Promise<Array>} 记录数组
 */
async function loadData() {
  const token = getAuthToken();
  console.log('[loadData] Token 状态:', token ? '已设置 (' + token.substring(0, 10) + '...)' : '未设置');
  
  // 1. 如果有 Token，优先通过 GitHub REST API 获取
  if (token) {
    console.log('[loadData] 步骤 1: 尝试通过 Token 从 Gist API 获取数据');
    try {
      const res = await fetchWithRetry(`${CONFIG.API_BASE}/gists/${CONFIG.GIST_ID}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      console.log('[loadData] 步骤 1 响应状态:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('[loadData] 步骤 1 解析数据:', data.files ? '有 files' : '无 files');
        if (data.files && data.files['history.json']) {
          const parsed = JSON.parse(data.files['history.json'].content);
          console.log('[loadData] 步骤 1 云端记录数:', parsed.records ? parsed.records.length : 'undefined');
          // 只有当云端有数据时才覆盖本地
          if (parsed.records && parsed.records.length > 0) {
            console.log('[loadData] 步骤 1 云端有数据，覆盖本地');
            setStorageItem(CONFIG.STORAGE_KEY, parsed.records);
            return parsed.records;
          } else {
            console.log('[loadData] 步骤 1 云端无数据，继续下一步');
          }
        }
      }
    } catch (e) {
      console.warn('[loadData] 步骤 1 异常:', e.message);
    }
  }

  // 2. 未登录用户尝试 REST API
  if (!token) {
    console.log('[loadData] 步骤 2: 未登录用户，尝试 REST API（无 Token）');
    try {
      const res = await fetchWithRetry(`${CONFIG.API_BASE}/gists/${CONFIG.GIST_ID}`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files['history.json']) {
          const parsed = JSON.parse(data.files['history.json'].content);
          // 只有当云端有数据时才覆盖本地
          if (parsed.records && parsed.records.length > 0) {
            setStorageItem(CONFIG.STORAGE_KEY, parsed.records);
            return parsed.records;
          }
        }
      }
    } catch (e) {
      console.warn('Gist REST API 请求异常:', e);
    }
  }

  // 3. 降级方案：从 Raw URL / 代理 Raw 获取数据（不限流）
  try {
    const rawUrl = `${CONFIG.GIST_RAW_URL}?_t=${Date.now()}`;
    console.log('[loadData] 尝试 Raw URL:', rawUrl);
    const rawRes = await fetchWithRetry(rawUrl);
    console.log('[loadData] Raw 响应状态:', rawRes.status);
    if (rawRes.ok) {
      const parsed = await rawRes.json();
      console.log('[loadData] Raw 解析结果:', JSON.stringify(parsed).substring(0, 100));
      // 只有当云端有数据时才覆盖本地，避免清空本地数据
      if (parsed.records && parsed.records.length > 0) {
        console.log('[loadData] 云端有数据，覆盖本地');
        setStorageItem(CONFIG.STORAGE_KEY, parsed.records);
        return parsed.records;
      } else {
        console.log('[loadData] 云端无数据，使用本地缓存');
      }
    }
  } catch (e) {
    console.warn('从 Raw Gist 获取失败，使用本地缓存:', e);
  }
  
  // 4. 最终回退到 localStorage 缓存
  const localData = getStorageItem(CONFIG.STORAGE_KEY, []);
  console.log('[loadData] 步骤 4: 返回本地数据，数量:', localData.length);
  return localData;
}

/**
 * 保存数据（优先同步到 GitHub Gist）
 * @param {Object} record - 新记录
 * @returns {Promise<boolean>} 是否成功
 */
async function saveData(record) {
  const validRecord = validateRecord(record);
  if (!validRecord) {
    throw new Error('数据验证失败');
  }
  
  const token = getAuthToken();
  let history = await loadData();
  
  // 添加新记录
  history.unshift(validRecord);
  
  if (history.length > CONFIG.MAX_RECORDS) {
    history = history.slice(0, CONFIG.MAX_RECORDS);
  }
  
  const newData = {
    records: history,
    metadata: {
      updated: new Date().toISOString()
    }
  };
  
  if (token) {
    try {
      const res = await fetchWithRetry(`${CONFIG.API_BASE}/gists/${CONFIG.GIST_ID}`, {
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
  
  setStorageItem(CONFIG.STORAGE_KEY, history);
  return true;
}

/**
 * 清除所有数据
 */
async function clearAllData() {
  const token = getAuthToken();
  removeStorageItem(CONFIG.STORAGE_KEY);
  
  if (token) {
    try {
      const res = await fetchWithRetry(`${CONFIG.API_BASE}/gists/${CONFIG.GIST_ID}`, {
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

async function exportData() {
  const data = await loadData();
  return JSON.stringify(data, null, 2);
}

async function importData(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    if (Array.isArray(data)) {
      const validRecords = data
        .map(item => validateRecord(item))
        .filter(item => item !== null);
      
      setStorageItem(CONFIG.STORAGE_KEY, validRecords);
      
      const token = getAuthToken();
      if (token) {
        await saveData({
          id: Date.now(),
          time: new Date().toISOString(),
          valueUsvMax: null,
          valueUsvAvg: null,
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
