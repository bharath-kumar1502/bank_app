// UI Navigation
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(v => { v.classList.remove('active'); v.classList.add('hidden'); });
    const tgt = document.getElementById(viewId);
    if (tgt) { tgt.classList.remove('hidden'); tgt.classList.add('active'); }

    // Toggle active state on home button
    const homeBtn = document.querySelector('[data-target="dashboard-view"]');
    if (viewId === 'dashboard-view') {
        homeBtn.classList.add('active');
    } else {
        homeBtn.classList.remove('active');
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'slideOut 0.3s ease forwards'; setTimeout(() => toast.remove(), 300); }, 3500);
}

async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
}



async function handleTransfer(e) {
    e.preventDefault();
    const target_acc_no = document.getElementById('tfTargetAccNo').value;
    const amount = document.getElementById('tfAmount').value;

    try {
        const response = await fetch('/api/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_acc_no, amount })
        });
        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            document.getElementById('transferForm').reset();
            setTimeout(() => { switchView('dashboard-view'); }, 1000);
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Connection error. Please try again.', 'error');
    }
}

async function handleCheckBalance() {
    const res = await fetch(`/api/balance`);
    const data = await res.json();
    if (data.success) {
        document.getElementById('cb-acc-type').textContent = data.details.account_type;
        document.getElementById('cb-balance').textContent = parseFloat(data.details.balance).toFixed(2);
        document.getElementById('cb-name').textContent = data.details.name;
        document.getElementById('cb-acc-no').textContent = data.details.acc_no;
    } else showToast(data.message, 'error');
}

async function handleTransactions() {
    const res = await fetch(`/api/transactions`);
    const data = await res.json();
    const timeline = document.getElementById('tx-timeline');
    const empty = document.getElementById('tx-empty');
    timeline.innerHTML = '';
    if (data.success) {
        if (data.transactions.length === 0) {
            empty.classList.remove('hidden'); timeline.classList.add('hidden');
        } else {
            empty.classList.add('hidden'); timeline.classList.remove('hidden');
            data.transactions.reverse().forEach(tx => {
                const isDeposit = tx.includes('Deposit');
                const amt = tx.split('₹')[1] || tx;
                const desc = tx.split('₹')[0].trim();
                timeline.innerHTML += `<div class="tx-item"><div class="tx-content ${isDeposit ? 'deposit' : 'withdraw'}"><span class="tx-desc">${desc}</span><span class="tx-amount">${isDeposit ? '+' : '-'}₹${amt}</span></div></div>`;
            });
        }
    } else showToast(data.message, 'error');
}

async function handleChangePassword(e) {
    e.preventDefault();
    const new_password = document.getElementById('cpNewPassword').value;

    try {
        const response = await fetch('/api/customer/change_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_password })
        });
        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            document.getElementById('customerSettingsForm').reset();
            setTimeout(() => { switchView('dashboard-view'); }, 1000);
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Connection error. Please try again.', 'error');
    }
}
