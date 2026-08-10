import os
import shutil

src_theme = r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard\lib\theme.ts"
dest_theme = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated\lib\theme.ts"

if os.path.exists(src_theme):
    shutil.copy2(src_theme, dest_theme)
    print("Copied lib/theme.ts")
else:
    print("lib/theme.ts not found in hr-dashboard")
