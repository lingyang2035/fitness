let currentTab = 'dashboard';

window.onload = async function() {
    try {
        const user = await API.getMe();
        if (user.role !== 'admin') {
            window.location.href = window.APP_PREFIX + '/app';
            return;
        }
        document.getElementById('user-info').textContent = `${user.avatar_emoji || ''} ${user.display_name}`;
    } catch (e) {
        window.location.href = window.APP_PREFIX + '/login';
        return;
    }
    switchTab('dashboard');
    lucide.createIcons();
};

function switchTab(tab) {
    currentTab = tab;
    ['dashboard', 'users', 'records', 'logs', 'invites'].forEach(t => {
        const btn = document.getElementById('tab-' + t);
        if (t === tab) {
            btn.className = 'flex-1 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white transition-all';
        } else {
            btn.className = 'flex-1 py-2 rounded-xl text-xs font-semibold text-slate-500 transition-all';
        }
    });
    loadTabContent();
}

async function loadTabContent() {
    const area = document.getElementById('content-area');
    area.innerHTML = '<p class="text-center text-slate-400 py-8">加载中...</p>';

    try {
        switch (currentTab) {
            case 'dashboard': await renderDashboard(area); break;
            case 'users': await renderUsers(area); break;
            case 'records': await renderRecords(area); break;
            case 'logs': await renderLogs(area); break;
            case 'invites': await renderInvites(area); break;
        }
    } catch (e) {
        area.innerHTML = `<p class="text-center text-red-400 py-8">加载失败: ${e.message}</p>`;
    }
    lucide.createIcons();
}

