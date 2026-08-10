import os

files = ["backend/app/routers/candidates.py", "backend/app/routers/jobs.py"]
for fpath in files:
    if os.path.exists(fpath):
        with open(fpath, "r", encoding="utf-8") as f:
            lines = f.readlines()
        print(f"--- {fpath} ---")
        for idx, line in enumerate(lines):
            if "@router.delete" in line or "@router.post" in line or "@router.patch" in line:
                print(f"{idx+1}: {line.strip()}")
