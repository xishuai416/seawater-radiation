/**
 * 海水辐射值监测平台 - 工具函数库
 * 提供通用的工具函数，减少代码重复
 */

/**
 * 格式化为本地时间字符串
 * @param {Date|string} date - 日期对象或日期字符串
 * @param {Object} options - 格式化选项
 * @returns {string} 格式化后的时间字符串
 */
function formatDateTime(date, options = {}) {
  if (!date) return '--';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '--';
  
  const defaults = {
    date: { month: '2-digit', day: '2-digit' },
    time: { hour: '2-digit', minute: '2-digit' }
  };
  
  const opts = { ...defaults, ...options };
  return {
    date: d.toLocaleDateString('zh-CN', opts.date),
    time: d.toLocaleTimeString('zh-CN', opts.time),
    full: d.toLocaleString('zh-CN')
  };
}

/**
 * 计算同比增长率
 * @param {number} current - 当前值
 * @param {number} initial - 初始值
 * @returns {string|null} 格式化后的增长率字符串，无效时返回 null
 */
function calculateGrowthRate(current, initial) {
  if (current === null || current === undefined || initial === null || initial === undefined) {
    return null;
  }
  if (initial === 0) return '∞';
  const rate = ((current - initial) / initial * 100).toFixed(2);
  return rate > 0 ? `+${rate}%` : `${rate}%`;
}

/**
 * 更新趋势样式类
 * @param {HTMLElement|string} element - DOM元素或元素ID
 * @param {number} changeValue - 变化值
 */
function updateTrendClass(element, changeValue) {
  const el = typeof element === 'string' ? document.getElementById(element) : element;
  if (!el) return;
  
  const numValue = parseFloat(changeValue);
  if (numValue > 0) {
    el.textContent = '↑ 上升';
    el.className = 'trend up';
  } else if (numValue < 0) {
    el.textContent = '↓ 下降';
    el.className = 'trend down';
  } else {
    el.textContent = '— 持平';
    el.className = 'trend stable';
  }
}

/**
 * 安全地从 localStorage 获取数据
 * @param {string} key - 存储键
 * @param {*} defaultValue - 默认值
 * @returns {*} 解析后的数据或默认值
 */
function getStorageItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`读取 localStorage 失败: ${key}`, e);
    return defaultValue;
  }
}

/**
 * 安全地保存到 localStorage
 * @param {string} key - 存储键
 * @param {*} value - 要保存的值
 * @returns {boolean} 是否成功
 */
function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`写入 localStorage 失败: ${key}`, e);
    return false;
  }
}

/**
 * 从 localStorage 移除数据
 * @param {string} key - 存储键
 */
function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error(`删除 localStorage 失败: ${key}`, e);
    return false;
  }
}

/**
 * 验证并清理输入数据（兼容旧的 valueUsv，并支持 valueUsvMax, valueUsvAvg）
 * @param {Object} data - 待验证的数据
 * @returns {Object|null} 验证通过的数据，失败返回 null
 */
function validateRecord(data) {
  if (!data) return null;
  
  const { time, valueUsv, valueUsvMax, valueUsvAvg, valueCpm } = data;
  
  // 时间验证
  if (!time || isNaN(new Date(time).getTime())) {
    console.error('无效的时间数据');
    return null;
  }
  
  // 兼容逻辑：如果没有单独传 Max 或 Avg，优先使用 valueUsv 作为两者的默认值
  let max = valueUsvMax !== undefined && valueUsvMax !== null ? parseFloat(valueUsvMax) : null;
  let avg = valueUsvAvg !== undefined && valueUsvAvg !== null ? parseFloat(valueUsvAvg) : null;
  
  if (isNaN(max) && valueUsv !== undefined && valueUsv !== null && !isNaN(parseFloat(valueUsv))) {
    max = parseFloat(valueUsv);
  }
  if (isNaN(avg) && valueUsv !== undefined && valueUsv !== null && !isNaN(parseFloat(valueUsv))) {
    avg = parseFloat(valueUsv);
  }

  const cpm = valueCpm !== null && valueCpm !== undefined ? parseFloat(valueCpm) : null;
  
  if (isNaN(max) && isNaN(avg) && isNaN(cpm)) {
    console.error('至少需要一个有效的辐射值');
    return null;
  }
  
  return {
    id: data.id || Date.now(),
    time: new Date(time).toISOString(),
    valueUsvMax: isNaN(max) ? null : max,
    valueUsvAvg: isNaN(avg) ? null : avg,
    valueCpm: isNaN(cpm) ? null : cpm
  };
}

/**
 * 生成测试数据（更新生成 valueUsvMax, valueUsvAvg, valueCpm）
 * @param {number} count - 生成数据条数
 * @param {number} startTime - 起始时间戳
 * @returns {Array} 生成的记录数组
 */
function generateTestData_fromUtils(count, startTime = null) {
  const records = [];
  const baseTime = startTime || (Date.now() - count * CONFIG.TEST_TIME_INTERVAL);
  let baseUsv = CONFIG.TEST_BASE_USV;
  let baseCpm = CONFIG.TEST_BASE_CPM;
  
  for (let i = 0; i < count; i++) {
    const trend = i * 0.0001;
    const randomUsvAvg = (Math.random() - 0.5) * 0.02;
    const randomUsvMaxOffset = Math.random() * 0.015 + 0.005; // 最大值比平均值高 0.005~0.02
    const randomCpm = (Math.random() - 0.5) * 5;
    
    const valueUsvAvg = Math.max(0.05, baseUsv + trend + randomUsvAvg);
    const valueUsvMax = valueUsvAvg + randomUsvMaxOffset;
    const valueCpm = Math.max(20, baseCpm + trend * 200 + randomCpm);
    
    const time = new Date(baseTime + i * CONFIG.TEST_TIME_INTERVAL).toISOString();
    
    records.push({
      id: Date.now() + i,
      time,
      valueUsvMax: parseFloat(valueUsvMax.toFixed(3)),
      valueUsvAvg: parseFloat(valueUsvAvg.toFixed(3)),
      valueCpm: parseFloat(valueCpm.toFixed(2))
    });
  }
  
  return records;
}

/**
 * 对数组进行采样（用于大量数据时的图表显示）
 * @param {Array} data - 原始数据数组
 * @param {number} maxPoints - 最大点数
 * @returns {Array} 采样后的数据数组
 */
function sampleData(data, maxPoints = CONFIG.CHART_MAX_POINTS) {
  if (!data || data.length <= maxPoints) return data;
  
  const step = Math.floor(data.length / maxPoints);
  return data.filter((_, index) => index % step === 0);
}

/**
 * 显示提示信息
 * @param {string} message - 提示消息
 * @param {string} type - 消息类型 (success, error, warning, info)
 * @param {number} duration - 显示时长（毫秒）
 */
function showNotification(message, type = 'info', duration = 3000) {
  // 移除已有通知
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    z-index: 9999;
    animation: slideDown 0.3s ease;
    ${type === 'success' ? 'background: #4caf50;' : 
      type === 'error' ? 'background: #f44336;' : 
      type === 'warning' ? 'background: #ff9800;' : 'background: #2196f3;'}
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideUp 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from { transform: translate(-50%, -100%); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translate(-50%, 0); opacity: 1; }
    to { transform: translate(-50%, -100%); opacity: 0; }
  }
`;
document.head.appendChild(style);
