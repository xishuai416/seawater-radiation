// 数据存储（使用 localStorage 作为备份，优先使用 GitHub Gist）
const STORAGE_KEY = 'seawater_radiation_data';
let trendChart = null;
let currentRecord = null;
let chartVisible = { uSv: true, cpm: true };

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    updateGitHubStatus();
    loadHistoryData();
});

// 更新GitHub状态显示
async function updateGitHubStatus() {
    const statusEl = document.getElementById('github-status');
    const iconEl = document.getElementById('status-icon');
    const textEl = document.getElementById('status-text');
    
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

// 获取历史记录
async function getHistory() {
    return await RadiationAPI.loadData();
}

// 加载历史数据
async function loadHistoryData() {
    const history = await getHistory();
    if (history.length > 0) {
        currentRecord = history[0];
        updateDisplay(currentRecord, history);
        updateChart(history);
        document.getElementById('total-count').textContent = history.length;
    }
}

// 切换数据集可见性
function toggleDataset(type, visible) {
    chartVisible[type] = visible;
    
    if (trendChart) {
        const datasetIndex = type === 'uSv' ? 0 : 1;
        const meta = trendChart.getDatasetMeta(datasetIndex);
        meta.hidden = !visible;
        trendChart.update();
    }
}

// 更新显示
async function updateDisplay(record, history) {
    // 查找首条记录（初始值）
    const firstRecord = history[history.length - 1];
    
    // 当前值
    document.getElementById('current-uSv').textContent = record.valueUsv !== null ? record.valueUsv.toFixed(3) : '--';
    document.getElementById('current-cpm').textContent = record.valueCpm !== null ? record.valueCpm.toFixed(2) : '--';
    
    // 初始值（首条记录的值）
    if (firstRecord) {
        document.getElementById('initial-uSv').textContent = firstRecord.valueUsv !== null ? firstRecord.valueUsv.toFixed(3) : '--';
        document.getElementById('initial-cpm').textContent = firstRecord.valueCpm !== null ? firstRecord.valueCpm.toFixed(2) : '--';
    } else {
        document.getElementById('initial-uSv').textContent = '--';
        document.getElementById('initial-cpm').textContent = '--';
    }
    
    // 同比增长 (μSv)
    if (record.valueUsv !== null && firstRecord && firstRecord.valueUsv !== null && firstRecord.valueUsv > 0) {
        const yoyUsv = ((record.valueUsv - firstRecord.valueUsv) / firstRecord.valueUsv * 100).toFixed(2);
        document.getElementById('yoy-uSv').textContent = `${yoyUsv > 0 ? '+' : ''}${yoyUsv}%`;
        updateTrendClass('yoy-uSv-trend', yoyUsv);
    } else {
        document.getElementById('yoy-uSv').textContent = '--';
        document.getElementById('yoy-uSv-trend').textContent = '';
        document.getElementById('yoy-uSv-trend').className = 'trend';
    }
    
    // 同比增长 (CPM)
    if (record.valueCpm !== null && firstRecord && firstRecord.valueCpm !== null && firstRecord.valueCpm > 0) {
        const yoyCpm = ((record.valueCpm - firstRecord.valueCpm) / firstRecord.valueCpm * 100).toFixed(2);
        document.getElementById('yoy-cpm').textContent = `${yoyCpm > 0 ? '+' : ''}${yoyCpm}%`;
        updateTrendClass('yoy-cpm-trend', yoyCpm);
    } else {
        document.getElementById('yoy-cpm').textContent = '--';
        document.getElementById('yoy-cpm-trend').textContent = '';
        document.getElementById('yoy-cpm-trend').className = 'trend';
    }
    
    // 环比增长 (μSv)
    const prevRecord = history.find(r => r.id !== record.id);
    if (record.valueUsv !== null && prevRecord && prevRecord.valueUsv !== null) {
        const momUsv = ((record.valueUsv - prevRecord.valueUsv) / prevRecord.valueUsv * 100).toFixed(2);
        document.getElementById('mom-uSv').textContent = `${momUsv > 0 ? '+' : ''}${momUsv}%`;
        updateTrendClass('mom-uSv-trend', momUsv);
    } else {
        document.getElementById('mom-uSv').textContent = '--';
        document.getElementById('mom-uSv-trend').textContent = '';
        document.getElementById('mom-uSv-trend').className = 'trend';
    }
    
    // 环比增长 (CPM)
    if (record.valueCpm !== null && prevRecord && prevRecord.valueCpm !== null) {
        const momCpm = ((record.valueCpm - prevRecord.valueCpm) / prevRecord.valueCpm * 100).toFixed(2);
        document.getElementById('mom-cpm').textContent = `${momCpm > 0 ? '+' : ''}${momCpm}%`;
        updateTrendClass('mom-cpm-trend', momCpm);
    } else {
        document.getElementById('mom-cpm').textContent = '--';
        document.getElementById('mom-cpm-trend').textContent = '';
        document.getElementById('mom-cpm-trend').className = 'trend';
    }
    
    // 变化趋势
    updateTrendDescription(record, history);
    
    // 最后更新时间
    if (record.time) {
        const date = new Date(record.time);
        document.getElementById('last-update').textContent = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
        document.getElementById('last-update-time').textContent = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
}

// 更新趋势样式类
function updateTrendClass(elementId, changeValue) {
    const el = document.getElementById(elementId);
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

// 更新趋势描述
function updateTrendDescription(record, history) {
    const recentRecords = history.slice(0, 5);
    
    if (recentRecords.length < 2) {
        document.getElementById('trend-direction').textContent = '--';
        document.getElementById('trend-desc').textContent = '数据不足，无法判断趋势';
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
        document.getElementById('trend-direction').textContent = '--';
        document.getElementById('trend-desc').textContent = '无有效数据';
        return;
    }
    
    const avgChange = totalChange / count;
    
    const trendEl = document.getElementById('trend-direction');
    const descEl = document.getElementById('trend-desc');
    
    if (avgChange > 5) {
        trendEl.textContent = '📈 明显上升';
        trendEl.style.color = '#4caf50';
        descEl.textContent = '近5次监测呈持续上升趋势';
    } else if (avgChange < -5) {
        trendEl.textContent = '📉 明显下降';
        trendEl.style.color = '#f44336';
        descEl.textContent = '近5次监测呈持续下降趋势';
    } else if (Math.abs(avgChange) <= 5) {
        trendEl.textContent = '➡️ 基本稳定';
        trendEl.style.color = '#ff9800';
        descEl.textContent = '近5次监测波动在±5%以内';
    }
}

// 更新图表
async function updateChart(history) {
    const ctx = document.getElementById('trend-chart').getContext('2d');
    
    if (!history || history.length === 0) return;
    
    // 如果数据太多，采样显示（最多显示100个点）
    let displayData = history;
    if (history.length > 100) {
        const step = Math.floor(history.length / 100);
        displayData = history.filter((_, index) => index % step === 0);
    }
    
    // 准备数据
    const labels = displayData.map(r => {
        const date = new Date(r.time);
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    });
    
    // 准备μSv和CPM数据
    const usvData = displayData.map(r => r.valueUsv || 0);
    const cpmData = displayData.map(r => r.valueCpm || 0);
    
    // 销毁旧图表
    if (trendChart) {
        trendChart.destroy();
    }
    
    // 创建新图表（双数据集）
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '辐射值 (μSv/h)',
                    data: usvData,
                    borderColor: '#4fc3f7',
                    backgroundColor: '#4fc3f733',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    yAxisID: 'y'
                },
                {
                    label: '辐射值 (CPM)',
                    data: cpmData,
                    borderColor: '#ff9800',
                    backgroundColor: '#ff980033',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
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
                        color: '#fff',
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#4fc3f7',
                    bodyColor: '#fff',
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
                        color: '#90a4ae',
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
                        color: '#4fc3f7',
                        font: { size: 10 }
                    },
                    title: {
                        display: true,
                        text: 'μSv/h',
                        color: '#4fc3f7'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { 
                        color: '#ff9800',
                        font: { size: 10 }
                    },
                    title: {
                        display: true,
                        text: 'CPM',
                        color: '#ff9800'
                    }
                }
            }
        }
    });
}
