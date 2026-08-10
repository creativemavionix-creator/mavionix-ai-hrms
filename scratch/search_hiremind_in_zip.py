import zipfile
import re

zip_path = r"C:\Users\Pramod\Downloads\project.zip"

found_files = []
with zipfile.ZipFile(zip_path, 'r') as z:
    for name in z.namelist():
        lname = name.lower()
        if "hire" in lname or "recruiter" in lname or "ats" in lname or "hr" in lname:
            found_files.append(name)

print(f"Files matching 'hire', 'recruiter', 'ats', or 'hr': {len(found_files)}")
for f in found_files[:30]:
    print(f"  - {f}")
