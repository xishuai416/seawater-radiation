/**
 * 海水辐射值监测平台 - 主页控制器
 * 处理数据展示、图表渲染、状态更新等逻辑
 */

// 应用状态
const AppState = {
  trendChart: null,
  currentRecord: null,
  chartVisible: { uSvMax: true, uSvAvg: true, cpm: true },
  history: []
};

// 初始化
document.addEventListener('DOMContentLoaded', async function() {
  try {
    await updateGitHubStatus();
    await loadHistoryData();
  } catch (error) {
    console.error('初始化失败:', error);
    showNotification('初始化失败，请刷新重试', 'error');
  }
});

/**
 * 更新 GitHub 连接状态显示
 */
async function updateGitHubStatus() {
  const statusEl = document.getElementById('github-status');
  const iconEl = document.getElementById('status-icon');
  const textEl = document.getElementById('status-text');
  
  if (!statusEl || !iconEl || !textEl) return;
  
  const token = RadiationAPI.getAuthToken();
  
  if (token) {
    const connected = await RadiationAPI.validateToken(token);
    if (connected) {
      statusEl.className = 'github-status connected';
      iconEl.textContent = '🟢';
      textEl.textContent = '已连接GitHub';
    } else {
      statusEl.className = 'github-status disconnected';
      iconEl.textContent = '🟡';
      textEl.textContent = 'Token失效';
    }
  } else {
    statusEl.className = 'github-status disconnected';
    iconEl.textContent = '⚪';
    textEl.textContent = '本地模式';
  }
}

/**
 * 加载历史数据并更新显示
 */
async function loadHistoryData() {
  try {
    const history = await RadiationAPI.loadData();
    AppState.history = history;
    
    if (history.length > 0) {
      AppState.currentRecord = history[0];
      updateDisplay(AppState.currentRecord, history);
      updateChart(history);
      const totalCountEl = document.getElementById('total-count');
      if (totalCountEl) {
        totalCountEl.textContent = history.length;
      }
    } else {
      showNotification('暂无监测数据', 'info');
    }
  } catch (error) {
    console.error('加载数据失败:', error);
    showNotification('数据加载失败', 'error');
  }
}

/**
 * 切换数据集可见性
 * @param {string} type - 数据集类型 (uSvMax, uSvAvg, cpm)
 * @param {boolean} visible - 是否可见
 */
function toggleDataset(type, visible) {
  AppState.chartVisible[type] = visible;
  
  if (AppState.trendChart) {
    let datasetIndex = 0;
    if (type === 'uSvMax') datasetIndex = 0;
    else if (type === 'uSvAvg') datasetIndex = 1;
    else if (type === 'cpm') datasetIndex = 2;

    const meta = AppState.trendChart.getDatasetMeta(datasetIndex);
    if (meta) {
      meta.hidden = !visible;
      AppState.trendChart.update();
    }
  }
}

/**
 * 更新显示数据
 * @param {Object} record - 当前记录
 * @param {Array} history - 历史记录
 */
