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
    # 1. Update metric loading block in JobManagementView.tsx
    ("""  const val = (n: number | undefined) =>
    loading ? (
      <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
    ) : (
      <p className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white mt-2">{n ?? "–"}</p>
    )""",
     """  const val = (n: number | undefined) =>
    loading ? (
      <div className="w-12 h-8 bg-white/5 rounded-xl animate-pulse mt-2" />
    ) : (
      <p className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white mt-2 font-mono">{n ?? "–"}</p>
    )"""),
]

process_file("components/recruitment/JobManagementView.tsx", replacements)
