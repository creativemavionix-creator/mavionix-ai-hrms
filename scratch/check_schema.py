file_path = r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard\candidate-portal\app\api\chat\route.ts"

with open(file_path, "r", encoding="utf-8") as f:
    for idx, line in enumerate(f, 1):
        if "function evaluatebehavioral" in line.lower() or "function evaluatehr" in line.lower() or "function evaluatetech" in line.lower():
            print(f"L{idx}: {line.strip()}")
