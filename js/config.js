/**
 * 海水辐射值监测平台 - 全局配置
 * 统一管理所有配置常量，便于维护和修改
 */

const CONFIG = {
  // GitHub Gist 配置
  GIST_ID: 'ada469ec18bdbbebf32b356ee3e4564e',
  OWNER: 'xishuai416',
  REPO: 'seawater-radiation',
  API_BASE: 'https://api.github.com',
  // Gist raw 资源地址（不消耗 GitHub API rate limit）
  GIST_RAW_URL: 'https://gist.githubusercontent.com/xishuai416/ada469ec18bdbbebf32b356ee3e4564e/raw/history.json',

  // 数据存储配置
  STORAGE_KEY: 'seawater_radiation_data',
  MAX_RECORDS: 100,  // 最多保留100条记录

  // 图表配置
  CHART_MAX_POINTS: 100,  // 图表最多显示100个数据点
  CHART_TENSION: 0.3,    // 曲线平滑度

  // 趋势分析配置
  TREND_HISTORY_COUNT: 5,  // 用于趋势分析的最近记录数
  TREND_THRESHOLD: 5,      // 趋势判断阈值（%）

  // 测试数据配置
  TEST_BASE_USV: 0.12,     // 测试数据初始μSv/h值
  TEST_BASE_CPM: 45,       // 测试数据初始CPM值
  TEST_TIME_INTERVAL: 1800000,  // 测试数据时间间隔（30分钟，毫秒）

  // 样式配置
  COLORS: {
    primary: '#4fc3f7',
    secondary: '#0288d1',
    warning: '#ff9800',
    success: '#4caf50',
    danger: '#f44336',
    text: '#fff',
    textMuted: '#90a4ae',
    bgGradient: 'linear-gradient(135deg, #1a3a5c 0%, #0d2137 100%)'
  },

  // 默认登录信息（仅供本地使用）
  DEFAULT_USERNAME: 'admin',
  DEFAULT_PASSWORD: 'radiation2026'
};

// 导出配置（兼容不同环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
