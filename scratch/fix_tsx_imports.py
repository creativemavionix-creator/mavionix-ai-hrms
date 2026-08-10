import os
import re

directory = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated"
count = 0

pattern = re.compile(r"from\s+['\"](\.\/[^'\"]+)\.tsx['\"]")

for root, dirs, files in os.walk(directory):
    if "node_modules" in root or ".next" in root:
        continue
    for f in files:
        if f.endswith(('.ts', '.tsx', '.js', '.jsx')):
            p = os.path.join(root, f)
            with open(p, "r", encoding="utf-8", errors="ignore") as file:
                txt = file.read()
            if ".tsx'" in txt or '.tsx"' in txt:
                new_txt = pattern.sub(r"from '\1'", txt)
                if new_txt != txt:
                    with open(p, "w", encoding="utf-8") as file:
                        file.write(new_txt)
                    print(f"Fixed .tsx import extension in: {p}")
                    count += 1

print(f"Cleaned .tsx extension imports in {count} files.")