async function updateDisplay(record, history) {
  if (!record || !history || history.length === 0) return;  
  const firstRecord = history[history.length - 1];
  
  // 兼容旧字段逻辑：如果在旧数据中只有 valueUsv，则当作 Max 和 Avg
  const curMax = record.valueUsvMax !== undefined && record.valueUsvMax !== null ? record.valueUsvMax : record.valueUsv;
  const curAvg = record.valueUsvAvg !== undefined && record.valueUsvAvg !== null ? record.valueUsvAvg : record.valueUsv;
  const curCpm = record.valueCpm;

  const firstMax = firstRecord ? (firstRecord.valueUsvMax !== undefined && firstRecord.valueUsvMax !== null ? firstRecord.valueUsvMax : firstRecord.valueUsv) : null;
  const firstAvg = firstRecord ? (firstRecord.valueUsvAvg !== undefined && firstRecord.valueUsvAvg !== null ? firstRecord.valueUsvAvg : firstRecord.valueUsv) : null;
  const firstCpm = firstRecord ? firstRecord.valueCpm : null;

  // 1. 当前值
  const curMaxEl = document.getElementById('current-uSv-max');
  const curAvgEl = document.getElementById('current-uSv-avg');
  const curCpmEl = document.getElementById('current-cpm');
  if (curMaxEl) curMaxEl.textContent = curMax !== undefined && curMax !== null ? curMax.toFixed(3) : '--';
  if (curAvgEl) curAvgEl.textContent = curAvg !== undefined && curAvg !== null ? curAvg.toFixed(3) : '--';
  if (curCpmEl) curCpmEl.textContent = curCpm !== undefined && curCpm !== null ? curCpm.toFixed(2) : '--';
  
  // 2. 初始值
  const initMaxEl = document.getElementById('initial-uSv-max');
  const initAvgEl = document.getElementById('initial-uSv-avg');
  const initCpmEl = document.getElementById('initial-cpm');
  if (initMaxEl) initMaxEl.textContent = firstMax !== undefined && firstMax !== null ? firstMax.toFixed(3) : '--';
  if (initAvgEl) initAvgEl.textContent = firstAvg !== undefined && firstAvg !== null ? firstAvg.toFixed(3) : '--';
  if (initCpmEl) initCpmEl.textContent = firstCpm !== undefined && firstCpm !== null ? firstCpm.toFixed(2) : '--';
  
  // 3. 同比增长
  updateGrowthDisplay('yoy-uSv-max', 'yoy-uSv-max-trend', curMax, firstMax);
  updateGrowthDisplay('yoy-uSv-avg', 'yoy-uSv-avg-trend', curAvg, firstAvg);
  updateGrowthDisplay('yoy-cpm', 'yoy-cpm-trend', curCpm, firstCpm);
  
  // 4. 环比增长
  const prevRecord = history.find(r => r.id !== record.id);
  const prevMax = prevRecord ? (prevRecord.valueUsvMax !== undefined && prevRecord.valueUsvMax !== null ? prevRecord.valueUsvMax : prevRecord.valueUsv) : null;
  const prevAvg = prevRecord ? (prevRecord.valueUsvAvg !== undefined && prevRecord.valueUsvAvg !== null ? prevRecord.valueUsvAvg : prevRecord.valueUsv) : null;
  const prevCpm = prevRecord ? prevRecord.valueCpm : null;

  updateGrowthDisplay('mom-uSv-max', 'mom-uSv-max-trend', curMax, prevMax);
  updateGrowthDisplay('mom-uSv-avg', 'mom-uSv-avg-trend', curAvg, prevAvg);
  updateGrowthDisplay('mom-cpm', 'mom-cpm-trend', curCpm, prevCpm);
  
  // 5. 变化趋势（最大值 & 平均值）
  updateFieldTrendDescription('trend-max-direction', 'trend-max-desc', history, 'max');
  updateFieldTrendDescription('trend-avg-direction', 'trend-avg-desc', history, 'avg');
  
  // 最后更新时间
  if (record.time) {
    const date = new Date(record.time);
    const lastUpdateEl = document.getElementById('last-update');
    const lastUpdateTimeEl = document.getElementById('last-update-time');
    if (lastUpdateEl) lastUpdateEl.textContent = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    if (lastUpdateTimeEl) lastUpdateTimeEl.textContent = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * 辅助方法：更新增长率卡片
 */
function updateGrowthDisplay(valElemId, trendElemId, curVal, baseVal) {
  const valEl = document.getElementById(valElemId);
  const trendEl = document.getElementById(trendElemId);
  
  if (curVal !== null && curVal !== undefined && baseVal !== null && baseVal !== undefined && baseVal > 0) {
    const rate = ((curVal - baseVal) / baseVal * 100).toFixed(2);
    if (valEl) valEl.textContent = `${rate > 0 ? '+' : ''}${rate}%`;
    if (trendEl) updateTrendClass(trendEl, rate);
  } else {
    if (valEl) valEl.textContent = '--';
    if (trendEl) { trendEl.textContent = ''; trendEl.className = 'trend'; }
  }
}

/**
 * 针对特定字段（max 或 avg）计算并显示趋势描述
 */
function updateFieldTrendDescription(directionElemId, descElemId, history, fieldType) {
  const recentRecords = history.slice(0, CONFIG.TREND_HISTORY_COUNT);
  const dirEl = document.getElementById(directionElemId);
  const descEl = document.getElementById(descElemId);
  
  if (!dirEl || !descEl) return;
  
  if (recentRecords.length < 2) {
    dirEl.textContent = '--';
    descEl.textContent = '数据不足';
    return;
  }
  
  let totalChange = 0;
  let count = 0;
  
  for (let i = 1; i < recentRecords.length; i++) {
    const prevR = recentRecords[i];
    const curR = recentRecords[i-1];
    
    let curV = fieldType === 'max' 
      ? (curR.valueUsvMax !== undefined && curR.valueUsvMax !== null ? curR.valueUsvMax : curR.valueUsv)
      : (curR.valueUsvAvg !== undefined && curR.valueUsvAvg !== null ? curR.valueUsvAvg : curR.valueUsv);

    let prevV = fieldType === 'max'
      ? (prevR.valueUsvMax !== undefined && prevR.valueUsvMax !== null ? prevR.valueUsvMax : prevR.valueUsv)
      : (prevR.valueUsvAvg !== undefined && prevR.valueUsvAvg !== null ? prevR.valueUsvAvg : prevR.valueUsv);

    if (curV !== null && curV !== undefined && prevV !== null && prevV !== undefined && prevV > 0) {
      const change = (curV - prevV) / prevV * 100;
      totalChange += change;
      count++;
    }
  }
  
  if (count === 0) {
    dirEl.textContent = '--';
    descEl.textContent = '无有效数据';
    return;
  }
  
  const avgChange = totalChange / count;
  
  if (avgChange > CONFIG.TREND_THRESHOLD) {
    dirEl.textContent = '📈 明显上升';
    dirEl.style.color = CONFIG.COLORS.danger;
    descEl.textContent = '近5次明显上升';
  } else if (avgChange < -CONFIG.TREND_THRESHOLD) {
    dirEl.textContent = '📉 明显下降';
    dirEl.style.color = CONFIG.COLORS.success;
    descEl.textContent = '近5次明显下降';
  } else {
    dirEl.textContent = '➡️ 基本稳定';
    dirEl.style.color = CONFIG.COLORS.warning;
    descEl.textContent = '波动在±5%以内';
  }
}

/**
 * 更新图表（支持最大值、平均值、CPM 三条曲线）
 * @param {Array} history - 历史记录
 */
async function updateChart(history) {
  const chartElement = document.getElementById('trend-chart');
  if (!chartElement) return;
  
  const ctx = chartElement.getContext('2d');
  if (!history || history.length === 0) return;
  
  // 采样显示
  const displayData = sampleData(history, CONFIG.CHART_MAX_POINTS);
  
  const labels = displayData.map(r => {
    const date = new Date(r.time);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  });
  
  const usvMaxData = displayData.map(r => (r.valueUsvMax !== undefined && r.valueUsvMax !== null) ? r.valueUsvMax : (r.valueUsv || 0));
  const usvAvgData = displayData.map(r => (r.valueUsvAvg !== undefined && r.valueUsvAvg !== null) ? r.valueUsvAvg : (r.valueUsv || 0));
  const cpmData = displayData.map(r => r.valueCpm || 0);
  
  if (AppState.trendChart) {
    AppState.trendChart.destroy();
  }
  
  AppState.trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: '最大辐射值 (μSv/h)',
          data: usvMaxData,
          borderColor: CONFIG.COLORS.primary,
          backgroundColor: `${CONFIG.COLORS.primary}22`,
          borderWidth: 2,
          fill: false,
          tension: CONFIG.CHART_TENSION,
          pointRadius: 0,
          pointHoverRadius: 5,
          yAxisID: 'y'
        },
        {
          label: '平均辐射值 (μSv/h)',
          data: usvAvgData,
          borderColor: CONFIG.COLORS.primaryAvg,
          backgroundColor: `${CONFIG.COLORS.primaryAvg}22`,
          borderWidth: 2,
          fill: false,
          tension: CONFIG.CHART_TENSION,
          pointRadius: 0,
          pointHoverRadius: 5,
          yAxisID: 'y'
        },
        {
          label: '辐射计数 (CPM)',
          data: cpmData,
          borderColor: CONFIG.COLORS.warning,
          backgroundColor: `${CONFIG.COLORS.warning}22`,
          borderWidth: 2,
          fill: false,
          tension: CONFIG.CHART_TENSION,
          pointRadius: 0,
          pointHoverRadius: 5,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          labels: {
            color: CONFIG.COLORS.text,
            font: { size: 12 }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: CONFIG.COLORS.primary,
          bodyColor: CONFIG.COLORS.text,
          padding: 12,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(context.datasetIndex === 2 ? 2 : 3);
                label += context.datasetIndex === 2 ? ' CPM' : ' μSv/h';
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          ticks: { 
            color: CONFIG.COLORS.textMuted,
            maxTicksLimit: 10,
            maxRotation: 45,
            font: { size: 10 }
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: 'rgba(79, 195, 247, 0.1)' },
          ticks: { 
            color: CONFIG.COLORS.primary,
            font: { size: 10 }
          },
          title: {
            display: true,
            text: 'μSv/h',
            color: CONFIG.COLORS.primary
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { 
            color: CONFIG.COLORS.warning,
            font: { size: 10 }
          },
          title: {
            display: true,
            text: 'CPM',
            color: CONFIG.COLORS.warning
          }
        }
      }
    }
  });
}