// --- Dashboard ---
async function renderDashboard(area) {
    const data = await API.getDashboard();
    area.innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-teal-50 p-4 rounded-2xl">
                <div class="text-xs text-teal-400 mb-1">用户总数</div>
                <div class="text-2xl font-bold text-teal-700">${data.total_users}</div>
            </div>
            <div class="bg-green-50 p-4 rounded-2xl">
                <div class="text-xs text-green-400 mb-1">本周记录</div>
                <div class="text-2xl font-bold text-green-700">${data.records_this_week}</div>
            </div>
            <div class="bg-amber-50 p-4 rounded-2xl">
                <div class="text-xs text-amber-400 mb-1">总记录数</div>
                <div class="text-2xl font-bold text-amber-700">${data.total_records}</div>
            </div>
            <div class="bg-purple-50 p-4 rounded-2xl">
                <div class="text-xs text-purple-400 mb-1">邀请次数</div>
                <div class="text-2xl font-bold text-purple-700">${data.total_invites}</div>
            </div>
        </div>
        <div class="space-y-2">
            <button onclick="switchTab('users')" class="w-full text-left p-3 bg-slate-50 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">👥 管理用户 →</button>
            <button onclick="switchTab('logs')" class="w-full text-left p-3 bg-slate-50 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">📋 查看日志 →</button>
            <button onclick="switchTab('invites')" class="w-full text-left p-3 bg-slate-50 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">🔗 管理邀请 →</button>
        </div>
    `;
}

// --- Users ---
async function renderUsers(area) {
    const res = await API.getAdminUsers();
    const users = res.users || [];

    area.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-slate-800">用户列表 (${users.length})</h3>
            <button onclick="openUserModal()" class="bg-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors">+ 添加用户</button>
        </div>
        <div class="space-y-2">
            ${users.map(u => `
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${u.role === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-teal-100 text-teal-600'}">
                            ${u.display_name[0]}
                        </div>
                        <div>
                            <div class="text-sm font-bold text-slate-800">
                                ${u.display_name}
                                ${u.role === 'admin' ? '<span class="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full ml-1">管理</span>' : ''}
                                ${!u.is_active ? '<span class="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full ml-1">已停用</span>' : ''}
                            </div>
                            <div class="text-xs text-slate-400">@${u.username} · ${u.last_login ? '最近登录: ' + u.last_login.slice(0, 10) : '从未登录'}</div>
                        </div>
                    </div>
                    <div class="flex gap-1">
                        <button onclick="openUserModal(${u.id})" class="p-2 text-slate-400 hover:text-teal-600">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        ${!u.is_active ? `
                            <button onclick="toggleUserActive(${u.id}, 1)" class="p-2 text-slate-400 hover:text-green-600">
                                <i data-lucide="user-check" class="w-4 h-4"></i>
                            </button>
                        ` : `
                            <button onclick="toggleUserActive(${u.id}, 0)" class="p-2 text-slate-400 hover:text-red-400">
                                <i data-lucide="user-x" class="w-4 h-4"></i>
                            </button>
                        `}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function toggleUserActive(id, isActive) {
    if (!confirm(isActive ? '确定重新激活此用户？' : '确定停用此用户？')) return;
    try {
        await API.updateUser(id, { is_active: isActive });
        loadTabContent();
        showToast(isActive ? '用户已激活' : '用户已停用', 'success');
    } catch (e) {
        showToast(e.message);
    }
}

let editingUserId = null;
async function openUserModal(userId = null) {
    editingUserId = userId;
    const modal = document.getElementById('user-modal');
    modal.classList.remove('hidden');

    if (userId) {
        document.getElementById('user-modal-title').textContent = '编辑用户';
        const res = await API.getAdminUsers();
        const user = (res.users || []).find(u => u.id === userId);
        if (user) {
            document.getElementById('edit-user-id').value = user.id;
            document.getElementById('edit-username').value = user.username;
            document.getElementById('edit-display-name').value = user.display_name;
            document.getElementById('edit-role').value = user.role;
            document.getElementById('edit-active').checked = !!user.is_active;
            document.getElementById('edit-password').value = '';
        }
    } else {
        document.getElementById('user-modal-title').textContent = '添加用户';
        document.getElementById('edit-user-id').value = '';
        document.getElementById('edit-username').value = '';
        document.getElementById('edit-display-name').value = '';
        document.getElementById('edit-role').value = 'member';
        document.getElementById('edit-active').checked = true;
        document.getElementById('edit-password').value = '';
    }
}

function closeUserModal() {
    document.getElementById('user-modal').classList.add('hidden');
}

async function submitUserForm(e) {
    e.preventDefault();
    const id = document.getElementById('edit-user-id').value;
    const username = document.getElementById('edit-username').value.trim();
    const displayName = document.getElementById('edit-display-name').value.trim();
    const role = document.getElementById('edit-role').value;
    const isActive = document.getElementById('edit-active').checked ? 1 : 0;
    const password = document.getElementById('edit-password').value;

    try {
        if (id) {
            const data = { display_name: displayName, role, is_active: isActive };
            if (password) data.new_password = password;
            await API.updateUser(parseInt(id), data);
            showToast('用户已更新', 'success');
        } else {
            if (!password || password.length < 4) {
                showToast('密码至少4位');
                return;
            }
            await API.createUser({ username, password, display_name: displayName, role });
            showToast('用户已创建', 'success');
        }
        closeUserModal();
        loadTabContent();
    } catch (e) {
        showToast(e.message);
    }
}

// --- Records ---
async function renderRecords(area) {
    const res = await API.getAdminRecords({ limit: 100 });
    const records = res.records || [];

    area.innerHTML = `
        <h3 class="font-bold text-slate-800 mb-3">全部运动记录 (${records.length})</h3>
        <div class="space-y-2 max-h-[500px] overflow-y-auto">
            ${records.length === 0 ? '<p class="text-center text-slate-400 py-4 text-sm">暂无记录</p>' : records.map(r => `
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center font-bold text-xs">
                            ${(r.user_display_name || '?')[0]}
                        </div>
                        <div>
                            <div class="text-sm font-bold text-slate-800">${r.exercise_type} · ${r.duration_minutes}min</div>
                            <div class="text-xs text-slate-400">${r.user_display_name} · ${r.recorded_at ? r.recorded_at.slice(0, 16) : ''}</div>
                        </div>
                    </div>
                    <button onclick="deleteAdminRecord(${r.id})" class="p-2 text-slate-300 hover:text-red-400">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

async function deleteAdminRecord(id) {
    if (!confirm('确定删除此记录？')) return;
    try {
        await API.deleteAdminRecord(id);
        loadTabContent();
        showToast('已删除', 'success');
    } catch (e) {
        showToast(e.message);
    }
}

// --- Logs ---
let logsPage = 1;
async function renderLogs(area) {
    const res = await API.getAdminLogs({ page: logsPage, per_page: 20 });
    const logs = res.logs || [];
    const pag = res.pagination || {};

    area.innerHTML = `
        <div class="flex justify-between items-center mb-3">
            <h3 class="font-bold text-slate-800">访问日志 (${pag.total || 0})</h3>
        </div>
        <div class="space-y-1 max-h-[500px] overflow-y-auto mb-4">
            ${logs.length === 0 ? '<p class="text-center text-slate-400 py-4 text-sm">暂无日志</p>' : logs.map(l => `
                <div class="p-2 bg-slate-50 rounded-lg text-xs">
                    <div class="flex justify-between">
                        <span class="font-medium text-slate-700">${l.action}</span>
                        <span class="text-slate-400">${l.created_at ? l.created_at.slice(0, 19) : ''}</span>
                    </div>
                    <div class="text-slate-400 mt-0.5">
                        ${l.user_display_name || '匿名'} · ${l.ip_address || '-'}
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="flex justify-between items-center">
            <button onclick="logsPage=Math.max(1,logsPage-1);loadTabContent()" ${logsPage <= 1 ? 'disabled' : ''}
                    class="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium disabled:opacity-30">上一页</button>
            <span class="text-xs text-slate-400">${pag.page} / ${pag.total_pages || 1}</span>
            <button onclick="logsPage++;loadTabContent()" ${logsPage >= pag.total_pages ? 'disabled' : ''}
                    class="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium disabled:opacity-30">下一页</button>
        </div>
    `;
}

// --- Invites ---
async function renderInvites(area) {
    const res = await API.getAdminInvites();
    const invites = res.invites || [];

    area.innerHTML = `
        <div class="flex justify-between items-center mb-3">
            <h3 class="font-bold text-slate-800">邀请令牌</h3>
            <button onclick="generateAdminInvite()" class="bg-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors">+ 生成新邀请</button>
        </div>
        <div id="admin-invite-url-box" class="hidden bg-teal-50 p-4 rounded-xl mb-4">
            <p class="text-xs text-teal-400 mb-1">新邀请链接</p>
            <p class="text-sm font-mono text-teal-700 break-all" id="admin-invite-url-text"></p>
            <button onclick="copyAdminInviteUrl()" class="mt-2 w-full bg-teal-600 text-white py-2 rounded-xl font-bold text-xs hover:bg-teal-700 transition-colors">复制链接</button>
        </div>
        <div class="space-y-2">
            ${invites.length === 0 ? '<p class="text-center text-slate-400 py-4 text-sm">暂无邀请</p>' : invites.map(inv => {
                const status = inv.is_used ? '已用' : (inv.expires_at && inv.expires_at < new Date().toISOString() ? '已过期' : '有效');
                const color = status === '有效' ? 'text-green-600' : 'text-slate-400';
                return `
                    <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div>
                            <div class="text-sm font-mono text-slate-700">${inv.token.slice(0, 12)}...</div>
                            <div class="text-xs text-slate-400">创建者: ${inv.creator_name || 'N/A'} · <span class="${color}">${status}</span></div>
                        </div>
                        ${!inv.is_used ? `<button onclick="revokeAdminInvite(${inv.id})" class="text-xs text-red-400 hover:text-red-600 font-medium">撤销</button>` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

async function generateAdminInvite() {
    try {
        const res = await API.createInviteToken({ max_uses: 10, expires_in_days: 30 });
        const url = window.location.origin + window.APP_PREFIX + '/join?token=' + res.token;
        document.getElementById('admin-invite-url-text').textContent = url;
        document.getElementById('admin-invite-url-box').classList.remove('hidden');
        loadTabContent();
    } catch (e) {
        showToast(e.message);
    }
}

function copyAdminInviteUrl() {
    const text = document.getElementById('admin-invite-url-text').textContent;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast('已复制', 'success'));
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('已复制', 'success');
    }
}

async function revokeAdminInvite(id) {
    if (!confirm('确定撤销此邀请？')) return;
    try {
        await API.revokeAdminInvite(id);
        loadTabContent();
        showToast('已撤销', 'success');
    } catch (e) {
        showToast(e.message);
    }
}
