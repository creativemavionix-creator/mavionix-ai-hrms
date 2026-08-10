import zipfile
import re

zip_path = r"C:\Users\Pramod\Downloads\project.zip"

matches = []
with zipfile.ZipFile(zip_path, 'r') as z:
    for name in z.namelist():
        if "node_modules/" in name or ".next/" in name or name.endswith("/"):
            continue
        if name.endswith(('.tsx', '.ts', '.jsx', '.js', '.json', '.md')):
            try:
                content = z.read(name).decode('utf-8', errors='ignore')
                if re.search(r'\b(hiremind|hire mind|recruitment|recruiter|ats|talent)\b', content, re.IGNORECASE):
                    matches.append((name, content[:100]))
            except Exception:
                pass

print(f"Total non-node_modules matches: {len(matches)}")
for m, snippet in matches[:20]:
    print(f"File: {m}")
