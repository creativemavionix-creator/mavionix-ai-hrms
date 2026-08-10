import zipfile
import os

zip_path = r"C:\Users\Pramod\Downloads\project.zip"
extract_to = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated"

print(f"Extracting {zip_path} to {extract_to}...")
os.makedirs(extract_to, exist_ok=True)

with zipfile.ZipFile(zip_path, 'r') as z:
    z.extractall(extract_to)

print("Extraction completed successfully!")
