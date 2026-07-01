import subprocess
import sys

try:
    import pypdf
except ImportError:
    print("Installing pypdf...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf"])
    import pypdf

pdf_path = r"C:\Users\ADMIN\Downloads\AccountStatement_01-Apr-2025_31-Mar-2026_260630_215456.pdf"
reader = pypdf.PdfReader(pdf_path)
page_text = reader.pages[0].extract_text()
print("--- PAGE 1 TEXT START ---")
print(page_text[:1500])
print("--- PAGE 1 TEXT END ---")
