file_path = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated\components\business\hiremind\DashboardView.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("onNavigate(", "onNavigate?.(")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated onNavigate optional chaining in DashboardView.tsx successfully!")
