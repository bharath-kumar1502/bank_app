from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
import string
import random
import os

app = Flask(__name__)
# Generate a secret key if one doesn't exist. In production, this should be set in .env
app.secret_key = os.environ.get("SECRET_KEY", os.urandom(24))

# Database Configuration
db_url = os.environ.get('DATABASE_URL')
if db_url:
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+pg8000://", 1)
    elif db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+pg8000://", 1)
    
    # pg8000 does not support the pgbouncer query parameter, but Supabase requires the port. 
    # We must strip it out before passing to SQLAlchemy.
    if "?pgbouncer=true" in db_url:
        db_url = db_url.replace("?pgbouncer=true", "")
        
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
else:
    if os.environ.get("VERCEL"):
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////tmp/bank.db'
    else:
        basedir = os.path.abspath(os.path.dirname(__file__))
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'bank.db')

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# ---- Models Definition ---- #

class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)

class Account(db.Model):
    acc_no = db.Column(db.String(20), primary_key=True)
    password = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    aadhar = db.Column(db.String(12), nullable=False)
    phone = db.Column(db.String(15), nullable=False)
    balance = db.Column(db.Float, default=0.0)
    account_type = db.Column(db.String(20), nullable=False)
    transactions = db.relationship('Transaction', backref='account', lazy=True, cascade="all, delete-orphan")

    def deposit(self, amount):
        if amount > 0:
            self.balance += amount
            tx = Transaction(acc_no=self.acc_no, description=f"Deposited ₹{amount}")
            db.session.add(tx)
            return True, "Amount Deposited Successfully!"
        return False, "Deposit amount must be positive!"

    def withdraw(self, amount):
        if self.account_type == "Minor Account":
            return False, "Minor account cannot withdraw!"
        elif amount <= 0:
            return False, "Withdrawal amount must be positive!"
        elif amount > self.balance:
            return False, "Insufficient balance!"
        elif self.account_type == "Major Account" and (self.balance - amount) < 1000:
            return False, "Minimum balance of ₹1000 must be maintained!"
        else:
            self.balance -= amount
            tx = Transaction(acc_no=self.acc_no, description=f"Withdrawn ₹{amount}")
            db.session.add(tx)
            return True, "Amount Withdrawn Successfully!"

    def request_transfer(self, amount, target_account):
        if self.account_type == "Minor Account":
            return False, "Minor account cannot transfer funds!"
        elif amount <= 0:
            return False, "Transfer amount must be positive!"
        elif amount > self.balance:
            return False, "Insufficient balance!"
        elif self.account_type == "Major Account" and (self.balance - amount) < 1000:
            return False, "Minimum balance of ₹1000 must be maintained!"
            
        return True, "Transfer requested! Waiting for Admin approval."

    def execute_transfer(self, amount, target_account):
        self.balance -= amount
        tx1 = Transaction(acc_no=self.acc_no, description=f"Transfer to {target_account.acc_no}: -₹{amount}")
        db.session.add(tx1)
        
        target_account.balance += amount
        tx2 = Transaction(acc_no=target_account.acc_no, description=f"Transfer from {self.acc_no}: +₹{amount}")
        db.session.add(tx2)
        
        return True, "Transfer Successful!"

    def get_details(self):
        return {
            "bank_name": "SPYDERS NATIONAL BANK",
            "acc_no": self.acc_no,
            "name": self.name,
            "account_type": self.account_type,
            "balance": self.balance,
            "transactions": [tx.description for tx in self.transactions]
        }

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    acc_no = db.Column(db.String(20), db.ForeignKey('account.acc_no'), nullable=False)
    description = db.Column(db.String(200), nullable=False)

class PendingTransfer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender = db.Column(db.String(20), nullable=False)
    recipient = db.Column(db.String(20), nullable=False)
    amount = db.Column(db.Float, nullable=False)

def generate_acc_no():
    accounts = Account.query.all()
    if not accounts:
        return "50001"
    max_acc = max([int(acc.acc_no) for acc in accounts])
    return str(max_acc + 1)

