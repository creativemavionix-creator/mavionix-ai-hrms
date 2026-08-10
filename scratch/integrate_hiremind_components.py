import os
import shutil

src_components = r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard\components\recruitment"
dest_hiremind = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated\components\business\hiremind"

os.makedirs(dest_hiremind, exist_ok=True)

print(f"Copying components from {src_components} to {dest_hiremind}...")
for item in os.listdir(src_components):
    s = os.path.join(src_components, item)
    d = os.path.join(dest_hiremind, item)
    if os.path.isfile(s):
        shutil.copy2(s, d)
        print(f"  - Copied {item}")

# Also copy sampleData.ts and lib/api.ts to mavionix-integrated if needed or adapt imports
src_sample_data = r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard\lib\sampleData.ts"
dest_sample_data = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated\lib\sampleData.ts"
if os.path.exists(src_sample_data):
    shutil.copy2(src_sample_data, dest_sample_data)
    print("  - Copied lib/sampleData.ts")

src_api = r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard\lib\api.ts"
dest_api = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated\lib\api.ts"
if os.path.exists(src_api):
    shutil.copy2(src_api, dest_api)
    print("  - Copied lib/api.ts")

# Copy backend router and services if backend directory exists in mavionix-integrated
src_backend_router = r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard\backend\app\routers\recruiter_copilot.py"
dest_backend_router = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated\backend\app\routers\recruiter_copilot.py"
if os.path.exists(src_backend_router):
    os.makedirs(os.path.dirname(dest_backend_router), exist_ok=True)
    shutil.copy2(src_backend_router, dest_backend_router)
    print("  - Copied backend/app/routers/recruiter_copilot.py")

print("Files copied successfully!")
