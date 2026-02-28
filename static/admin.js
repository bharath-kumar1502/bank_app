// UI Navigation
function switchView(viewId, btnElement) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    document.querySelectorAll('.view-section').forEach(v => { v.classList.remove('active'); v.classList.add('hidden'); });
    const tgt = document.getElementById(viewId);
    if (tgt) { tgt.classList.remove('hidden'); tgt.classList.add('active'); }
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

// Change Credentials
async function handleChangeCredentials(e) {
    e.preventDefault();
    const new_username = document.getElementById('newUsername').value;
    const new_password = document.getElementById('newPassword').value;

    const response = await fetch('/api/admin/change_credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_username, new_password })
    });
    const data = await response.json();
    if (data.success) {
        showToast(data.message, 'success');
        document.getElementById('settingsForm').reset();
    } else { showToast(data.message, 'error'); }
}

async function handleCreateAccount(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('regName').value,
        age: document.getElementById('regAge').value,
        aadhar: document.getElementById('regAadhar').value,
        phone: document.getElementById('regPhone').value,
        initial_deposit: document.getElementById('regInitialDeposit').value
    };
    const res = await fetch('/api/create_account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.success) {
        showToast(data.message, 'success');
        document.getElementById('res-acc-no').textContent = data.acc_no;
        document.getElementById('res-password').textContent = data.password;
        document.getElementById('res-acc-type').textContent = data.account_type;
        document.getElementById('new-account-result').classList.remove('hidden');
        document.getElementById('createAccountForm').reset();
    } else { showToast(data.message, 'error'); }
}

function copyAccNo() {
    navigator.clipboard.writeText(document.getElementById('res-acc-no').textContent);
    showToast('Copied to clipboard!', 'success');
}

async function fetchAccountsList() {
    const res = await fetch('/api/list_accounts');
    const data = await res.json();
    const tbody = document.getElementById('accounts-table-body');
    tbody.innerHTML = '';
    if (data.success && data.accounts.length > 0) {
        document.getElementById('accounts-empty').classList.add('hidden');
        data.accounts.forEach(acc => {
            tbody.innerHTML += `<tr>
                <td style="padding: 1rem; font-family: monospace;">${acc.acc_no}</td>
                <td style="padding: 1rem;">${acc.name}</td>
                <td style="padding: 1rem; font-family: monospace; color: var(--error-color); font-weight:bold;">${acc.password}</td>
                <td style="padding: 1rem;">₹${acc.balance}</td>
            </tr>`;
        });
    } else { document.getElementById('accounts-empty').classList.remove('hidden'); }
}

// Re-using Teller logic
async function handleDeposit(e) {
    e.preventDefault();
    const acc_no = document.getElementById('depAccNo').value;
    const amount = document.getElementById('depAmount').value;
    const res = await fetch('/api/deposit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acc_no, amount }) });
    const data = await res.json();
    if (data.success) { showToast(data.message, 'success'); document.getElementById('depositForm').reset(); } else showToast(data.message, 'error');
}

async function handleWithdraw(e) {
    e.preventDefault();
    const acc_no = document.getElementById('withAccNo').value;
    const amount = document.getElementById('withAmount').value;
    const res = await fetch('/api/withdraw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acc_no, amount }) });
    const data = await res.json();
    if (data.success) { showToast(data.message, 'success'); document.getElementById('withdrawForm').reset(); } else showToast(data.message, 'error');
}

async function handleDeleteAccount(e) {
    e.preventDefault();
    const acc_no = document.getElementById('delAccNo').value;
    if (!confirm('Delete this account permanently?')) return;
    const res = await fetch('/api/delete_account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acc_no }) });
    const data = await res.json();
    if (data.success) { showToast(data.message, 'success'); document.getElementById('deleteForm').reset(); } else showToast(data.message, 'error');
}

async function handleCheckBalance(e) {
    e.preventDefault();
    const acc_no = document.getElementById('balAccNo').value;
    const res = await fetch(`/api/balance?acc_no=${acc_no}`);
    const data = await res.json();
    if (data.success) {
        document.getElementById('balance-result').classList.remove('hidden');
        document.getElementById('cb-balance').textContent = data.details.balance;
        document.getElementById('cb-name').textContent = data.details.name;
        document.getElementById('cb-acc-no').textContent = data.details.acc_no;
    } else { showToast(data.message, 'error'); }
}

async function handleTransactions(e) {
    e.preventDefault();
    const acc_no = document.getElementById('txAccNo').value;
    const res = await fetch(`/api/transactions?acc_no=${acc_no}`);
    const data = await res.json();
    const timeline = document.getElementById('tx-timeline');
    document.getElementById('tx-result').classList.remove('hidden');
    timeline.innerHTML = '';
    if (data.success) {
        data.transactions.reverse().forEach(tx => {
            const isDeposit = tx.includes('Deposit');
            timeline.innerHTML += `<div class="tx-item"><div class="tx-content ${isDeposit ? 'deposit' : 'withdraw'}"><span class="tx-desc">${tx}</span></div></div>`;
        });
    } else { showToast(data.message, 'error'); }
}
// Add these functions to the end of c:\Users\ASUS\OneDrive\Documents\antigravnew\static\admin.js

async function fetchPendingTransfers() {
    try {
        const response = await fetch('/api/admin/pending_transfers');
        const data = await response.json();

        const tbody = document.getElementById('transfers-table-body');
        const emptyState = document.getElementById('transfers-empty');

        tbody.innerHTML = '';

        if (data.success) {
            if (data.transfers.length === 0) {
                emptyState.classList.remove('hidden');
            } else {
                emptyState.classList.add('hidden');

                data.transfers.forEach(transfer => {
                    const row = document.createElement('tr');
                    row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

                    row.innerHTML = `
                        <td style="padding: 1rem; font-family: monospace;">${transfer.sender}</td>
                        <td style="padding: 1rem; font-family: monospace;">${transfer.recipient}</td>
                        <td style="padding: 1rem; font-family: var(--font-heading); font-weight: 600;">₹${parseFloat(transfer.amount).toFixed(2)}</td>
                        <td style="padding: 1rem; display: flex; gap: 0.5rem;">
                            <button onclick="approveTransfer('${transfer.id}')" class="btn primary-btn" style="padding: 0.5rem 1rem; font-size: 0.875rem; background: var(--success-color);">Approve</button>
                            <button onclick="rejectTransfer('${transfer.id}')" class="btn primary-btn" style="padding: 0.5rem 1rem; font-size: 0.875rem; background: var(--error-color);">Reject</button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
                showToast('Pending transfers refreshed.', 'success');
            }
        } else {
            showToast('Failed to load pending transfers.', 'error');
        }
    } catch (error) {
        showToast('Connection error while fetching transfers.', 'error');
    }
}

async function approveTransfer(transfer_id) {
    if (!confirm('Are you sure you want to approve this transfer?')) return;
    try {
        const response = await fetch('/api/admin/approve_transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transfer_id })
        });
        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            fetchPendingTransfers(); // Refresh list
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Connection error.', 'error');
    }
}

async function rejectTransfer(transfer_id) {
    if (!confirm('Are you sure you want to reject this transfer?')) return;
    try {
        const response = await fetch('/api/admin/reject_transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transfer_id })
        });
        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            fetchPendingTransfers(); // Refresh list
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Connection error.', 'error');
    }
}
