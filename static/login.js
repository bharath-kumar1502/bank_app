// Tab Switching functionality
function switchLoginTab(type) {
    document.getElementById('tab-customer').classList.remove('active');
    document.getElementById('tab-admin').classList.remove('active');
    document.getElementById('customerLoginForm').classList.remove('active');
    document.getElementById('adminLoginForm').classList.remove('active');

    document.getElementById(`tab-${type}`).classList.add('active');
    document.getElementById(`${type}LoginForm`).classList.add('active');
}

// Global Toast System (Copied from original script.js)
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Handle Customer Login
async function handleCustomerLogin(e) {
    e.preventDefault();
    const acc_no = document.getElementById('custAccNo').value;
    const password = document.getElementById('custPassword').value;

    try {
        const response = await fetch('/api/login/customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ acc_no, password })
        });
        const data = await response.json();

        if (data.success) {
            window.location.href = data.redirect;
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Connection error. Please try again.', 'error');
    }
}

// Handle Admin Login
async function handleAdminLogin(e) {
    e.preventDefault();
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;

    try {
        const response = await fetch('/api/login/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            window.location.href = data.redirect;
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Connection error. Please try again.', 'error');
    }
}
