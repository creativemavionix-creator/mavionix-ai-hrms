with open(r'candidate-portal/app/interview/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'CameraPreview' in line:
        print(f"Line {i+1}: {line.strip()}")
