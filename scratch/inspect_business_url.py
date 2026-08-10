import os

file_path = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated\app\(dashboard)\business\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

print("Checking query param handling in business/page.tsx...")
if "useSearchParams" in content:
    print("Found useSearchParams in business/page.tsx")
else:
    print("useSearchParams NOT found in business/page.tsx")
