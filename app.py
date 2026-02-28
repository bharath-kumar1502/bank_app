from flask import Flask, request, jsonify, render_template, Response

app = Flask(__name__)

# Basic Authentication setup
def check_auth(username, password):
    # Using 'admin' and 'snibank' as default credentials. You can change these.
    return username == 'admin' and password == 'snibank'

def authenticate():
    return Response(
        'Could not verify your access level for that URL.\n'
        'You have to login with proper credentials',
        401,
        {'WWW-Authenticate': 'Basic realm="SNI Bank Login Required"'}
    )

@app.before_request
def require_auth():
    # Allow CORS preflight requests without authentication
    if request.method == 'OPTIONS':
        return Response()
    auth = request.authorization
    if not auth or not check_auth(auth.username, auth.password):
        return authenticate()

class BankAccount:
    next_account_number = 50001

    def __init__(self, name, age, aadhar, phone):
        self.acc_no = str(BankAccount.next_account_number)
        BankAccount.next_account_number += 1

        self.name = name
        self.age = age
        self.aadhar = aadhar
        self.phone = phone
        self.balance = 0
        self.transactions = []

        if age < 18:
            self.account_type = "Minor Account"
        else:
            self.account_type = "Major Account"

    def deposit(self, amount):
        if amount > 0:
            self.balance += amount
            self.transactions.append(f"Deposited ₹{amount}")
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
            self.transactions.append(f"Withdrawn ₹{amount}")
            return True, "Amount Withdrawn Successfully!"

    def get_details(self):
        return {
            "bank_name": "SPYDERS NATIONAL BANK",
            "acc_no": self.acc_no,
            "name": self.name,
            "account_type": self.account_type,
            "balance": self.balance,
            "transactions": self.transactions
        }

# Global dictionary to store accounts
accounts = {}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/create_account", methods=["POST"])
def create_account():
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

    account = BankAccount(name, age, aadhar, phone)
    account.deposit(initial_deposit)
    accounts[account.acc_no] = account

    return jsonify({
        "success": True, 
        "message": "Account Created Successfully!",
        "acc_no": account.acc_no,
        "account_type": account.account_type
    })

@app.route("/api/deposit", methods=["POST"])
def deposit():
    data = request.json
    acc_no = data.get("acc_no", "")
    amount = data.get("amount", "")

    if acc_no not in accounts:
        return jsonify({"success": False, "message": "Account Not Found!"})
    
    try:
        amount = float(amount)
        success, message = accounts[acc_no].deposit(amount)
        return jsonify({"success": success, "message": message, "balance": accounts[acc_no].balance})
    except ValueError:
        return jsonify({"success": False, "message": "Enter valid amount!"})

@app.route("/api/withdraw", methods=["POST"])
def withdraw():
    data = request.json
    acc_no = data.get("acc_no", "")
    amount = data.get("amount", "")

    if acc_no not in accounts:
        return jsonify({"success": False, "message": "Account Not Found!"})
    
    try:
        amount = float(amount)
        success, message = accounts[acc_no].withdraw(amount)
        return jsonify({"success": success, "message": message, "balance": accounts[acc_no].balance})
    except ValueError:
        return jsonify({"success": False, "message": "Enter valid amount!"})


@app.route("/api/balance", methods=["GET"])
def balance():
    acc_no = request.args.get("acc_no")
    
    if not acc_no:
        return jsonify({"success": False, "message": "Account number is required"})
        
    if acc_no in accounts:
        return jsonify({"success": True, "details": accounts[acc_no].get_details()})
    else:
        return jsonify({"success": False, "message": "Account Not Found!"})


@app.route("/api/transactions", methods=["GET"])
def transactions():
    acc_no = request.args.get("acc_no")

    if not acc_no:
        return jsonify({"success": False, "message": "Account number is required"})

    if acc_no in accounts:
        transactions_list = accounts[acc_no].transactions
        return jsonify({"success": True, "transactions": transactions_list})
    else:
        return jsonify({"success": False, "message": "Account Not Found!"})


@app.route("/api/delete_account", methods=["POST"])
def delete_account():
    data = request.json
    acc_no = data.get("acc_no", "")

    if acc_no in accounts:
        del accounts[acc_no]
        return jsonify({"success": True, "message": "Account Deleted Successfully!"})
    else:
        return jsonify({"success": False, "message": "Account Not Found!"})


@app.route("/api/list_accounts", methods=["GET"])
def list_accounts():
    accounts_data = []
    for acc_no, account in accounts.items():
        accounts_data.append({
            "acc_no": acc_no,
            "name": account.name,
            "account_type": account.account_type,
            "balance": getattr(account, 'balance', 0)
        })
    return jsonify({"success": True, "accounts": accounts_data})

if __name__ == "__main__":
    app.run(debug=True)
