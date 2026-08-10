import os

directory = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated"
found = []

for root, dirs, files in os.walk(directory):
    if "node_modules" in root or ".next" in root:
        continue
    for f in files:
        if f.endswith(('.ts', '.tsx')):
            p = os.path.join(root, f)
            with open(p, "r", encoding="utf-8", errors="ignore") as file:
                txt = file.read()
            if "Business Operations" in txt or "Developer Suite" in txt or "Creative AI Lab" in txt:
                found.append(p)

print(f"Files containing sidebar links ({len(found)}):")
for f in found:
    print(f"  - {f}")
