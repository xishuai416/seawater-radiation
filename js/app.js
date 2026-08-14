/**
 * 海水辐射值监测平台 - 主页控制器
 * 处理数据展示、图表渲染、状态更新等逻辑
 */

// 应用状态
const AppState = {
  trendChart: null,
  currentRecord: null,
  chartVisible: { uSv: true, cpm: true },
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
 * @param {string} type - 数据集类型 (uSv 或 cpm)
 * @param {boolean} visible - 是否可见
 */
function toggleDataset(type, visible) {
  AppState.chartVisible[type] = visible;
  
  if (AppState.trendChart) {
    const datasetIndex = type === 'uSv' ? 0 : 1;
    const meta = AppState.trendChart.getDatasetMeta(datasetIndex);
    meta.hidden = !visible;
    AppState.trendChart.update();
  }
}

/**
 * 更新显示数据
 * @param {Object} record - 当前记录
 * @param {Array} history - 历史记录
 */
async function updateDisplay(record, history) {
  if (!record || !history || history.length === 0) return;
  
  // 查找首条记录（初始值）
  const firstRecord = history[history.length - 1];
  
  // 当前值
  const currentUsvEl = document.getElementById('current-uSv');
  const currentCpmEl = document.getElementById('current-cpm');
  if (currentUsvEl) currentUsvEl.textContent = record.valueUsv !== null ? record.valueUsv.toFixed(3) : '--';
  if (currentCpmEl) currentCpmEl.textContent = record.valueCpm !== null ? record.valueCpm.toFixed(2) : '--';
  
  // 初始值
  if (firstRecord) {
    const initialUsvEl = document.getElementById('initial-uSv');
    const initialCpmEl = document.getElementById('initial-cpm');
    if (initialUsvEl) initialUsvEl.textContent = firstRecord.valueUsv !== null ? firstRecord.valueUsv.toFixed(3) : '--';
    if (initialCpmEl) initialCpmEl.textContent = firstRecord.valueCpm !== null ? firstRecord.valueCpm.toFixed(2) : '--';
  } else {
    const initialUsvEl = document.getElementById('initial-uSv');
    const initialCpmEl = document.getElementById('initial-cpm');
    if (initialUsvEl) initialUsvEl.textContent = '--';
    if (initialCpmEl) initialCpmEl.textContent = '--';
  }
  
  // 同比增长 (μSv)
  if (record.valueUsv !== null && firstRecord && firstRecord.valueUsv !== null && firstRecord.valueUsv > 0) {
    const yoyUsv = ((record.valueUsv - firstRecord.valueUsv) / firstRecord.valueUsv * 100).toFixed(2);
    const yoyUsvEl = document.getElementById('yoy-uSv');
    const yoyUsvTrendEl = document.getElementById('yoy-uSv-trend');
    if (yoyUsvEl) yoyUsvEl.textContent = `${yoyUsv > 0 ? '+' : ''}${yoyUsv}%`;
    if (yoyUsvTrendEl) updateTrendClass(yoyUsvTrendEl, yoyUsv);
  } else {
    const yoyUsvEl = document.getElementById('yoy-uSv');
    const yoyUsvTrendEl = document.getElementById('yoy-uSv-trend');
    if (yoyUsvEl) yoyUsvEl.textContent = '--';
    if (yoyUsvTrendEl) { yoyUsvTrendEl.textContent = ''; yoyUsvTrendEl.className = 'trend'; }
  }
  
  // 同比增长 (CPM)
  if (record.valueCpm !== null && firstRecord && firstRecord.valueCpm !== null && firstRecord.valueCpm > 0) {
    const yoyCpm = ((record.valueCpm - firstRecord.valueCpm) / firstRecord.valueCpm * 100).toFixed(2);
    const yoyCpmEl = document.getElementById('yoy-cpm');
    const yoyCpmTrendEl = document.getElementById('yoy-cpm-trend');
    if (yoyCpmEl) yoyCpmEl.textContent = `${yoyCpm > 0 ? '+' : ''}${yoyCpm}%`;
    if (yoyCpmTrendEl) updateTrendClass(yoyCpmTrendEl, yoyCpm);
  } else {
    const yoyCpmEl = document.getElementById('yoy-cpm');
    const yoyCpmTrendEl = document.getElementById('yoy-cpm-trend');
    if (yoyCpmEl) yoyCpmEl.textContent = '--';
    if (yoyCpmTrendEl) { yoyCpmTrendEl.textContent = ''; yoyCpmTrendEl.className = 'trend'; }
  }
  
  // 环比增长 (μSv)
  const prevRecord = history.find(r => r.id !== record.id);
  if (record.valueUsv !== null && prevRecord && prevRecord.valueUsv !== null) {
    const momUsv = ((record.valueUsv - prevRecord.valueUsv) / prevRecord.valueUsv * 100).toFixed(2);
    const momUsvEl = document.getElementById('mom-uSv');
    const momUsvTrendEl = document.getElementById('mom-uSv-trend');
    if (momUsvEl) momUsvEl.textContent = `${momUsv > 0 ? '+' : ''}${momUsv}%`;
    if (momUsvTrendEl) updateTrendClass(momUsvTrendEl, momUsv);
  } else {
    const momUsvEl = document.getElementById('mom-uSv');
    const momUsvTrendEl = document.getElementById('mom-uSv-trend');
    if (momUsvEl) momUsvEl.textContent = '--';
    if (momUsvTrendEl) { momUsvTrendEl.textContent = ''; momUsvTrendEl.className = 'trend'; }
  }
  
  // 环比增长 (CPM)
  if (record.valueCpm !== null && prevRecord && prevRecord.valueCpm !== null) {
    const momCpm = ((record.valueCpm - prevRecord.valueCpm) / prevRecord.valueCpm * 100).toFixed(2);
    const momCpmEl = document.getElementById('mom-cpm');
    const momCpmTrendEl = document.getElementById('mom-cpm-trend');
    if (momCpmEl) momCpmEl.textContent = `${momCpm > 0 ? '+' : ''}${momCpm}%`;
    if (momCpmTrendEl) updateTrendClass(momCpmTrendEl, momCpm);
  } else {
    const momCpmEl = document.getElementById('mom-cpm');
    const momCpmTrendEl = document.getElementById('mom-cpm-trend');
    if (momCpmEl) momCpmEl.textContent = '--';
    if (momCpmTrendEl) { momCpmTrendEl.textContent = ''; momCpmTrendEl.className = 'trend'; }
  }
  
  // 变化趋势
  updateTrendDescription(record, history);
  
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
 * 更新趋势描述
 * @param {Object} record - 当前记录
 * @param {Array} history - 历史记录
 */
function updateTrendDescription(record, history) {
  const recentRecords = history.slice(0, CONFIG.TREND_HISTORY_COUNT);
  
  const trendDirectionEl = document.getElementById('trend-direction');
  const trendDescEl = document.getElementById('trend-desc');
  
  if (!trendDirectionEl || !trendDescEl) return;
  
  if (recentRecords.length < 2) {
    trendDirectionEl.textContent = '--';
    trendDescEl.textContent = '数据不足，无法判断趋势';
    return;
  }
  
  // 计算最近几条记录的平均变化率
  const hasUsv = record.valueUsv !== null;
  let totalChange = 0;
  let count = 0;
  
  for (let i = 1; i < recentRecords.length; i++) {
    let change = 0;
    if (hasUsv && recentRecords[i-1].valueUsv !== null && recentRecords[i].valueUsv !== null && recentRecords[i].valueUsv > 0) {
      change = (recentRecords[i-1].valueUsv - recentRecords[i].valueUsv) / recentRecords[i].valueUsv * 100;
    } else if (recentRecords[i-1].valueCpm !== null && recentRecords[i].valueCpm !== null && recentRecords[i].valueCpm > 0) {
      change = (recentRecords[i-1].valueCpm - recentRecords[i].valueCpm) / recentRecords[i].valueCpm * 100;
    }
    
    if (change !== 0) {
      totalChange += change;
      count++;
    }
  }
  
  if (count === 0) {
    trendDirectionEl.textContent = '--';
    trendDescEl.textContent = '无有效数据';
    return;
  }
  
  const avgChange = totalChange / count;
  
  if (avgChange > CONFIG.TREND_THRESHOLD) {
    trendDirectionEl.textContent = '📈 明显上升';
    trendDirectionEl.style.color = CONFIG.COLORS.success;
    trendDescEl.textContent = '近5次监测呈持续上升趋势';
  } else if (avgChange < -CONFIG.TREND_THRESHOLD) {
    trendDirectionEl.textContent = '📉 明显下降';
    trendDirectionEl.style.color = CONFIG.COLORS.danger;
    trendDescEl.textContent = '近5次监测呈持续下降趋势';
  } else if (Math.abs(avgChange) <= CONFIG.TREND_THRESHOLD) {
    trendDirectionEl.textContent = '➡️ 基本稳定';
    trendDirectionEl.style.color = CONFIG.COLORS.warning;
    trendDescEl.textContent = '近5次监测波动在±5%以内';
  }
}

/**
 * 更新图表
 * @param {Array} history - 历史记录
 */
async function updateChart(history) {
  const chartElement = document.getElementById('trend-chart');
  if (!chartElement) return;
  
  const ctx = chartElement.getContext('2d');
  
  if (!history || history.length === 0) return;
  
  // 采样显示（如果数据太多）
  const displayData = sampleData(history, CONFIG.CHART_MAX_POINTS);
  
  // 准备数据
  const labels = displayData.map(r => {
    const date = new Date(r.time);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  });
  
  const usvData = displayData.map(r => r.valueUsv || 0);
  const cpmData = displayData.map(r => r.valueCpm || 0);
  
  // 销毁旧图表
  if (AppState.trendChart) {
    AppState.trendChart.destroy();
  }
  
  // 创建新图表（双数据集）
  AppState.trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: '辐射值 (μSv/h)',
          data: usvData,
          borderColor: CONFIG.COLORS.primary,
          backgroundColor: `${CONFIG.COLORS.primary}33`,
          borderWidth: 2,
          fill: true,
          tension: CONFIG.CHART_TENSION,
          pointRadius: 0,
          pointHoverRadius: 5,
          yAxisID: 'y'
        },
        {
          label: '辐射值 (CPM)',
          data: cpmData,
          borderColor: CONFIG.COLORS.warning,
          backgroundColor: `${CONFIG.COLORS.warning}33`,
          borderWidth: 2,
          fill: true,
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
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(2);
                if (context.datasetIndex === 0) {
                  label += ' μSv/h';
                } else {
                  label += ' CPM';
                }
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