def generate_password():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=6))

# ---- Setup Route (Run once if needed) ---- #
@app.route("/api/init_db")
def init_db():
    try:
        db.create_all()
        if not Admin.query.filter_by(username='admin').first():
            default_admin = Admin(username='admin', password='snibank')
            db.session.add(default_admin)
            db.session.commit()
        return jsonify({"success": True, "message": "Database initialized successfully!"})
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {e}"})

# ---- View Routes ---- #

@app.route("/")
def index():
    if "role" in session:
        if session["role"] == "admin":
            return redirect(url_for("admin_dashboard"))
        elif session["role"] == "customer":
            return redirect(url_for("customer_dashboard"))
    return render_template("login.html")

@app.route("/admin")
def admin_dashboard():
    if session.get("role") != "admin":
        return redirect(url_for("index"))
    return render_template("admin.html")

@app.route("/customer")
def customer_dashboard():
    if session.get("role") != "customer":
        return redirect(url_for("index"))
    return render_template("customer.html")


# ---- Auth API ---- #

@app.route("/api/login/admin", methods=["POST"])
def login_admin():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    admin = Admin.query.filter_by(username=username, password=password).first()
    if admin:
        session["role"] = "admin"
        return jsonify({"success": True, "message": "Login successful", "redirect": "/admin"})
    
    return jsonify({"success": False, "message": "Invalid Admin credentials!"}), 401

@app.route("/api/login/customer", methods=["POST"])
def login_customer():
    data = request.json
    acc_no = data.get("acc_no")
    password = data.get("password")
    
    account = Account.query.filter_by(acc_no=acc_no, password=password).first()
    if account:
        session["role"] = "customer"
        session["acc_no"] = acc_no
        return jsonify({"success": True, "message": "Login successful", "redirect": "/customer"})
        
    return jsonify({"success": False, "message": "Invalid Account Number or Password!"}), 401

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully", "redirect": "/"})


# ---- Admin API ---- #

def require_admin():
    return session.get("role") == "admin"

@app.route("/api/admin/change_credentials", methods=["POST"])
def change_credentials():
    if not require_admin():
        return jsonify({"success": False, "message": "Unauthorized"}), 401
        
    data = request.json
    new_username = data.get("new_username")
    new_password = data.get("new_password")
    
    if not new_username or not new_password:
        return jsonify({"success": False, "message": "Username and password cannot be empty!"})
        
    admin = Admin.query.first()
    if admin:
        admin.username = new_username
        admin.password = new_password
        db.session.commit()
    
    return jsonify({"success": True, "message": "Admin credentials updated successfully!"})

@app.route("/api/create_account", methods=["POST"])
def create_account():
    if not require_admin():
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    data = request.json
    name = data.get("name", "")
    age = data.get("age", "")
    aadhar = data.get("aadhar", "")
    phone = data.get("phone", "")
    initial_deposit = data.get("initial_deposit", "")

    if not str(name).replace(" ", "").isalpha():
        return jsonify({"success": False, "message": "Name must contain only alphabets!"})
    
    if not str(age).isdigit():
        return jsonify({"success": False, "message": "Age must be a number!"})
    
    age = int(age)
    if age <= 0 or age > 120:
        return jsonify({"success": False, "message": "Enter valid age between 1 and 120!"})
    
    if not (str(aadhar).isdigit() and len(str(aadhar)) == 12):
        return jsonify({"success": False, "message": "Invalid Aadhar Number (must be 12 digits)!"})
    
    if not (str(phone).isdigit() and len(str(phone)) == 10):
        return jsonify({"success": False, "message": "Invalid Phone Number (must be 10 digits)!"})

    try:
        initial_deposit = float(initial_deposit)
        if initial_deposit < 1000:
            return jsonify({"success": False, "message": "Minimum initial deposit of ₹1000 is required!"})
    except ValueError:
        return jsonify({"success": False, "message": "Enter valid initial deposit amount!"})

    account_type = "Minor Account" if age < 18 else "Major Account"
    
    account = Account(
        acc_no=generate_acc_no(),
        password=generate_password(),
        name=name,
        age=age,
        aadhar=aadhar,
        phone=phone,
        balance=0.0,
        account_type=account_type
    )
    
    db.session.add(account)
    db.session.commit()
    
    account.deposit(initial_deposit)
    db.session.commit()

    return jsonify({
        "success": True, 
        "message": "Account Created Successfully!",
        "acc_no": account.acc_no,
        "password": account.password,
        "account_type": account.account_type
    })

