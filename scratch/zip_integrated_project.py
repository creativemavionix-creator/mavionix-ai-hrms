import zipfile
import os

source_dir = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated"
output_zip = r"C:\Users\Pramod\Downloads\mavionix_hiremind_integrated.zip"
output_zip2 = r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard_final.zip"

def create_zip(zip_path):
    print(f"Creating zip at {zip_path}...")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(source_dir):
            if "node_modules" in root or ".next" in root:
                continue
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, source_dir)
                z.write(full_path, rel_path)

create_zip(output_zip)
create_zip(output_zip2)
print("Archives created successfully!")
