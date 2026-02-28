// UI Navigation Logic
function switchView(viewId, btnElement) {
    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) {
        btnElement.classList.add('active');
    }

    // Hide all views and show target
    document.querySelectorAll('.view-section').forEach(view => {
        view.classList.remove('active');
        view.classList.add('hidden');
    });

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
        targetView.classList.add('active');

        // Focus first visible input automatically
        const firstInput = targetView.querySelector('input:not([type="hidden"])');
        if (firstInput) {
            firstInput.focus();
        }
    }
}

// Global Toast Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

    container.appendChild(toast);

    // Remove after 3.5s
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Create Account Logic
async function handleCreateAccount(e) {
    e.preventDefault();

    const name = document.getElementById('regName').value;
    const age = document.getElementById('regAge').value;
    const aadhar = document.getElementById('regAadhar').value;
    const phone = document.getElementById('regPhone').value;
    const initial_deposit = document.getElementById('regInitialDeposit').value;

    try {
        const response = await fetch('/api/create_account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, age, aadhar, phone, initial_deposit })
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            // Show result box
            const resBox = document.getElementById('new-account-result');
            document.getElementById('res-acc-no').textContent = data.acc_no;
            document.getElementById('res-acc-type').textContent = data.account_type;
            resBox.classList.remove('hidden');
            document.getElementById('createAccountForm').reset();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Connection error. Please try again.', 'error');
    }
}

function copyAccNo() {
    const accNo = document.getElementById('res-acc-no').textContent;
    navigator.clipboard.writeText(accNo).then(() => {
        showToast('Account number copied to clipboard!', 'success');
    });
}

// Deposit Logic
async function handleDeposit(e) {
    e.preventDefault();
    const acc_no = document.getElementById('depAccNo').value;
    const amount = document.getElementById('depAmount').value;

    try {
        const response = await fetch('/api/deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ acc_no, amount })
        });
        const data = await response.json();

        if (data.success) {
            showToast(`${data.message} New Balance: ₹${data.balance}`, 'success');
            document.getElementById('depositForm').reset();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Connection error.', 'error');
    }
}

// Withdraw Logic
async function handleWithdraw(e) {
    e.preventDefault();
    const acc_no = document.getElementById('withAccNo').value;
    const amount = document.getElementById('withAmount').value;

    try {
        const response = await fetch('/api/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ acc_no, amount })
        });
        const data = await response.json();

        if (data.success) {
            showToast(`${data.message} Remaining Balance: ₹${data.balance}`, 'success');
            document.getElementById('withdrawForm').reset();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Connection error.', 'error');
    }
}

// Check Balance Logic
async function handleCheckBalance(e) {
    e.preventDefault();
    const acc_no = document.getElementById('balAccNo').value;

    try {
        const response = await fetch(`/api/balance?acc_no=${acc_no}`);
        const data = await response.json();

        if (data.success) {
            document.getElementById('balance-result').classList.remove('hidden');
            document.getElementById('cb-bank-name').textContent = data.details.bank_name;
            document.getElementById('cb-acc-type').textContent = data.details.account_type;
            document.getElementById('cb-balance').textContent = parseFloat(data.details.balance).toFixed(2);
            document.getElementById('cb-name').textContent = data.details.name;
            document.getElementById('cb-acc-no').textContent = data.details.acc_no;
            showToast('Account details loaded.', 'success');
        } else {
            document.getElementById('balance-result').classList.add('hidden');
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Connection error.', 'error');
    }
}

// Transaction History Logic
async function handleTransactions(e) {
    e.preventDefault();
    const acc_no = document.getElementById('txAccNo').value;

    try {
        const response = await fetch(`/api/transactions?acc_no=${acc_no}`);
        const data = await response.json();

        const container = document.getElementById('tx-result');
        const timeline = document.getElementById('tx-timeline');
        const emptyState = document.getElementById('tx-empty');

        container.classList.remove('hidden');

        if (data.success) {
            timeline.innerHTML = '';

            if (data.transactions.length === 0) {
                timeline.classList.add('hidden');
                emptyState.classList.remove('hidden');
            } else {
                emptyState.classList.add('hidden');
                timeline.classList.remove('hidden');

                // Reverse to show latest first
                data.transactions.reverse().forEach(tx => {
                    const isDeposit = tx.includes('Deposit');
                    const txClass = isDeposit ? 'deposit' : 'withdraw';
                    const amountSplit = tx.split('₹');
                    const amount = amountSplit.length > 1 ? `₹${amountSplit[1]}` : tx;
                    const desc = amountSplit[0].trim();

                    timeline.innerHTML += `
                        <div class="tx-item">
                            <div class="tx-content ${txClass}">
                                <span class="tx-desc">${desc}</span>
                                <span class="tx-amount">${isDeposit ? '+' : '-'}${amount}</span>
                            </div>
                        </div>
                    `;
                });
            }
            showToast('Transactions loaded.', 'success');
        } else {
            container.classList.add('hidden');
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Connection error.', 'error');
    }
}

// Delete Account Logic
async function handleDeleteAccount(e) {
    e.preventDefault();
    const acc_no = document.getElementById('delAccNo').value;

    if (!confirm('Are you absolutely sure you want to close this account? All funds will be withdrawn and history deleted. This cannot be undone!')) {
        return;
    }

    try {
        const response = await fetch('/api/delete_account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ acc_no })
        });
        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            document.getElementById('deleteForm').reset();
            // Go to home screen automatically after success
            setTimeout(() => {
                document.querySelector('[data-target="dashboard-view"]').click();
            }, 1000);
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Connection error. Please try again.', 'error');
    }
}

// Fetch All Accounts Logic
async function fetchAccountsList() {
    try {
        const response = await fetch('/api/list_accounts');
        const data = await response.json();

        const tbody = document.getElementById('accounts-table-body');
        const emptyState = document.getElementById('accounts-empty');

        tbody.innerHTML = '';

        if (data.success) {
            if (data.accounts.length === 0) {
                emptyState.classList.remove('hidden');
            } else {
                emptyState.classList.add('hidden');

                data.accounts.forEach(acc => {
                    const row = document.createElement('tr');
                    row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

                    row.innerHTML = `
                        <td style="padding: 1rem; font-family: monospace;">${acc.acc_no}</td>
                        <td style="padding: 1rem; font-weight: 500;">${acc.name}</td>
                        <td style="padding: 1rem;">
                            <span class="chip" style="background: rgba(99,102,241,0.2); color: #fff;">${acc.account_type}</span>
                        </td>
                        <td style="padding: 1rem; font-family: var(--font-heading); font-weight: 600;">₹${parseFloat(acc.balance).toFixed(2)}</td>
                    `;
                    tbody.appendChild(row);
                });
                showToast('Accounts list refreshed.', 'success');
            }
        } else {
            showToast('Failed to load accounts.', 'error');
        }
    } catch (error) {
        showToast('Connection error while fetching accounts.', 'error');
    }
}
