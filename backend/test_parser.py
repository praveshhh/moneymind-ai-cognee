import pypdf
import re
import csv
from datetime import datetime

pdf_path = r"C:\Users\ADMIN\Downloads\AccountStatement_01-Apr-2025_31-Mar-2026_260630_215456.pdf"
reader = pypdf.PdfReader(pdf_path)

# Regex to match the start of a transaction: "Index Date Description..."
# e.g., "1 02 Apr 2025 UPI/Mr ABHISHEK SH/545882559465/UPI UPI-509262622485 20.00 320.80"
tx_start_pattern = re.compile(r"^\s*(\d+)\s+(\d{2}\s+[A-Za-z]{3}\s+\d{4})\s*(.*)$")

# Function to clean and parse float strings like "24,010.02" or "6.78"
def parse_amount(val_str):
    val_str = val_str.replace(",", "").strip()
    try:
        return float(val_str)
    except ValueError:
        return None

# Dictionary to map months
months_map = {
    "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04", "May": "05", "Jun": "06",
    "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12"
}

def format_date(date_str):
    # e.g., "02 Apr 2025" -> "2025-04-02"
    parts = date_str.split()
    if len(parts) == 3:
        day, month_name, year = parts
        month = months_map.get(month_name, "01")
        return f"{year}-{month}-{day}"
    return date_str

transactions = []
current_tx = None

# Extract text line-by-line across all pages
for page_num, page in enumerate(reader.pages):
    text = page.extract_text()
    lines = text.split("\n")
    
    for line in lines:
        line_str = line.strip()
        if not line_str:
            continue
            
        # Check if it's the start of a transaction
        match = tx_start_pattern.match(line_str)
        if match:
            # If we had a previous transaction, save it
            if current_tx:
                transactions.append(current_tx)
                
            index = int(match.group(1))
            date_str = match.group(2)
            rem = match.group(3)
            
            current_tx = {
                "index": index,
                "date": format_date(date_str),
                "description_parts": [rem],
                "amount": None,
                "balance": None
            }
            
            # Check if this line already contains the amounts at the end
            tokens = rem.split()
            if len(tokens) >= 2:
                # Try parsing last two tokens as floats
                balance_val = parse_amount(tokens[-1])
                amount_val = parse_amount(tokens[-2])
                
                # Check if they are valid numeric amounts (balance has to have a decimal)
                if balance_val is not None and amount_val is not None and "." in tokens[-1] and "." in tokens[-2]:
                    current_tx["balance"] = balance_val
                    current_tx["amount"] = amount_val
                    # Remove the parsed amounts from the description
                    current_tx["description_parts"] = [" ".join(tokens[:-2])]
        else:
            # It's a continuation line. Check if we are inside a transaction
            if current_tx:
                tokens = line_str.split()
                if len(tokens) >= 2:
                    balance_val = parse_amount(tokens[-1])
                    amount_val = parse_amount(tokens[-2])
                    
                    # If this line ends with valid floats, we found the amount & balance
                    if balance_val is not None and amount_val is not None and "." in tokens[-1] and "." in tokens[-2]:
                        current_tx["balance"] = balance_val
                        current_tx["amount"] = amount_val
                        # Append the rest of the line (excluding amounts) to the description
                        if len(tokens) > 2:
                            current_tx["description_parts"].append(" ".join(tokens[:-2]))
                    else:
                        # Just a description wrap line
                        current_tx["description_parts"].append(line_str)
                else:
                    # Single word wrap line
                    current_tx["description_parts"].append(line_str)

# Save the final transaction
if current_tx:
    transactions.append(current_tx)

print(f"Total transactions found: {len(transactions)}")
print("--- FIRST 15 TRANSACTIONS ---")
for t in transactions[:15]:
    description = " ".join(t["description_parts"]).strip()
    # Clean double spaces
    description = re.sub(r'\s+', ' ', description)
    print(f"#{t['index']} | Date: {t['date']} | Desc: {description[:50]}... | Amount: {t['amount']} | Balance: {t['balance']}")
