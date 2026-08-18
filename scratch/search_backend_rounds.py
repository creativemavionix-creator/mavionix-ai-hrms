import os

search_dir = 'backend/app'
for root, dirs, files in os.walk(search_dir):
    for file in files:
        if file.endswith('.py'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                if 'start-round' in content or 'ai_interview_rounds' in content or 'report_strike' in content:
                    print(f"Match in {filepath}")
