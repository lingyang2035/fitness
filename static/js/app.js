// --- Confirm Dialog ---
function showConfirm(msg) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('confirm-dialog');
        document.getElementById('confirm-msg').innerText = msg;
        const ok = document.getElementById('confirm-ok');
        const cancel = document.getElementById('confirm-cancel');
        const cleanup = () => {
            overlay.classList.remove('active');
            ok.removeEventListener('click', onOk);
            cancel.removeEventListener('click', onCancel);
        };
        const onOk = () => { cleanup(); resolve(true); };
        const onCancel = () => { cleanup(); resolve(false); };
        ok.addEventListener('click', onOk);
        cancel.addEventListener('click', onCancel);
        overlay.classList.add('active');
    });
}

// --- State ---
const state = {
    viewMode: 'all',
    weekStart: getMonday(new Date()),
    selectedType: '跑步',
    selectedDurationMin: 0,
    selectedCount: 0,
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
    '吊单杠': { accent: '#30D158', light: '#EEFFF2' }, '靠墙站立': { accent: '#AF52DE', light: '#F8F0FF' },
    '徒步': { accent: '#FF9F43', light: '#FFF5ED' }, '走路': { accent: '#30D158', light: '#EEFFF2' },
    '爬山': { accent: '#8B5CF6', light: '#F5F0FF' },
    '羽毛球': { accent: '#FF3750', light: '#FFEEED' }, '骑车': { accent: '#007AFF', light: '#EEF5FF' },
};
const TYPE_EMOJI = {
    '跑步':'🏃','游泳':'🏊','壶铃':'🏋️','引体向上':'💪','拉伸':'🧘','瑜伽':'🧘','跳绳':'🪢','球类':'⚽',
    '吊单杠':'🤸','靠墙站立':'🧍','徒步':'🥾','走路':'🚶','爬山':'⛰️',
    '羽毛球':'🏸','骑车':'🚴',
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
function isTimeOnlyType(typeName) {
    const m = getUnitMap();
    return m[typeName] === 'none';
}
function getUnitLabel(typeName, unitType) {
    if (typeName === '吊单杠' || typeName === '拉伸') return '组';
    if (typeName === '爬山' || typeName === '游泳') return '米';
    return unitType === 'count' ? '个' : 'km';
}
function getQuantityLabel(typeName, isCount) {
    if (typeName === '爬山') return '海拔';
    if (typeName === '吊单杠' || typeName === '拉伸') return '组数';
    return isCount ? '数量' : '距离';
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
    initPickers();

    try {
        const typesRes = await API.getTypes();
        state.types = typesRes.types || [];
        state.selectedType = state.types[0]?.name || '跑步';
        renderTypeGrid();
    } catch (e) {
        state.types = [
            {name: '跑步', unit: 'km'}, {name: '壶铃', unit: 'none'},
            {name: '拉伸', unit: 'count'}, {name: '跳绳', unit: 'count'},
            {name: '游泳', unit: 'm'}, {name: '引体向上', unit: 'count'},
            {name: '吊单杠', unit: 'count'}, {name: '靠墙站立', unit: 'count'},
            {name: '徒步', unit: 'km'}, {name: '走路', unit: 'km'},
            {name: '爬山', unit: 'm'},
            {name: '羽毛球', unit: 'none'}, {name: '骑车', unit: 'km'},
        ];
        renderTypeGrid();
    }

    // lucide.createIcons() already called by render() → no need to re-scan here
    await loadRecords();
    updateWeekDisplay();
};

function updateUserBadge() {
    if (!state.currentUser) return;
    const badge = document.getElementById('user-badge');
    if (badge) badge.innerHTML = `${state.currentUser.avatar_emoji || '👤'} ${escapeHtml(state.currentUser.display_name)}`;
}

// --- Type Grid (side panel) ---
function renderTypeGrid() {
    const container = document.getElementById('type-grid');
    if (!container) return;
    container.innerHTML = state.types.map(t => {
        const emoji = getTypeEmoji(t.name);
        const sel = t.name === state.selectedType;
        const safeName = t.name.replace(/'/g, "&#39;");
        return `
            <div data-type="${safeName}" onclick="selectType(this.dataset.type)" class="flex flex-col items-center gap-2 cursor-pointer group">
                <div class="w-14 h-14 ${sel ? 'bg-indigo-50 text-indigo-600' : 'bg-zinc-50 text-zinc-700'} rounded-2xl flex items-center justify-center text-2xl shadow-sm group-active:scale-95 transition-transform">${emoji}</div>
                <span class="text-xs text-zinc-700 font-semibold">${escapeHtml(t.name)}</span>
            </div>
        `;
    }).join('');
}

function selectType(type) {
    state.selectedType = type;
    const emoji = getTypeEmoji(type);

    // Update main modal display
    document.getElementById('val-type').innerText = type;
    document.getElementById('form-big-icon').innerText = emoji;

    // Update count/distance label and value
    const typeObj = state.types.find(t => t.name === type);
    const isCount = typeObj ? typeObj.unit === 'count' : isCountType(type);
    const isTimeOnly = typeObj ? typeObj.unit === 'none' : isTimeOnlyType(type);
    const countRow = document.getElementById('count-row');
    if (isTimeOnly) {
        countRow.style.display = 'none';
    } else {
        countRow.style.display = '';
        const unit = getUnitLabel(type, isCount ? 'count' : 'km');
        document.getElementById('label-count').innerText = `${getQuantityLabel(type, isCount)} (${unit})`;
    }

    // Reset count value and update unit display
    state.selectedCount = 0;
    document.getElementById('val-count').innerText = `0 ${getUnitLabel(type, isCount ? 'count' : 'km')}`;

    // Re-render type grid
    renderTypeGrid();
    closeTypePanel();
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
    const duration = state.selectedDurationMin;
    const quantity = state.selectedCount;

    if (duration <= 0) {
        showToast('请输入有效时长');
        return;
    }
    const typeObj = state.types.find(t => t.name === state.selectedType);
    const isTimeOnly = typeObj ? typeObj.unit === 'none' : isTimeOnlyType(state.selectedType);
    if (!isTimeOnly && quantity <= 0) {
        const isCount = typeObj ? typeObj.unit === 'count' : isCountType(state.selectedType);
        showToast(`请输入有效${getQuantityLabel(state.selectedType, isCount)}`);
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
async function deleteRecord(id, btn) {
    if (!(await showConfirm('确定删除这条记录吗？'))) { btn.blur(); return; }
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

    let totalDuration = 0, totalDist = 0;
    for (const r of display) {
        totalDuration += r.duration_minutes;
        if (!isCountType(r.exercise_type) && !isTimeOnlyType(r.exercise_type) && r.exercise_type !== '爬山') totalDist += r.exercise_type === '游泳' ? r.quantity / 1000 : r.quantity;
    }

    document.getElementById('stat-time').innerHTML = totalDuration + '<span class="text-sm font-normal text-zinc-900 ml-0.5">min</span>';
    document.getElementById('stat-dist').innerHTML = totalDist.toFixed(1) + '<span class="text-sm font-normal text-zinc-900 ml-0.5">km</span>';

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
        const unitType = unitMap[r.exercise_type];
        const isTimeOnly = unitType === 'none';
        const unit = getUnitLabel(r.exercise_type, unitType);
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
                                    ${escapeHtml(r.user_display_name)} · ${r.recorded_at ? r.recorded_at.slice(5, 10) + ' ' + r.recorded_at.slice(11, 16) : ''}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0 ml-2">
                            <div class="text-right">
                                <div class="text-sm font-bold text-zinc-800 whitespace-nowrap">${r.duration_minutes} min</div>
                                ${isTimeOnly ? '' : `<div class="text-xs text-zinc-400 whitespace-nowrap">${r.quantity} ${unit}</div>`}
                            </div>
                            ${isOwn || state.currentUser?.role === 'admin' ? `
                                <button onclick="deleteRecord(${r.id}, this)" class="p-1.5 text-zinc-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
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

    const unitMap = getUnitMap();

    list.innerHTML = `
        <h3 class="text-sm font-bold text-zinc-400 mb-3 px-1">📊 成员运动统计</h3>
    ` + sorted.map((s, idx) => {
        const typeBreakdown = {};
        s.records.forEach(r => {
            if (!typeBreakdown[r.exercise_type]) typeBreakdown[r.exercise_type] = { count: 0, duration: 0, quantity: 0 };
            typeBreakdown[r.exercise_type].count++;
            typeBreakdown[r.exercise_type].duration += r.duration_minutes;
            typeBreakdown[r.exercise_type].quantity += r.quantity;
        });

        const breakdownHtml = Object.entries(typeBreakdown).map(([type, data]) => {
            const unitType = unitMap[type];
            const isTimeOnly = unitType === 'none';
            const unit = getUnitLabel(type, unitType);
            const tc = getTypeColor(type);
            const stat = isTimeOnly
                ? `${data.duration}min · ${data.count}次`
                : `${data.duration}min · ${Number(data.quantity.toFixed(1))}${unit} · ${data.count}次`;
            return `
                <div class="flex justify-between items-center text-xs py-1.5 px-3 -mx-3 rounded-lg hover:bg-zinc-50">
                    <span class="font-medium inline-flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${tc.accent}"></span>
                        ${getTypeEmoji(type)} ${escapeHtml(type)}
                    </span>
                    <span class="text-indigo-400">${stat}</span>
                </div>
            `;
        }).join('');

        return `
            <div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-50 mb-3">
                <div class="flex items-center gap-4 p-5 pb-3">
                    <div class="w-11 h-11 rounded-full flex items-center justify-center font-bold flex-shrink-0 bg-indigo-50 text-zinc-400">
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
            btn.className = 'flex-1 py-2.5 rounded-xl text-xs font-bold shadow-sm bg-indigo-600 text-white transition-all';
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

    if (show && state.types.length > 0) {
        // Reset form to defaults
        state.selectedType = state.types[0].name;
        state.selectedDurationMin = 0;
        state.selectedCount = 0;

        const typeObj = state.types[0];
        const isCount = typeObj ? typeObj.unit === 'count' : false;
        const isTimeOnly = typeObj ? typeObj.unit === 'none' : false;
        const emoji = getTypeEmoji(state.selectedType);

        document.getElementById('val-type').innerText = state.selectedType;
        document.getElementById('form-big-icon').innerText = emoji;
        document.getElementById('val-duration').innerText = '00:00:00';
        const countRow = document.getElementById('count-row');
        if (isTimeOnly) {
            countRow.style.display = 'none';
        } else {
            countRow.style.display = '';
            document.getElementById('label-count').innerText = `${getQuantityLabel(state.selectedType, isCount)} (${getUnitLabel(state.selectedType, isCount ? 'count' : 'km')})`;
        }
        document.getElementById('val-count').innerText = `0 ${getUnitLabel(state.selectedType, isCount ? 'count' : 'km')}`;

        renderTypeGrid();
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

// --- Type Panel ---
function openTypePanel() {
    renderTypeGrid();
    document.getElementById('type-panel').classList.add('active');
}
function closeTypePanel() {
    document.getElementById('type-panel').classList.remove('active');
}

// --- Duration Picker ---
function openDurationModal() {
    document.getElementById('duration-modal').classList.add('active');
    const totalSeconds = state.selectedDurationMin * 60;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    scrollToValue('picker-hour', h);
    scrollToValue('picker-minute', m);
    scrollToValue('picker-second', s);
}
function closeDurationModal() {
    document.getElementById('duration-modal').classList.remove('active');
}
function confirmDuration() {
    const h = parseInt(getPickerValue('picker-hour'));
    const m = parseInt(getPickerValue('picker-minute'));
    const s = parseInt(getPickerValue('picker-second'));
    document.getElementById('val-duration').innerText =
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    state.selectedDurationMin = Math.round((h * 3600 + m * 60 + s) / 60);
    closeDurationModal();
}

// --- Count/Distance Modal ---
function openCountModal() {
    const typeObj = state.types.find(t => t.name === state.selectedType);
    const isTimeOnly = typeObj ? typeObj.unit === 'none' : isTimeOnlyType(state.selectedType);
    if (isTimeOnly) return;
    const isCount = typeObj ? typeObj.unit === 'count' : isCountType(state.selectedType);
    const unit = getUnitLabel(state.selectedType, isCount ? 'count' : 'km');
    const title = (state.selectedType === '吊单杠' || state.selectedType === '拉伸') ? '输入组数' : (state.selectedType === '爬山' ? '输入海拔' : (isCount ? '输入数量' : '输入距离'));
    document.getElementById('count-modal-title').innerText = title;
    document.getElementById('count-modal-unit').innerText = unit;
    document.getElementById('count-input').value = state.selectedCount;
    document.getElementById('count-input').step = isCount ? '1' : '0.1';
    document.getElementById('count-modal').classList.add('active');
}
function closeCountModal() {
    document.getElementById('count-modal').classList.remove('active');
}
function confirmCount() {
    state.selectedCount = parseFloat(document.getElementById('count-input').value || 0);
    const typeObj = state.types.find(t => t.name === state.selectedType);
    const isCount = typeObj ? typeObj.unit === 'count' : isCountType(state.selectedType);
    const unit = getUnitLabel(state.selectedType, isCount ? 'count' : 'km');
    document.getElementById('val-count').innerText = `${state.selectedCount} ${unit}`;
    closeCountModal();
}

// --- iOS Picker Helpers ---
function initPickers() {
    fillPickerHTML('picker-hour', 24);
    fillPickerHTML('picker-minute', 60);
    fillPickerHTML('picker-second', 60);
    // Set initial position to 00:00:00 in the gray bar
    setTimeout(() => {
        scrollToValue('picker-hour', 0);
        scrollToValue('picker-minute', 0);
        scrollToValue('picker-second', 0);
    }, 100);
}
function fillPickerHTML(id, count) {
    const col = document.getElementById(id);
    if (!col) return;
    // Top spacers (no snap — so they don't compete with real items as snap targets)
    let html = '<div style="height:40px;flex-shrink:0"></div><div style="height:40px;flex-shrink:0"></div>';
    for (let i = 0; i < count; i++) {
        const str = i.toString().padStart(2, '0');
        html += `<div class="ios-picker-item text-zinc-700 font-bold text-sm" data-val="${str}">${str}</div>`;
    }
    // Bottom spacers (no snap)
    html += '<div style="height:40px;flex-shrink:0"></div><div style="height:40px;flex-shrink:0"></div>';
    col.innerHTML = html;
}
function scrollToValue(id, val) {
    const col = document.getElementById(id);
    if (!col) return;
    // 2 spacers (80px) + item center (20px) - container center (80px) = item start offset
    // scrollTop = val * 40 places item "val" top at container top, need +20 to center it in the gray bar
    setTimeout(() => { col.scrollTop = val * 40 + 20; }, 100);
}
function getPickerValue(id) {
    const col = document.getElementById(id);
    if (!col) return '00';
    const index = Math.max(0, Math.round((col.scrollTop - 20) / 40));
    const items = col.querySelectorAll('[data-val]');
    if (items[index]) return items[index].getAttribute('data-val');
    return '00';
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
