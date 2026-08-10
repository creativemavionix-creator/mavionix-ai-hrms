import zipfile

zip_path = r"C:\Users\Pramod\Downloads\project.zip"

with zipfile.ZipFile(zip_path, 'r') as z:
    for name in z.namelist():
        if name.startswith("app/(dashboard)/") and name.endswith(".tsx"):
            print(f"\n=== {name} ===")
            content = z.read(name).decode('utf-8', errors='ignore')
            lines = content.splitlines()
            for line in lines[:30]:
                print(line)
