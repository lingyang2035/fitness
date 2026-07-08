// --- State ---
const state = {
    viewMode: 'all',
    weekStart: getMonday(new Date()),
    selectedType: '跑步',
    currentUser: null,
    records: [],
    types: [],
    invites: []
};

// Exercise type → color + emoji mapping
const TYPE_COLORS = {
    '跑步': { accent: '#FF6B35', light: '#FFF3EE' }, '游泳': { accent: '#007AFF', light: '#EEF5FF' },
    '壶铃': { accent: '#AF52DE', light: '#F8F0FF' }, '引体向上': { accent: '#AF52DE', light: '#F8F0FF' },
    '拉伸': { accent: '#30D158', light: '#EEFFF2' }, '瑜伽': { accent: '#30D158', light: '#EEFFF2' },
    '跳绳': { accent: '#FF6B35', light: '#FFF3EE' }, '球类': { accent: '#FF3750', light: '#FFEEED' },
};
const TYPE_EMOJI = {
    '跑步':'🏃','游泳':'🏊','壶铃':'🏋️','引体向上':'💪','拉伸':'🧘','瑜伽':'🧘','跳绳':'🪢','球类':'⚽',
};
const FALLBACK = [
    {accent:'#FF6B35',light:'#FFF3EE'},{accent:'#007AFF',light:'#EEF5FF'},{accent:'#AF52DE',light:'#F8F0FF'},
    {accent:'#30D158',light:'#EEFFF2'},{accent:'#FF3750',light:'#FFEEED'},
];
const EMOJI_FB = ['🏃','🏊','🏋️','🧘','🪢','⚽','🚴','💪'];
function getTypeColor(n) {
    if (TYPE_COLORS[n]) return TYPE_COLORS[n];
    let h=0;for(let i=0;i<n.length;i++){h=((h<<5)-h)+n.charCodeAt(i);h|=0;}
    return FALLBACK[Math.abs(h)%FALLBACK.length];
}
function getTypeEmoji(n) {
    if (TYPE_EMOJI[n]) return TYPE_EMOJI[n];
    let h=0;for(let i=0;i<n.length;i++){h=((h<<5)-h)+n.charCodeAt(i);h|=0;}
    return EMOJI_FB[Math.abs(h)%EMOJI_FB.length];
}

function getUnitMap() {
    const map = {};
    state.types.forEach(t => { map[t.name] = t.unit; });
    return map;
}
function isCountType(typeName) {
    const m = getUnitMap();
    return m[typeName] === 'count';
}

function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function formatWeekRange(mondayStr) {
    const monday = new Date(mondayStr + 'T00:00:00');
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const fmt = d => `${d.getMonth() + 1}.${d.getDate()}`;
    const now = new Date();
    const thisMon = new Date(getMonday(now) + 'T00:00:00');
    const lastMon = new Date(thisMon);
    lastMon.setDate(lastMon.getDate() - 7);

    if (monday.getTime() === thisMon.getTime()) return `本周 (${fmt(monday)} - ${fmt(sunday)})`;
    if (monday.getTime() === lastMon.getTime()) return `上周 (${fmt(monday)} - ${fmt(sunday)})`;
    return `${fmt(monday)} - ${fmt(sunday)}`;
}

// --- Init ---
window.onload = async function() {
    try {
        state.currentUser = await API.getMe();
    } catch (e) {
        window.location.href = window.APP_PREFIX + '/login';
        return;
    }

    if (state.currentUser.role === 'admin') {
        const adminBtn = document.getElementById('admin-btn');
        if (adminBtn) adminBtn.classList.remove('hidden');
    }

    updateUserBadge();
    lucide.createIcons();

    try {
        const typesRes = await API.getTypes();
        state.types = typesRes.types || [];
        state.selectedType = state.types[0]?.name || '跑步';
        renderTypeSelector();
    } catch (e) {
        state.types = [
            {name: '跑步', unit: 'km'}, {name: '壶铃', unit: 'count'},
            {name: '拉伸', unit: 'count'}, {name: '跳绳', unit: 'count'},
            {name: '游泳', unit: 'km'}, {name: '引体向上', unit: 'count'}
        ];
        renderTypeSelector();
    }

    await loadRecords();
    updateWeekDisplay();
    lucide.createIcons();
};

function updateUserBadge() {
    if (!state.currentUser) return;
    const badge = document.getElementById('user-badge');
    if (badge) badge.innerHTML = `${state.currentUser.avatar_emoji || '👤'} ${state.currentUser.display_name}`;
}