@app.route("/api/delete_account", methods=["POST"])
def delete_account():
    if not require_admin():
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    data = request.json
    acc_no = data.get("acc_no", "")

    account = Account.query.get(acc_no)
    if account:
        db.session.delete(account)
        PendingTransfer.query.filter(
            (PendingTransfer.sender == acc_no) | (PendingTransfer.recipient == acc_no)
        ).delete()
        db.session.commit()
        return jsonify({"success": True, "message": "Account Deleted Successfully!"})
    else:
        return jsonify({"success": False, "message": "Account Not Found!"})

@app.route("/api/list_accounts", methods=["GET"])
def list_accounts():
    if not require_admin():
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    accounts = Account.query.all()
    accounts_data = []
    for account in accounts:
        accounts_data.append({
            "acc_no": account.acc_no,
            "name": account.name,
            "account_type": account.account_type,
            "balance": account.balance,
            "password": account.password
        })
    return jsonify({"success": True, "accounts": accounts_data})

@app.route("/api/admin/pending_transfers", methods=["GET"])
def get_pending_transfers():
    if not require_admin():
        return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    transfers = PendingTransfer.query.all()
    transfers_list = []
    for t in transfers:
        transfers_list.append({
            "id": t.id,
            "sender": t.sender,
            "recipient": t.recipient,
            "amount": t.amount
        })
    return jsonify({"success": True, "transfers": transfers_list})

@app.route("/api/admin/approve_transfer", methods=["POST"])
def approve_transfer():
    if not require_admin():
        return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    data = request.json
    transfer_id = data.get("transfer_id")
    
    transfer = PendingTransfer.query.get(transfer_id)
    if not transfer:
        return jsonify({"success": False, "message": "Transfer request not found or already processed!"})
        
    sender_acc = Account.query.get(transfer.sender)
    target_acc = Account.query.get(transfer.recipient)
    amount = transfer.amount
    
    if not sender_acc or not target_acc:
        db.session.delete(transfer)
        db.session.commit()
        return jsonify({"success": False, "message": "Invalid accounts involved in transfer. Deleted request."})
        
    success, msg = sender_acc.request_transfer(amount, target_acc)
    if not success:
        return jsonify({"success": False, "message": f"Cannot approve: {msg}"})
        
    sender_acc.execute_transfer(amount, target_acc)
    db.session.delete(transfer)
    db.session.commit()
    
    return jsonify({"success": True, "message": "Transfer Approved and Executed!"})

@app.route("/api/admin/reject_transfer", methods=["POST"])
def reject_transfer():
    if not require_admin():
        return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    data = request.json
    transfer_id = data.get("transfer_id")
    
    transfer = PendingTransfer.query.get(transfer_id)
    if transfer:
        db.session.delete(transfer)
        db.session.commit()
        return jsonify({"success": True, "message": "Transfer Rejected!"})
    
    return jsonify({"success": False, "message": "Transfer request not found!"})

# ---- Customer API ---- #

def require_customer_or_admin(acc_no):
    if session.get("role") == "admin":
        return True
    return session.get("role") == "customer" and session.get("acc_no") == acc_no

