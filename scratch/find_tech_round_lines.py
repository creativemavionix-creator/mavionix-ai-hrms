with open(r'components/recruitment/CandidateManagementView.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'TECHNICAL ROUND' in line or 'ROUND NOT STARTED YET' in line or 'INTEGRITY SHIELD' in line:
        print(f"Line {i+1}: {line.strip()}")
