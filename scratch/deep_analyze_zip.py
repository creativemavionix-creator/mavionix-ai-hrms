import zipfile

zip_path = r"C:\Users\Pramod\Downloads\project.zip"

with zipfile.ZipFile(zip_path, 'r') as z:
    file_list = z.namelist()

top_dirs = set()
for f in file_list:
    parts = f.split('/')
    if len(parts) > 1:
        top_dirs.add(parts[0])

print("Top Level Directories in project.zip:")
for d in sorted(top_dirs):
    print(f"  - {d}")

print("\nSearching for App.tsx or main entry points:")
for f in file_list:
    if f.endswith("App.tsx") or f.endswith("App.jsx") or f.endswith("page.tsx") or f.endswith("package.json"):
        if not "node_modules" in f:
            print(f"  - {f}")
