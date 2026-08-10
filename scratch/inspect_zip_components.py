import zipfile

zip_path = r"C:\Users\Pramod\Downloads\project.zip"

with zipfile.ZipFile(zip_path, 'r') as z:
    file_list = z.namelist()

comp_files = [f for f in file_list if f.startswith("components/") and not "node_modules" in f]
print(f"Total component files in project.zip: {len(comp_files)}")
print("Sample component files:")
for f in sorted(comp_files)[:30]:
    print(f"  - {f}")
