import os

directory = "backend/app/services"
for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            if "_call_gemini" in content:
                print(f"Found in: {path}")
