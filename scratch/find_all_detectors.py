import os
import zipfile

zpaths = [
    r"C:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard_final.zip",
    r"C:\Users\Pramod/hr-dashboard 2 (1)\hr-dashboard\hiremind-checkpoint-a.zip",
    r"C:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard\hiremind-project-checkpoint.zip"
]

for zpath in zpaths:
    if not os.path.exists(zpath):
        continue
    print(f"\nChecking {zpath}...")
    with zipfile.ZipFile(zpath, 'r') as z:
        for name in z.namelist():
            if 'camera_detector' in name or 'camera' in name:
                print(f"  Found: {name}")
                content = z.read(name).decode('utf-8', errors='ignore')
                outname = f"scratch/extracted_{os.path.basename(name)}"
                with open(outname, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"  Saved to {outname}")
