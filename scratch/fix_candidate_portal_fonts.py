import os

def fix_fonts_in_file(filepath):
    if not os.path.exists(filepath):
        print(f"Error: {filepath} not found.")
        return
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    print(f"Fixing fonts and styling in: {filepath}")
    
    # Replace layout rounded classes
    content = content.replace("rounded-2xl", "rounded-radius-lg")
    content = content.replace("rounded-xl", "rounded-radius-md")
    
    # Strip or map font-mono classes in non-technical elements
    # In candidate portal, we keep font-mono ONLY for code elements or very specific logs if any,
    # but the instructions ask for Plus Jakarta Sans as UI & body default.
    content = content.replace("font-mono", "")
    
    # Replace demo buttons to use the brand gradient
    content = content.replace(
        "bg-[var(--hm-accent)] hover:bg-[var(--hm-accent-hover)] rounded-xl py-3.5",
        "bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] hover:opacity-95 rounded-radius-full py-3.5"
    )
    content = content.replace(
        "bg-[var(--hm-accent)] hover:bg-[var(--hm-accent-hover)]",
        "bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] hover:opacity-95 rounded-radius-full"
    )
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Done: {filepath}")

fix_fonts_in_file("candidate-portal/app/page.tsx")
fix_fonts_in_file("candidate-portal/app/interview/page.tsx")
