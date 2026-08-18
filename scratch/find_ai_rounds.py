with open(r'lib/api.ts', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'aiRoundsApi' in line or 'listRounds' in line:
            print(f"Line {i+1}: {line.strip()}")
