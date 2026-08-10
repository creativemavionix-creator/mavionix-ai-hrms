import os

def redesign_file(filepath, rules):
    if not os.path.exists(filepath):
        print(f"Error: {filepath} not found.")
        return
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    print(f"Processing: {filepath}")
    original = content
    for old_val, new_val in rules:
        content = content.replace(old_val, new_val)
        
    if original != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Successfully updated {filepath}")
    else:
        print(f"No changes made to {filepath}")

# Rules for PipelineView.tsx
pipeline_rules = [
    ("rounded-2xl", "rounded-radius-lg"),
    ("rounded-xl", "rounded-radius-md"),
    ("rounded-full", "rounded-radius-full"),
    ("from-violet-600 to-indigo-600", "from-[#8b5cf6] to-[#d946ef]"),
]
redesign_file("components/recruitment/PipelineView.tsx", pipeline_rules)

# Rules for InterviewCenterView.tsx
interview_rules = [
    ("rounded-2xl", "rounded-radius-lg"),
    ("rounded-xl", "rounded-radius-md"),
    ("rounded-full", "rounded-radius-full"),
    ("from-violet-600 to-indigo-600", "from-[#8b5cf6] to-[#d946ef]"),
]
redesign_file("components/recruitment/InterviewCenterView.tsx", interview_rules)

# Rules for CommunicationView.tsx
communication_rules = [
    ("rounded-2xl", "rounded-radius-lg"),
    ("rounded-xl", "rounded-radius-md"),
    ("rounded-full", "rounded-radius-full"),
    ("from-violet-600 to-indigo-600", "from-[#8b5cf6] to-[#d946ef]"),
]
redesign_file("components/recruitment/CommunicationView.tsx", communication_rules)

# Rules for SettingsView.tsx
settings_rules = [
    ("rounded-2xl", "rounded-radius-lg"),
    ("rounded-xl", "rounded-radius-md"),
    ("rounded-lg", "rounded-radius-md"),
    ("rounded-full", "rounded-radius-full"),
    ("rounded-radius-full border border-violet-500/30", "rounded-radius-full border border-[var(--hm-accent)]/20"),
    ("from-violet-600 to-indigo-600", "from-[#8b5cf6] to-[#d946ef]"),
]
redesign_file("components/recruitment/SettingsView.tsx", settings_rules)

# Rules for SecurityTimelineWidget.tsx
security_rules = [
    ("rounded-2xl", "rounded-radius-lg"),
    ("rounded-xl", "rounded-radius-md"),
    ("rounded-full", "rounded-radius-full"),
]
redesign_file("components/recruitment/SecurityTimelineWidget.tsx", security_rules)

# Rules for QuestionCardEditor.tsx
question_rules = [
    ("rounded-2xl", "rounded-radius-lg"),
    ("rounded-xl", "rounded-radius-md"),
    ("rounded-full", "rounded-radius-full"),
    ("from-violet-600 to-indigo-600", "from-[#8b5cf6] to-[#d946ef]"),
]
redesign_file("components/recruitment/QuestionCardEditor.tsx", question_rules)
