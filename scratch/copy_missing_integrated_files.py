import os
import shutil

# Copy components/ui/AiComponents.tsx
src_ai_comp = r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard\components\ui\AiComponents.tsx"
dest_ai_comp = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated\components\ui\AiComponents.tsx"

if os.path.exists(src_ai_comp):
    os.makedirs(os.path.dirname(dest_ai_comp), exist_ok=True)
    shutil.copy2(src_ai_comp, dest_ai_comp)
    print("Copied components/ui/AiComponents.tsx")

# Copy lib/integrity folder
src_integrity = r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard\lib\integrity"
dest_integrity = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated\lib\integrity"

if os.path.exists(src_integrity):
    if os.path.exists(dest_integrity):
        shutil.rmtree(dest_integrity)
    shutil.copytree(src_integrity, dest_integrity)
    print("Copied lib/integrity folder")

print("Copy completed successfully!")
