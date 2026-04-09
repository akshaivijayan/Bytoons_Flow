/**
 * Bytoons Flow - Client-Side API
 */

const PA = {
    // Dynamically calculate API base to support local file execution
    API_BASE: window.location.protocol === 'file:' ? 'http://localhost:5000/api' : '/api',

    // API Request wrapper with professional session handling
    async apiRequest(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': localStorage.getItem('token') || ''
            }
        };

        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${this.API_BASE}${endpoint}`, options);

            // Handle session expiry (Elite logic)
            if (response.status === 401) {
                this.showNotification('Security session expired. Re-authenticating...', 'warning');
                setTimeout(() => this.logout(), 2000);
                throw new Error('Unauthorized access');
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Request failed' }));
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            const text = await response.text();
            return text ? JSON.parse(text) : {};
        } catch (err) {
            console.error(`[API Error] ${method} ${endpoint}:`, err);
            throw err;
        }
    },

    // Show notification to user
    showNotification(message, type = 'info') {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };

        const notification = document.createElement('div');
        notification.className = `fixed top-6 right-6 ${colors[type] || colors.info} text-white px-6 py-4 rounded-xl shadow-2xl z-[9999] animate-fade-in font-bold`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    // Confirmation dialog
    async confirm(message) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center';

            const dialog = document.createElement('div');
            dialog.className = 'bg-white rounded-3xl p-8 max-w-md shadow-2xl';
            dialog.innerHTML = `
                <h3 class="text-xl font-bold mb-4">Confirm Action</h3>
                <p class="text-on-surface-variant mb-6">${message}</p>
                <div class="flex gap-3">
                    <button class="cancel flex-1 bg-surface-container-high text-on-surface font-bold py-3 rounded-xl hover:bg-surface-container-highest transition-all">Cancel</button>
                    <button class="confirm flex-1 signature-gradient text-white font-bold py-3 rounded-xl shadow-lg hover:scale-105 transition-all">Confirm</button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';

            overlay.querySelector('.cancel').onclick = () => {
                overlay.remove();
                document.body.style.overflow = 'auto';
                resolve(false);
            };

            overlay.querySelector('.confirm').onclick = () => {
                overlay.remove();
                document.body.style.overflow = 'auto';
                resolve(true);
            };
        });
    },

    // Format date helper
    formatDate(dateString) {
        if (!dateString) return '--';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    // Logout helper
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
};

// Auto-logout handler for all pages with confirmation
document.addEventListener('DOMContentLoaded', () => {
    console.log('\n--- BYTOONS FLOW DATABASE DIAGNOSTIC ---\n');
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const confirmed = await PA.confirm('Are you sure you want to terminate your session?');
            if (confirmed) PA.logout();
        });
    }
});
