import os

filepath = "backend/app/services/ai_interviews.py"
with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()

def_line = -1
for idx, line in enumerate(lines):
    if "def _call_gemini" in line:
        def_line = idx
        break

if def_line != -1:
    for i in range(def_line, min(def_line + 40, len(lines))):
        print(f"{i+1}: {lines[i]}", end="")
else:
    print("_call_gemini not found in lines")
