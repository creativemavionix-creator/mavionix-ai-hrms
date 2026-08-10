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

# 1. recruiter app globals.css updates
recruiter_replacements = [
    # Custom light mode custom variables
    ("""    /* HireMind custom properties mapping to purple theme */
    --hm-bg-primary: #f6f5fa;
    --hm-bg-card: #ffffff;
    --hm-bg-elevated: #faf9fd;
    --hm-bg-inset: #f0edf6;
    --hm-text-primary: #09090b;
    --hm-text-secondary: #52525b;
    --hm-text-muted: #8e8e93;
    --hm-border: #e4e4e7;
    --hm-border-subtle: #f4f4f5;
    --hm-accent: #7c3aed;
    --hm-accent-muted: rgba(124, 58, 237, 0.08);""",
     """    /* HireMind custom properties mapping to purple theme (linked to shared/design-tokens.ts) */
    --hm-bg-primary: #f6f5fa;
    --hm-bg-card: #ffffff;
    --hm-bg-elevated: #faf9fd;
    --hm-bg-inset: #f0edf6;
    --hm-text-primary: #09090b;
    --hm-text-secondary: #52525b;
    --hm-text-muted: #8e8e93;
    --hm-border: #e4e4e7;
    --hm-border-subtle: #f4f4f5;
    --hm-accent: #7c3aed;
    --hm-accent-muted: rgba(124, 58, 237, 0.08);
    --hm-accent-gradient: linear-gradient(135deg, #8b5cf6, #d946ef);"""),

    # Custom dark mode custom variables and background hsl shift
    ("""    --background: 245 42% 8%;         /* #0d0c1d */
    --foreground: 240 5% 96%;         /* #f4f4f5 */
    --card: 235 34% 14%;              /* #16182e */""",
     """    --background: 249 28% 5%;         /* #0a0910 */
    --foreground: 240 5% 96%;         /* #f4f4f5 */
    --card: 250 24% 10%;              /* #15131f */"""),

    ("""    /* Custom properties mapping to purple theme */
    --hm-bg-primary: #0d0c1d;
    --hm-bg-card: #16182e;
    --hm-bg-elevated: #222648;
    --hm-bg-inset: #0f0e24;
    --hm-text-primary: #f4f4f5;
    --hm-text-secondary: #a1a1aa;
    --hm-text-muted: #71717a;
    --hm-border: rgba(255, 255, 255, 0.12);
    --hm-border-subtle: rgba(255, 255, 255, 0.06);
    --hm-accent: #8b5cf6;
    --hm-accent-muted: rgba(139, 92, 246, 0.15);""",
     """    /* Custom properties mapping to purple theme (linked to shared/design-tokens.ts) */
    --hm-bg-primary: #0a0910;
    --hm-bg-card: #15131f;
    --hm-bg-elevated: #1c1a29;
    --hm-bg-inset: #0d0c14;
    --hm-text-primary: #f4f4f5;
    --hm-text-secondary: #a1a1aa;
    --hm-text-muted: #71717a;
    --hm-border: rgba(255, 255, 255, 0.12);
    --hm-border-subtle: rgba(255, 255, 255, 0.06);
    --hm-accent: #8b5cf6;
    --hm-accent-muted: rgba(139, 92, 246, 0.15);
    --hm-accent-gradient: linear-gradient(135deg, #8b5cf6, #d946ef);"""),

    # Add featured-card and flat-card utility styling
    (""".glass-card {
  @apply backdrop-blur-md border transition-all duration-300;
  background-color: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.05);
}""",
     """.glass-card {
  @apply backdrop-blur-md border transition-all duration-300;
  background-color: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.05);
}
.flat-card {
  @apply border transition-all duration-300;
  background-color: var(--hm-bg-card);
  border-color: var(--hm-border);
}
.featured-card {
  @apply backdrop-blur-md border transition-all duration-300 relative overflow-hidden;
  background-color: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.05);
}
.dark .featured-card {
  background-color: rgba(22, 24, 46, 0.8);
  border-color: rgba(255, 255, 255, 0.12);
}
.featured-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--hm-accent-gradient);
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
}"""),
]

process_file("app/globals.css", recruiter_replacements)

# 2. candidate portal globals.css updates
candidate_replacements = [
    # Custom light/dark vars
    ("""    --background: 245 42% 8%;         /* #0d0c1d */
    --foreground: 240 5% 96%;
    --card: 235 34% 14%;              /* #16182e */""",
     """    --background: 249 28% 5%;         /* #0a0910 */
    --foreground: 240 5% 96%;
    --card: 250 24% 10%;              /* #15131f */"""),

    ("""    /* HireMind design tokens — matching main portal design rules */
    --hm-bg-primary: #0d0c1d;
    --hm-bg-card: #16182e;
    --hm-bg-elevated: #222648;
    --hm-bg-inset: #0f0e24;
    --hm-text-primary: #f4f4f5;
    --hm-text-secondary: #a1a1aa;
    --hm-text-muted: #71717a;
    --hm-border: rgba(255, 255, 255, 0.12);
    --hm-border-subtle: rgba(255, 255, 255, 0.06);
    --hm-accent: #8b5cf6;
    --hm-accent-hover: #7c3aed;
    --hm-accent-muted: rgba(139, 92, 246, 0.15);""",
     """    /* HireMind design tokens — matching main portal design rules (linked to shared/design-tokens.ts) */
    --hm-bg-primary: #0a0910;
    --hm-bg-card: #15131f;
    --hm-bg-elevated: #1c1a29;
    --hm-bg-inset: #0d0c14;
    --hm-text-primary: #f4f4f5;
    --hm-text-secondary: #a1a1aa;
    --hm-text-muted: #71717a;
    --hm-border: rgba(255, 255, 255, 0.12);
    --hm-border-subtle: rgba(255, 255, 255, 0.06);
    --hm-accent: #8b5cf6;
    --hm-accent-hover: #7c3aed;
    --hm-accent-muted: rgba(139, 92, 246, 0.15);
    --hm-accent-gradient: linear-gradient(135deg, #8b5cf6, #d946ef);"""),
]

process_file("candidate-portal/app/globals.css", candidate_replacements)
