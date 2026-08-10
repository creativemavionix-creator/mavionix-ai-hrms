import os

filepath = "components/recruitment/CandidateManagementView.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "type=\"file\"" in line or "handleUpload" in line or "upload" in line.lower():
        print(f"Line {idx+1}: {line.strip()}")
