import os

directory = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated"
count = 0
for root, dirs, files in os.walk(directory):
    if "node_modules" in root or ".next" in root:
        continue
    for f in files:
        if f.endswith(('.ts', '.tsx', '.js', '.jsx')):
            p = os.path.join(root, f)
            with open(p, "r", encoding="utf-8", errors="ignore") as file:
                txt = file.read()
            if "motion/react" in txt:
                txt = txt.replace("motion/react", "framer-motion")
                with open(p, "w", encoding="utf-8") as file:
                    file.write(txt)
                print(f"Fixed motion/react import in: {p}")
                count += 1

print(f"Replaced motion/react in {count} files.")