@app.route("/api/customer/change_password", methods=["POST"])
def customer_change_password():
    if session.get("role") != "customer":
        return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    data = request.json
    new_password = data.get("new_password")
    acc_no = session.get("acc_no")
    
    if not new_password or len(new_password) < 6:
        return jsonify({"success": False, "message": "Password must be at least 6 characters long!"})
        
    account = Account.query.get(acc_no)
    if account:
        account.password = new_password
        db.session.commit()
        return jsonify({"success": True, "message": "Password updated successfully!"})
    return jsonify({"success": False, "message": "Account not found!"}), 404

@app.route("/api/transfer", methods=["POST"])
def transfer():
    if session.get("role") != "customer":
        return jsonify({"success": False, "message": "Only customers can transfer funds!"}), 401
        
    data = request.json
    sender_acc_no = session.get("acc_no")
    target_acc_no = data.get("target_acc_no", "")
    amount = data.get("amount", "")

    sender_acc = Account.query.get(sender_acc_no)
    target_acc = Account.query.get(target_acc_no)

    if not target_acc:
        return jsonify({"success": False, "message": "Recipient Account Not Found in SNB!"})
        
    if sender_acc_no == target_acc_no:
        return jsonify({"success": False, "message": "Cannot transfer to the same account!"})
    
    try:
        amount = float(amount)
        success, message = sender_acc.request_transfer(amount, target_acc)
        
        if success:
            pt = PendingTransfer(sender=sender_acc_no, recipient=target_acc_no, amount=amount)
            db.session.add(pt)
            db.session.commit()
            
        return jsonify({"success": success, "message": message, "balance": sender_acc.balance})
    except ValueError:
        return jsonify({"success": False, "message": "Enter a valid transfer amount!"})

@app.route("/api/deposit", methods=["POST"])
def deposit():
    if not require_admin():
        return jsonify({"success": False, "message": "Only Admins can perform Teller Deposits!"}), 401
        
    data = request.json
    acc_no = data.get("acc_no", "")
    amount = data.get("amount", "")

    account = Account.query.get(acc_no)
    if not account:
        return jsonify({"success": False, "message": "Account Not Found!"})
    
    try:
        amount = float(amount)
        success, message = account.deposit(amount)
        if success:
            db.session.commit()
        return jsonify({"success": success, "message": message, "balance": account.balance})
    except ValueError:
        return jsonify({"success": False, "message": "Enter valid amount!"})

@app.route("/api/withdraw", methods=["POST"])
def withdraw():
    if not require_admin():
        return jsonify({"success": False, "message": "Only Admins can perform Teller Withdrawals!"}), 401
    
    data = request.json
    acc_no = data.get("acc_no", "")
    amount = data.get("amount", "")

    account = Account.query.get(acc_no)
    if not account:
        return jsonify({"success": False, "message": "Account Not Found!"})
    
    try:
        amount = float(amount)
        success, message = account.withdraw(amount)
        if success:
            db.session.commit()
        return jsonify({"success": success, "message": message, "balance": account.balance})
    except ValueError:
        return jsonify({"success": False, "message": "Enter valid amount!"})

@app.route("/api/balance", methods=["GET"])
def balance():
    acc_no = request.args.get("acc_no")
    if not acc_no:
        acc_no = session.get("acc_no")

    if not require_customer_or_admin(acc_no):
        return jsonify({"success": False, "message": "Unauthorized"}), 401
        
    account = Account.query.get(acc_no)
    if account:
        return jsonify({"success": True, "details": account.get_details()})
    else:
        return jsonify({"success": False, "message": "Account Not Found!"})

@app.route("/api/transactions", methods=["GET"])
def transactions():
    acc_no = request.args.get("acc_no")
    if not acc_no:
        acc_no = session.get("acc_no")

    if not require_customer_or_admin(acc_no):
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    account = Account.query.get(acc_no)
    if account:
        transactions_list = [tx.description for tx in account.transactions]
        return jsonify({"success": True, "transactions": transactions_list})
    else:
        return jsonify({"success": False, "message": "Account Not Found!"})

if __name__ == "__main__":
    app.run(debug=True)
