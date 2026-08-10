import zipfile
import json

zip_path = r"C:\Users\Pramod\Downloads\project.zip"

with zipfile.ZipFile(zip_path, 'r') as z:
    try:
        pkg_content = z.read("package.json").decode('utf-8')
        pkg = json.loads(pkg_content)
        print("Main package.json Name:", pkg.get("name"))
        print("Main package.json Dependencies:", list(pkg.get("dependencies", {}).keys())[:15])
    except Exception as e:
        print("Error reading root package.json:", e)

    # Check dashboard routes or components
    print("\nDashboard route files in app/(dashboard):")
    for f in z.namelist():
        if f.startswith("app/(dashboard)/") and f.endswith("page.tsx"):
            print(f"  - {f}")
