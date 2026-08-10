import os
import shutil

src = r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard\lib\theme.tsx"
dest = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated\lib\theme.tsx"

if os.path.exists(src):
    shutil.copy2(src, dest)
    print("Copied lib/theme.tsx successfully!")
else:
    print("lib/theme.tsx not found!")
