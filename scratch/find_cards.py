import os

directory = "components/recruitment"
for filename in os.listdir(directory):
    if filename.endswith(".tsx"):
        path = os.path.join(directory, filename)
        with open(path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        for idx, line in enumerate(lines):
            if "rounded-" in line or "glass-card" in line or "flat-card" in line:
                print(f"{filename}:{idx+1} -> {line.strip()}")