// --- Type Selector ---
function renderTypeSelector() {
    const container = document.getElementById('type-selector');
    container.innerHTML = state.types.map(t => {
        const c = getTypeColor(t.name);
        const sel = t.name === state.selectedType;
        return `<button onclick="selectType('${t.name}', this)" class="type-btn py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${sel?'shadow-sm ring-2':'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'}" style="${sel?'background:'+c.light+';color:'+c.accent+';--tw-ring-color:'+c.accent:''}">${escapeHtml(t.name)}</button>`;
    }).join('');
}

function selectType(type, btn) {
    state.selectedType = type;
    const c = getTypeColor(type);
    document.querySelectorAll('.type-btn').forEach(b => { b.removeAttribute('style'); b.className='type-btn py-2.5 rounded-xl text-xs font-bold transition-all duration-200 bg-zinc-50 text-zinc-400 hover:bg-zinc-100'; });
    btn.className='type-btn py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shadow-sm ring-2';
    btn.style.cssText='background:'+c.light+';color:'+c.accent+';--tw-ring-color:'+c.accent;

    const typeObj = state.types.find(t => t.name === type);
    const isCount = typeObj ? typeObj.unit === 'count' : isCountType(type);
    document.getElementById('dist-label').innerText = isCount ? '数量 (个)' : '距离 (km)';
    const distInput = document.getElementById('input-dist');
    distInput.value = '0';
    distInput.step = isCount ? '1' : '0.1';
}

// --- Data Loading ---
async function loadRecords() {
    try {
        const params = { week_start: state.weekStart };
        if (state.viewMode === 'me') {
            params.mode = 'me';
        }
        const res = await API.getRecords(params);
        state.records = res.records || [];
        render();
    } catch (e) {
        showToast(e.message);
    }
}

// --- Save Record ---
async function saveRecord() {
    const duration = parseInt(document.getElementById('input-dur').value) || 0;
    const quantity = parseFloat(document.getElementById('input-dist').value) || 0;

    if (duration <= 0) {
        showToast('请输入有效时长');
        return;
    }
    if (quantity <= 0) {
        const label = document.getElementById('dist-label').innerText;
        showToast(label === '数量 (个)' ? '请输入有效数量' : '请输入有效距离');
        return;
    }

    try {
        await API.createRecord({
            exercise_type: state.selectedType,
            duration_minutes: duration,
            quantity: quantity
        });
        toggleModal(false);
        await loadRecords();
        showToast('记录已保存', 'success');
    } catch (e) {
        showToast(e.message);
    }
}

// --- Delete Record ---
async function deleteRecord(id) {
    if (!confirm('确定删除这条记录吗？')) return;
    try {
        await API.deleteRecord(id);
        await loadRecords();
        showToast('已删除', 'success');
    } catch (e) {
        showToast(e.message);
    }
}

// --- Render ---
function render() {
    if (state.viewMode === 'stats') {
        renderStats();
    } else {
        renderRecords();
    }
    updateWeekDisplay();
    lucide.createIcons();
}

function updateWeekDisplay() {
    const currentMonday = getMonday(new Date());
    const weekDisplay = document.getElementById('week-display');
    if (weekDisplay) {
        weekDisplay.innerText = formatWeekRange(state.weekStart);
    }
    const btn = document.getElementById('btn-current-week');
    if (!btn) return;
    if (state.weekStart !== currentMonday) {
        btn.classList.remove('hidden');
    } else {
        btn.classList.add('hidden');
    }
}

function goToCurrentWeek() {
    const currentMonday = getMonday(new Date());
    if (state.weekStart !== currentMonday) {
        state.weekStart = currentMonday;
        loadRecords();
    }
}

