import pypdf
import re
import csv
from datetime import datetime

pdf_path = r"C:\Users\ADMIN\Downloads\AccountStatement_01-Apr-2025_31-Mar-2026_260630_215456.pdf"
output_csv_path = r"C:\Users\ADMIN\Desktop\cognee\frontend\pravesh_statement.csv"

reader = pypdf.PdfReader(pdf_path)

tx_start_pattern = re.compile(r"^\s*(\d+)\s+(\d{2}\s+[A-Za-z]{3}\s+\d{4})\s*(.*)$")

def parse_amount(val_str):
    val_str = val_str.replace(",", "").strip()
    try:
        return float(val_str)
    except ValueError:
        return None

months_map = {
    "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04", "May": "05", "Jun": "06",
    "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12"
}

def format_date(date_str):
    parts = date_str.split()
    if len(parts) == 3:
        day, month_name, year = parts
        month = months_map.get(month_name, "01")
        return f"{year}-{month}-{day}"
    return date_str

def clean_merchant(desc):
    desc_clean = desc.replace("M/S.", "MS ")
    if desc_clean.startswith("UPI/"):
        parts = desc_clean.split("/")
        if len(parts) > 1:
            candidate = parts[1].strip()
            # If the candidate name is just a number or too short, return the first 40 chars
            if candidate and not candidate.isdigit() and len(candidate) > 2:
                return candidate
    return desc[:40].strip()

def get_category(desc, amount):
    desc_lower = desc.lower()
    # Credit transactions (negative amount) are income
    if amount < 0:
        return "Income"
    
    if any(k in desc_lower for k in ["sweet", "food", "zomato", "swiggy", "burger", "domino", "jain", "deli", "kitchen"]):
        return "Food"
    if any(k in desc_lower for k in ["amazon", "shopping", "decathlon", "myntra", "nike", "zepto", "star bazaar", "kirana", "supermar"]):
        return "Shopping"
    if any(k in desc_lower for k in ["railway", "irctc", "travel", "ola", "uber", "cab", "rapido", "clearing"]):
        return "Travel"
    if any(k in desc_lower for k in ["spotify", "netflix", "jiohotstar", "hotstar", "youtube", "google play", "playstore"]):
        return "Entertainment"
    if any(k in desc_lower for k in ["rent", "bill", "electricity", "recharge", "tata sky", "neon-1", "broadband", "phonepe"]):
        return "Utilities"
    if any(k in desc_lower for k in ["dietico", "health", "medical", "hospital", "pharmacy"]):
        return "Health"
    
    return "Others"

def get_sentiment(desc, category, amount):
    desc_lower = desc.lower()
    if category == "Income":
        return "Happy"
    # Impulse food or shopping regrets
    if category in ["Food", "Shopping"] and amount > 500:
        if any(k in desc_lower for k in ["swiggy", "zomato", "domino", "decathlon", "amazon"]):
            return "Regret"
    return "Neutral"

raw_parsed = []
current_tx = None

# Extract line by line across all pages
for page in reader.pages:
    lines = page.extract_text().split("\n")
    for line in lines:
        line_str = line.strip()
        if not line_str:
            continue
            
        match = tx_start_pattern.match(line_str)
        if match:
            if current_tx:
                raw_parsed.append(current_tx)
            index = int(match.group(1))
            date_str = match.group(2)
            rem = match.group(3)
            current_tx = {
                "index": index,
                "date": format_date(date_str),
                "description_parts": [rem],
                "raw_amount": None,
                "balance": None
            }
            tokens = rem.split()
            if len(tokens) >= 2:
                balance_val = parse_amount(tokens[-1])
                amount_val = parse_amount(tokens[-2])
                if balance_val is not None and amount_val is not None and "." in tokens[-1] and "." in tokens[-2]:
                    current_tx["balance"] = balance_val
                    current_tx["raw_amount"] = amount_val
                    current_tx["description_parts"] = [" ".join(tokens[:-2])]
        else:
            if current_tx:
                tokens = line_str.split()
                if len(tokens) >= 2:
                    balance_val = parse_amount(tokens[-1])
                    amount_val = parse_amount(tokens[-2])
                    if balance_val is not None and amount_val is not None and "." in tokens[-1] and "." in tokens[-2]:
                        current_tx["balance"] = balance_val
                        current_tx["raw_amount"] = amount_val
                        if len(tokens) > 2:
                            current_tx["description_parts"].append(" ".join(tokens[:-2]))
                    else:
                        current_tx["description_parts"].append(line_str)
                else:
                    current_tx["description_parts"].append(line_str)

if current_tx:
    raw_parsed.append(current_tx)

# Stateful balance-difference parsing
# Kotak statement initial balance is 340.80
prev_balance = 340.80
csv_rows = []

for tx in raw_parsed:
    raw_amount = tx["raw_amount"]
    balance = tx["balance"]
    
    if balance is None or raw_amount is None:
        # Fallback if parsing missed amount (use previous balance as reference)
        balance = balance or prev_balance
        raw_amount = raw_amount or 0.0
        
    # Determine credit (deposit) vs debit (withdrawal)
    # If balance increased -> Deposit (credit) -> negative amount in our system
    # If balance decreased -> Withdrawal (debit) -> positive amount in our system
    if balance > prev_balance:
        # Deposit
        amount = -raw_amount
    else:
        # Withdrawal
        amount = raw_amount
        
    desc_text = " ".join(tx["description_parts"]).strip()
    desc_clean = re.sub(r'\s+', ' ', desc_text)
    
    merchant = clean_merchant(desc_clean)
    category = get_category(desc_clean, amount)
    sentiment = get_sentiment(desc_clean, category, amount)
    
    note = f"Salary/Transfer credit" if category == "Income" else f"UPI Transaction at {merchant}"
    
    csv_rows.append({
        "date": tx["date"],
        "merchant": merchant,
        "category": category,
        "amount": amount,
        "sentiment": sentiment,
        "note": note
    })
    
    prev_balance = balance

# Write to the destination CSV file
with open(output_csv_path, mode="w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["date", "merchant", "category", "amount", "sentiment", "note"])
    writer.writeheader()
    for row in csv_rows:
        writer.writerow(row)

print(f"Successfully converted Kotak PDF statement to {output_csv_path}")
print(f"Total Transactions Converted: {len(csv_rows)}")
