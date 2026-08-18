import os, glob

search_dirs = [
    r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard\app",
    r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard\components",
    r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard\lib",
    r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard\context",
]

terms = ["localStorage", "sessionStorage", "hiremind_token", "hiremind_portal_view_mode", "hiremind_", "supabase.auth", "get_current_user", "get_current_candidate", "Authorization"]

results = {term: [] for term in terms}

for sdir in search_dirs:
    for root, dirs, files in os.walk(sdir):
        for file in files:
            if file.endswith((".ts", ".tsx", ".js", ".jsx")):
                fpath = os.path.join(root, file)
                relpath = os.path.relpath(fpath, r"c:\Users\Pramod\hr-dashboard 2 (1)\hr-dashboard")
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    for line_num, line in enumerate(f, 1):
                        for term in terms:
                            if term in line:
                                results[term].append(f"{relpath}:{line_num}: {line.strip()[:120]}")

print("=== SESSION AUDIT SEARCH RESULTS ===")
for term, matches in results.items():
    print(f"\n--- TERM: {term} ({len(matches)} matches) ---")
    for match in matches[:25]: # limit output
        print("  ", match)