function renderRecords() {
    document.getElementById('summary-cards').classList.remove('hidden');

    let display = state.records;
    if (state.viewMode === 'me') {
        display = state.records.filter(r => r.user_id === state.currentUser.id);
    }

    const totalDuration = display.reduce((s, r) => s + r.duration_minutes, 0);
    const totalDist = display
        .filter(r => !isCountType(r.exercise_type))
        .reduce((s, r) => s + r.quantity, 0);

    document.getElementById('stat-time').innerHTML = totalDuration + '<span class="text-sm font-medium text-zinc-400 ml-0.5">min</span>';
    document.getElementById('stat-dist').innerHTML = totalDist.toFixed(1) + '<span class="text-sm font-medium text-zinc-400 ml-0.5">km</span>';

    const list = document.getElementById('record-list');
    if (display.length === 0) {
        list.innerHTML = `
            <div class="text-center py-12">
                <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <i data-lucide="activity" class="w-8 h-8 text-zinc-300"></i>
                </div>
                <p class="text-sm text-zinc-400 font-medium">暂无记录</p>
                <p class="text-xs text-zinc-300 mt-1">开始运动吧！</p>
            </div>`;
        return;
    }

    const unitMap = getUnitMap();

    list.innerHTML = display.map(r => {
        const unit = unitMap[r.exercise_type] === 'count' ? '个' : 'km';
        const isOwn = r.user_id === state.currentUser?.id;
        const tc = getTypeColor(r.exercise_type);
        return `
            <div class="mb-3 bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-50 hover:shadow-md transition-shadow">
                <div class="flex">
                    <div class="w-1 flex-shrink-0 rounded-l-2xl" style="background:${tc.accent}"></div>
                    <div class="flex-1 p-4 flex items-center justify-between">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0" style="background:${tc.light};color:${tc.accent}">
                                ${escapeHtml((r.user_display_name || '?')[0])}
                            </div>
                            <div class="min-w-0">
                                <div class="text-sm font-bold text-zinc-800 truncate">${getTypeEmoji(r.exercise_type)} ${escapeHtml(r.exercise_type)}</div>
                                <div class="text-xs text-zinc-400 truncate">
                                    ${escapeHtml(r.user_display_name)} · ${r.recorded_at ? r.recorded_at.slice(11, 16) : ''}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0 ml-2">
                            <div class="text-right">
                                <div class="text-sm font-bold text-zinc-800 whitespace-nowrap">${r.duration_minutes} min</div>
                                <div class="text-xs text-zinc-400 whitespace-nowrap">${r.quantity} ${unit}</div>
                            </div>
                            ${isOwn || state.currentUser?.role === 'admin' ? `
                                <button onclick="deleteRecord(${r.id})" class="p-1.5 text-zinc-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderStats() {
    document.getElementById('summary-cards').classList.add('hidden');

    const stats = {};
    state.records.forEach(r => {
        if (!stats[r.user_id]) {
            stats[r.user_id] = {
                user_id: r.user_id,
                display_name: r.user_display_name,
                total_duration: 0,
                records: []
            };
        }
        stats[r.user_id].total_duration += r.duration_minutes;
        stats[r.user_id].records.push(r);
    });

    const sorted = Object.values(stats).sort((a, b) => b.total_duration - a.total_duration);

    const list = document.getElementById('record-list');
    if (sorted.length === 0) {
        list.innerHTML = `
            <div class="text-center py-12">
                <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <i data-lucide="bar-chart-3" class="w-8 h-8 text-zinc-300"></i>
                </div>
                <p class="text-sm text-zinc-400 font-medium">本周暂无数据</p>
            </div>`;
        return;
    }

    list.innerHTML = `
        <h3 class="text-sm font-bold text-zinc-400 mb-3 px-1">📊 成员运动统计</h3>
    ` + sorted.map((s, idx) => {
        const unitMap = getUnitMap();

        const typeBreakdown = {};
        s.records.forEach(r => {
            if (!typeBreakdown[r.exercise_type]) typeBreakdown[r.exercise_type] = { count: 0, duration: 0, quantity: 0 };
            typeBreakdown[r.exercise_type].count++;
            typeBreakdown[r.exercise_type].duration += r.duration_minutes;
            typeBreakdown[r.exercise_type].quantity += r.quantity;
        });

        const breakdownHtml = Object.entries(typeBreakdown).map(([type, data]) => {
            const unit = unitMap[type] === 'count' ? '个' : 'km';
            const tc = getTypeColor(type);
            return `
                <div class="flex justify-between items-center text-xs py-1.5 px-3 -mx-3 rounded-lg hover:bg-zinc-50">
                    <span class="font-medium inline-flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${tc.accent}"></span>
                        ${getTypeEmoji(type)} ${escapeHtml(type)}
                    </span>
                    <span class="text-zinc-500">${data.duration}min · ${data.quantity}${unit} · ${data.count}次</span>
                </div>
            `;
        }).join('');

        return `
            <div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-50 mb-3">
                <div class="flex items-center gap-4 p-5 pb-3">
                    <div class="w-11 h-11 rounded-full flex items-center justify-center font-bold flex-shrink-0 bg-zinc-100 text-zinc-400">
                        ${escapeHtml(s.display_name[0])}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-zinc-800 text-sm">${escapeHtml(s.display_name)}</div>
                        <div class="text-xs text-zinc-400">${s.records.length} 次记录</div>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <div class="text-xs text-zinc-400">总时长</div>
                        <div class="font-bold text-lg text-zinc-800">${s.total_duration} <span class="text-xs text-zinc-400 font-normal">min</span></div>
                    </div>
                </div>
                ${breakdownHtml ? `<div class="px-5 pb-4 space-y-0.5">${breakdownHtml}</div>` : ''}
            </div>
        `;
    }).join('');
}

// --- View Mode ---
function setViewMode(mode) {
    state.viewMode = mode;
    ['all', 'me', 'stats'].forEach(m => {
        const btn = document.getElementById('btn-' + m);
        if (m === mode) {
            btn.className = 'flex-1 py-2.5 rounded-xl text-xs font-bold shadow-sm bg-zinc-900 text-white transition-all';
        } else {
            btn.className = 'flex-1 py-2.5 rounded-xl text-xs font-bold text-zinc-400 transition-all';
        }
    });
    loadRecords();
}

// --- Week Navigation ---
function changeWeek(days) {
    const d = new Date(state.weekStart + 'T00:00:00');
    d.setDate(d.getDate() + days);
    state.weekStart = getMonday(d);
    loadRecords();
}

// --- Modal ---
function toggleModal(show) {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modal-content');

    if (state.types.length > 0) {
        state.selectedType = state.types[0].name;
        renderTypeSelector();
        const typeObj = state.types[0];
        const isCount = typeObj ? typeObj.unit === 'count' : false;
        document.getElementById('dist-label').innerText = isCount ? '数量 (个)' : '距离 (km)';
        document.getElementById('input-dur').value = '0';
        const distInput = document.getElementById('input-dist');
        distInput.value = '0';
        distInput.step = isCount ? '1' : '0.1';
    }

    if (show) {
        modal.classList.remove('pointer-events-none', 'opacity-0');
        modal.classList.add('opacity-100');
        content.classList.remove('translate-y-full');
        content.classList.add('translate-y-0');
    } else {
        modal.classList.remove('opacity-100');
        modal.classList.add('opacity-0');
        content.classList.add('translate-y-full');
        setTimeout(() => modal.classList.add('pointer-events-none'), 300);
    }
}

// --- Invite ---
async function showInviteModal() {
    const modal = document.getElementById('invite-modal');
    const content = document.getElementById('invite-modal-content');
    modal.classList.remove('pointer-events-none', 'opacity-0');
    modal.classList.add('opacity-100');
    content.classList.remove('translate-y-full');

    try {
        const res = await API.getInviteTokens();
        state.invites = res.invites || [];
        renderInviteList();
    } catch (e) { /* ignore */ }
}

function closeInviteModal() {
    const modal = document.getElementById('invite-modal');
    const content = document.getElementById('invite-modal-content');
    modal.classList.add('opacity-0');
    modal.classList.remove('opacity-100');
    content.classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('pointer-events-none'), 300);
}

async function generateInvite() {
    const btn = document.getElementById('gen-invite-btn');
    btn.disabled = true;
    btn.textContent = '生成中...';
    try {
        const res = await API.createInviteToken({ max_uses: 5 });
        const url = window.location.origin + window.APP_PREFIX + '/join?token=' + res.token;
        document.getElementById('invite-url-text').textContent = url;
        document.getElementById('invite-url-box').classList.remove('hidden');
        state.invites.unshift(res);
        renderInviteList();
    } catch (e) {
        showToast(e.message);
    }
    btn.disabled = false;
    btn.textContent = '生成邀请链接';
}

function copyInviteUrl() {
    const text = document.getElementById('invite-url-text').textContent;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast('已复制到剪贴板', 'success'));
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('已复制到剪贴板', 'success');
    }
}

