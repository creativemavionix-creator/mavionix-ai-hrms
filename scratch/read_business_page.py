import zipfile

zip_path = r"C:\Users\Pramod\Downloads\project.zip"

with zipfile.ZipFile(zip_path, 'r') as z:
    content = z.read("app/(dashboard)/business/page.tsx").decode('utf-8', errors='ignore')
    for line in content.splitlines():
        if "BusinessModule" in line or "hrms" in line or "crm" in line or "recruit" in line or "hire" in line or "label:" in line or "id:" in line or "component" in line or "Placeholder" in line:
            print(line)
