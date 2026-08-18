import os

search_dir = 'components'
for root, dirs, files in os.walk(search_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                if 'TECHNICAL ROUND' in content or 'ROUND NOT STARTED YET' in content or 'Integrity' in content:
                    print(f"Match in {filepath}")
