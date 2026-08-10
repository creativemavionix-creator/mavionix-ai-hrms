import os

def process_file(filepath, replacements):
    if os.path.exists(filepath):
        print(f"Processing: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        for target, replacement in replacements:
            content = content.replace(target, replacement)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Saved: {filepath}")
    else:
        print(f"Error: {filepath} not found!")

replacements = [
    # 1. Update row1Cards loading block with skeleton lines
    ("""                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
                  ) : (
                    <div className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">{c.val}</div>
                  )}""",
     """                  {loading ? (
                    <div className="w-12 h-8 bg-white/5 rounded-xl animate-pulse" />
                  ) : (
                    <div className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono">{c.val}</div>
                  )}"""),

    # 2. Update row2Cards loading block with skeleton lines
    ("""                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
                  ) : (
                    <div className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">{c.val}</div>
                  )}""",
     """                  {loading ? (
                    <div className="w-12 h-8 bg-white/5 rounded-xl animate-pulse" />
                  ) : (
                    <div className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono">{c.val}</div>
                  )}"""),
]

process_file("components/recruitment/DashboardView.tsx", replacements)
