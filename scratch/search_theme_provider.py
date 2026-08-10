import os

directory = r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard"
for root, dirs, files in os.walk(directory):
    if "node_modules" in root or ".next" in root:
        continue
    for f in files:
        if f.endswith(('.ts', '.tsx')):
            p = os.path.join(root, f)
            with open(p, "r", encoding="utf-8", errors="ignore") as file:
                txt = file.read()
            if "export function useTheme" in txt or "export const useTheme" in txt:
                print(f"Found theme definition in: {p}")
