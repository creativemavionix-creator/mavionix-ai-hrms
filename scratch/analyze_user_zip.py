import zipfile
import os

zip_path = r"C:\Users\Pramod\Downloads\project.zip"

if not os.path.exists(zip_path):
    print(f"File not found: {zip_path}")
else:
    print(f"File found! Size: {os.path.getsize(zip_path)} bytes")
    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            file_list = z.namelist()
            print(f"Total files in zip: {len(file_list)}")
            print("First 30 files/folders:")
            for f in file_list[:30]:
                print(f"  - {f}")
    except Exception as e:
        print(f"Error reading zip file: {e}")
