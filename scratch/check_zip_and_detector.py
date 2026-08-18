import os
import zipfile

parent_dir = r"C:\Users\Pramod\hr-dashboard 2 (1)"
current_dir = r"C:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard"

zip_candidates = [
    os.path.join(parent_dir, "hr-dashboard_final.zip"),
    os.path.join(current_dir, "hiremind-checkpoint-a.zip"),
    os.path.join(current_dir, "hiremind-project-checkpoint.zip"),
]

for zpath in zip_candidates:
    if os.path.exists(zpath):
        print(f"FOUND ZIP: {zpath} (Size: {os.path.getsize(zpath)} bytes)")
        try:
            with zipfile.ZipFile(zpath, 'r') as z:
                files = z.namelist()
                print(f"  Total files in zip: {len(files)}")
                camera_files = [f for f in files if 'camera' in f.lower() or 'integrity' in f.lower()]
                print(f"  Camera/Integrity files in zip: {camera_files[:10]}")
        except Exception as e:
            print(f"  Error reading zip: {e}")
    else:
        print(f"NOT FOUND: {zpath}")
