const API = {
    BASE: window.APP_PREFIX || '',

    async request(method, path, body = null) {
        const opts = {
            method,
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(this.BASE + path, opts);
        if (!res.ok) {
            let errMsg = `请求失败 (${res.status})`;
            try {
                const err = await res.json();
                errMsg = err.error || errMsg;
            } catch (e) { /* ignore */ }
            throw new Error(errMsg);
        }
        return res.json();
    },

    // Auth
    login: (data) => API.request('POST', '/api/auth/login', data),
    register: (data) => API.request('POST', '/api/auth/register', data),
    logout: () => API.request('POST', '/api/auth/logout'),
    getMe: () => API.request('GET', '/api/auth/me'),

    // Records
    getRecords: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return API.request('GET', '/api/records' + (qs ? '?' + qs : ''));
    },
    createRecord: (data) => API.request('POST', '/api/records', data),
    deleteRecord: (id) => API.request('DELETE', `/api/records/${id}`),

    // Stats
    getStats: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return API.request('GET', '/api/stats' + (qs ? '?' + qs : ''));
    },

    // Types
    getTypes: () => API.request('GET', '/api/types'),

    // Invites
    createInviteToken: (data) => API.request('POST', '/api/invite', data),
    getInviteTokens: () => API.request('GET', '/api/invite'),
    revokeInviteToken: (id) => API.request('DELETE', `/api/invite/${id}`),

    // Admin
    getDashboard: () => API.request('GET', '/api/admin/dashboard'),
    getAdminUsers: () => API.request('GET', '/api/admin/users'),
    createUser: (data) => API.request('POST', '/api/admin/users', data),
    updateUser: (id, data) => API.request('PUT', `/api/admin/users/${id}`, data),
    deactivateUser: (id) => API.request('DELETE', `/api/admin/users/${id}`),
    getAdminRecords: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return API.request('GET', '/api/admin/records' + (qs ? '?' + qs : ''));
    },
    deleteAdminRecord: (id) => API.request('DELETE', `/api/admin/records/${id}`),
    getAdminLogs: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return API.request('GET', '/api/admin/logs' + (qs ? '?' + qs : ''));
    },
    getAdminInvites: () => API.request('GET', '/api/admin/invites'),
    revokeAdminInvite: (id) => API.request('DELETE', `/api/admin/invites/${id}`),
    getAdminTypes: () => API.request('GET', '/api/admin/types'),
    saveType: (data) => API.request('POST', '/api/admin/types', data),
};
