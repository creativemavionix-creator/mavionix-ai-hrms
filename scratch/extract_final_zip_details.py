import os
import zipfile

zpath = r"C:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard_final.zip"
with zipfile.ZipFile(zpath, 'r') as z:
    for name in z.namelist():
        if 'camera' in name.lower() or 'integrity' in name.lower() or 'round' in name.lower() or 'pipeline' in name.lower():
            print(name)