function renderInviteList() {
    const list = document.getElementById('invite-list');
    if (state.invites.length === 0) {
        list.innerHTML = '<p class="text-xs text-zinc-400 text-center py-2">暂无邀请记录</p>';
        return;
    }
    list.innerHTML = '<p class="text-xs text-zinc-400 mb-2">历史邀请</p>' + state.invites.slice(0, 5).map(inv => {
        const status = inv.is_used ? '✅ 已用' : '⏳ 有效';
        const color = inv.is_used ? 'text-zinc-400' : 'text-green-600';
        return `
            <div class="flex justify-between items-center py-2 border-b border-zinc-50 text-xs">
                <span class="text-zinc-600 font-mono">${(inv.token || '').slice(0, 8)}...</span>
                <span class="${color}">${status}</span>
                ${!inv.is_used ? `<button onclick="revokeInvite(${inv.id})" class="text-red-400 hover:text-red-600">撤销</button>` : ''}
            </div>
        `;
    }).join('');
}

async function revokeInvite(id) {
    try {
        await API.revokeInviteToken(id);
        state.invites = state.invites.filter(i => i.id !== id);
        renderInviteList();
        showToast('已撤销', 'success');
    } catch (e) {
        showToast(e.message);
    }
}

function shareApp() {
    const url = window.location.origin + window.APP_PREFIX + '/login';
    if (navigator.share) {
        navigator.share({
            title: window.APP_NAME,
            text: '来和我们一起记录运动吧！',
            url: url
        }).catch(() => {});
    } else {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => showToast('链接已复制，可分享到微信', 'success'));
        } else {
            showToast('分享链接：' + url, 'success');
        }
    }
}

// --- Logout ---
async function handleLogout() {
    try {
        await API.logout();
    } catch (e) { /* ignore */ }
    window.location.href = window.APP_PREFIX + '/login';
}
