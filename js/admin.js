/**
 * 海水辐射值监测平台 - 管理页控制器
 * 处理登录、数据录入等管理功能
 */

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  // 检查是否已连接GitHub
  const savedToken = RadiationAPI.getAuthToken();
  if (savedToken) {
    // 显示已连接状态，但不自动填充 Token 到输入框（安全考虑）
    validateAndShowTokenStatus(savedToken);
    const statusTextEl = document.getElementById('token-status-text');
    if (statusTextEl) statusTextEl.textContent = '已连接（session）';
    const statusEl = document.getElementById('token-status');
    if (statusEl) statusEl.className = 'token-status connected';
    // 自动进入录入页面
    showEntryPanel();
  } else {
    showLoginPanel();
  }
  
  // 设置默认时间
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localISOTime = new Date(now - offset).toISOString().slice(0, 16);
  const timeInput = document.getElementById('measure-time');
  if (timeInput) timeInput.value = localISOTime;
});

/**
 * 连接GitHub
 */
async function connectGitHub() {
  const tokenInput = document.getElementById('github-token');
  const statusEl = document.getElementById('token-status');
  const statusTextEl = document.getElementById('token-status-text');
  
  if (!tokenInput || !statusEl || !statusTextEl) return;
  
  const token = tokenInput.value.trim();
  if (!token) {
    showNotification('请输入GitHub Token', 'warning');
    return;
  }
  
  statusTextEl.textContent = '验证中...';
  
  try {
    const isValid = await RadiationAPI.validateToken(token);
    
    if (isValid) {
      RadiationAPI.saveAuthToken(token);
      statusEl.className = 'token-status connected';
      statusTextEl.textContent = '已连接（session）';
      showNotification('GitHub 连接成功', 'success');
      showEntryPanel();
    } else {
      statusEl.className = 'token-status disconnected';
      statusTextEl.textContent = '连接失败，请检查Token';
      showNotification('GitHub Token验证失败，请检查后重试', 'error');
    }
  } catch (error) {
    console.error('连接GitHub失败:', error);
    statusEl.className = 'token-status disconnected';
    statusTextEl.textContent = '连接失败';
    showNotification('连接失败，请重试', 'error');
  }
}

/**
 * 验证Token并显示状态
 * @param {string} token - GitHub Token
 */
async function validateAndShowTokenStatus(token) {
  const statusEl = document.getElementById('token-status');
  const statusTextEl = document.getElementById('token-status-text');
  
  if (!statusEl || !statusTextEl) return;
  
  try {
    const isValid = await RadiationAPI.validateToken(token);
    
    if (isValid) {
      statusEl.className = 'token-status connected';
      statusTextEl.textContent = '已连接（session）';
    } else {
      statusEl.className = 'token-status disconnected';
      statusTextEl.textContent = '连接失效';
    }
  } catch (error) {
    console.error('验证Token失败:', error);
    statusEl.className = 'token-status disconnected';
    statusTextEl.textContent = '验证失败';
  }
}

/**
 * 显示登录面板
 */
function showLoginPanel() {
  const loginBox = document.getElementById('login-box');
  const entryBox = document.getElementById('entry-box');
  
  if (loginBox) loginBox.style.display = 'block';
  if (entryBox) entryBox.style.display = 'none';
}

/**
 * 显示录入面板
 */
function showEntryPanel() {
  const loginBox = document.getElementById('login-box');
  const entryBox = document.getElementById('entry-box');
  
  if (loginBox) loginBox.style.display = 'none';
  if (entryBox) entryBox.style.display = 'block';
}

/**
 * 退出登录
 */
function logout() {
  RadiationAPI.clearAuthToken();
  showLoginPanel();
  
  const tokenInput = document.getElementById('github-token');
  if (tokenInput) tokenInput.value = '';
  
  const statusTextEl = document.getElementById('token-status-text');
  const statusEl = document.getElementById('token-status');
  if (statusTextEl) statusTextEl.textContent = '未连接';
  if (statusEl) statusEl.className = 'token-status disconnected';
}

/**
 * 提交数据
 */
async function submitData() {
  const timeInput = document.getElementById('measure-time');
  const valueUsvInput = document.getElementById('value-uSv');
  const valueCpmInput = document.getElementById('value-cpm');
  const msgEl = document.getElementById('submit-msg');
  
  if (!timeInput || !valueUsvInput || !valueCpmInput || !msgEl) return;
  
  const time = timeInput.value;
  const valueUsv = parseFloat(valueUsvInput.value);
  const valueCpm = parseFloat(valueCpmInput.value);
  
  // 验证输入
  if (!time) {
    showNotification('请选择测量时间', 'warning');
    return;
  }
  
  if (isNaN(valueUsv) && isNaN(valueCpm)) {
    showNotification('请至少输入一个辐射值（μSv/h 或 CPM）', 'warning');
    return;
  }
  
  // 构建数据记录
  const record = {
    id: Date.now(),
    time,
    valueUsv: isNaN(valueUsv) ? null : valueUsv,
    valueCpm: isNaN(valueCpm) ? null : valueCpm
  };
  
  // 显示提交状态
  msgEl.textContent = '正在保存...';
  msgEl.style.color = CONFIG.COLORS.warning;
  msgEl.style.display = 'block';
  
  try {
    await RadiationAPI.saveData(record);
    msgEl.textContent = '✅ 数据已同步到GitHub';
    msgEl.style.color = CONFIG.COLORS.success;
    showNotification('数据保存成功', 'success');
  } catch (e) {
    console.error('保存失败:', e);
    // 回退到 localStorage
    let history = getHistory();
    history.unshift(record);
    if (history.length > CONFIG.MAX_RECORDS) {
      history = history.slice(0, CONFIG.MAX_RECORDS);
    }
    setStorageItem(CONFIG.STORAGE_KEY, history);
    msgEl.textContent = '⚠️ GitHub同步失败，已保存到本地';
    msgEl.style.color = CONFIG.COLORS.warning;
    showNotification('GitHub同步失败，数据已本地保存', 'warning');
  }
  
  // 清空输入
  valueUsvInput.value = '';
  valueCpmInput.value = '';
  
  // 1.5秒后跳转回主页
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1500);
}

/**
 * 获取历史记录（本地备份）
 * @returns {Array} 记录数组
 */
function getHistory() {
  return getStorageItem(CONFIG.STORAGE_KEY, []);
}
