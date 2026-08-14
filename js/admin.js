/**
 * 海水辐射值监测平台 - 管理页控制器
 * 处理登录、数据录入等管理功能
 */

// 初始化
document.addEventListener('DOMContentLoaded', async function() {
  // 检查是否已连接GitHub
  const savedToken = RadiationAPI.getAuthToken();
  if (savedToken) {
    // 填充输入框
    const tokenInput = document.getElementById('github-token');
    if (tokenInput) tokenInput.value = savedToken;
    
    // 显示已连接状态，并自动登录校验进入录入页面
    const statusTextEl = document.getElementById('token-status-text');
    const statusEl = document.getElementById('token-status');
    if (statusTextEl) statusTextEl.textContent = '验证中...';
    
    const isValid = await RadiationAPI.validateToken(savedToken);
    if (isValid) {
      if (statusTextEl) statusTextEl.textContent = '已自动连接';
      if (statusEl) statusEl.className = 'token-status connected';
      showEntryPanel();
    } else {
      if (statusTextEl) statusTextEl.textContent = 'Token 已失效';
      if (statusEl) statusEl.className = 'token-status disconnected';
      showLoginPanel();
    }
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
      statusTextEl.textContent = '已连接';
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
  const valueUsvMaxInput = document.getElementById('value-uSv-max');
  const valueUsvAvgInput = document.getElementById('value-uSv-avg');
  const valueCpmInput = document.getElementById('value-cpm');
  const msgEl = document.getElementById('submit-msg');
  
  if (!timeInput || !valueUsvMaxInput || !valueUsvAvgInput || !valueCpmInput || !msgEl) return;
  
  const time = timeInput.value;
  const valueUsvMax = parseFloat(valueUsvMaxInput.value);
  const valueUsvAvg = parseFloat(valueUsvAvgInput.value);
  const valueCpm = parseFloat(valueCpmInput.value);
  
  // 验证输入
  if (!time) {
    showNotification('请选择测量时间', 'warning');
    return;
  }
  
  if (isNaN(valueUsvMax) && isNaN(valueUsvAvg) && isNaN(valueCpm)) {
    showNotification('请至少输入一个辐射值（最大值、平均值或 CPM）', 'warning');
    return;
  }
  
  // 构建数据记录
  const record = {
    id: Date.now(),
    time,
    valueUsvMax: isNaN(valueUsvMax) ? null : valueUsvMax,
    valueUsvAvg: isNaN(valueUsvAvg) ? null : valueUsvAvg,
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
    let history = getStorageItem(CONFIG.STORAGE_KEY, []);
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
  valueUsvMaxInput.value = '';
  valueUsvAvgInput.value = '';
  valueCpmInput.value = '';
  
  // 1.5秒后跳转回主页
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1500);
}
