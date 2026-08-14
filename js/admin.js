// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已连接GitHub
    const savedToken = getAuthToken();
    if (savedToken) {
        // 显示已连接状态，但不自动填充 Token 到输入框（安全考虑）
        validateAndShowTokenStatus(savedToken);
        document.getElementById('token-status-text').textContent = '已连接（session）';
        document.getElementById('token-status').className = 'token-status connected';
        // 自动进入录入页面
        showEntryPanel();
    } else {
        showLoginPanel();
    }
    
    // 设置默认时间
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now - offset).toISOString().slice(0, 16);
    document.getElementById('measure-time').value = localISOTime;
});

// 连接GitHub
async function connectGitHub() {
    const token = document.getElementById('github-token').value.trim();
    const statusEl = document.getElementById('token-status');
    const statusTextEl = document.getElementById('token-status-text');
    
    if (!token) {
        alert('请输入GitHub Token');
        return;
    }
    
    statusTextEl.textContent = '验证中...';
    
    const isValid = await validateToken(token);
    
    if (isValid) {
        // 保存到 sessionStorage（更安全，关闭标签页自动清除）
        saveAuthToken(token);
        statusEl.className = 'token-status connected';
        statusTextEl.textContent = '已连接（session）';
        showEntryPanel();
    } else {
        statusEl.className = 'token-status disconnected';
        statusTextEl.textContent = '连接失败，请检查Token';
        alert('GitHub Token验证失败，请检查后重试');
    }
}

// 验证Token并显示状态
async function validateAndShowTokenStatus(token) {
    const statusEl = document.getElementById('token-status');
    const statusTextEl = document.getElementById('token-status-text');
    
    const isValid = await validateToken(token);
    
    if (isValid) {
        statusEl.className = 'token-status connected';
        statusTextEl.textContent = '已连接（session）';
    } else {
        statusEl.className = 'token-status disconnected';
        statusTextEl.textContent = '连接失效';
    }
}

// 显示登录面板
function showLoginPanel() {
    document.getElementById('login-box').style.display = 'block';
    document.getElementById('entry-box').style.display = 'none';
}

// 显示录入面板
function showEntryPanel() {
    document.getElementById('login-box').style.display = 'none';
    document.getElementById('entry-box').style.display = 'block';
}

// 退出登录
function logout() {
    clearAuthToken();
    showLoginPanel();
    document.getElementById('github-token').value = '';
    document.getElementById('token-status-text').textContent = '未连接';
    document.getElementById('token-status').className = 'token-status disconnected';
}

// 提交数据
async function submitData() {
    const time = document.getElementById('measure-time').value;
    const valueUsv = parseFloat(document.getElementById('value-uSv').value);
    const valueCpm = parseFloat(document.getElementById('value-cpm').value);
    const msgEl = document.getElementById('submit-msg');
    
    // 验证输入
    if (!time) {
        msgEl.textContent = '请选择测量时间';
        msgEl.style.color = '#f44336';
        msgEl.style.display = 'block';
        return;
    }
    
    if (isNaN(valueUsv) && isNaN(valueCpm)) {
        msgEl.textContent = '请至少输入一个辐射值（μSv/h 或 CPM）';
        msgEl.style.color = '#f44336';
        msgEl.style.display = 'block';
        return;
    }
    
    // 构建数据记录
    const record = {
        id: Date.now(),
        time,
        valueUsv: isNaN(valueUsv) ? null : valueUsv,
        valueCpm: isNaN(valueCpm) ? null : valueCpm
    };
    
    // 保存到GitHub
    msgEl.textContent = '正在保存...';
    msgEl.style.color = '#ff9800';
    msgEl.style.display = 'block';
    
    try {
        await RadiationAPI.saveData(record);
        msgEl.textContent = '✅ 数据已同步到GitHub';
        msgEl.style.color = '#4caf50';
    } catch (e) {
        console.error('保存失败:', e);
        // 回退到localStorage
        let history = getHistory();
        history.unshift(record);
        if (history.length > 100) {
            history = history.slice(0, 100);
        }
        localStorage.setItem('seawater_radiation_data', JSON.stringify(history));
        msgEl.textContent = '⚠️ GitHub同步失败，已保存到本地';
        msgEl.style.color = '#ff9800';
    }
    
    // 清空输入
    document.getElementById('value-uSv').value = '';
    document.getElementById('value-cpm').value = '';
    
    // 3秒后跳转回主页
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

// 获取历史记录（本地备份）
function getHistory() {
    const data = localStorage.getItem('seawater_radiation_data');
    return data ? JSON.parse(data) : [];
}
