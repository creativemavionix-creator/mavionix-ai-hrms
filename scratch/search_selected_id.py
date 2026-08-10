with open("components/recruitment/CandidateManagementView.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "selectedId" in line:
        print(f"{idx+1}: {line.strip()}")
