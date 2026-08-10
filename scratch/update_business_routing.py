file_path = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated\app\(dashboard)\business\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Make initial activeModule read search params
old_state = 'const [activeModule, setActiveModule] = useState<BusinessModule>("crm");'
new_state = '''const [activeModule, setActiveModule] = useState<BusinessModule>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tool") || params.get("module");
      if (t === "hrms" || t === "recruitment" || t === "hiremind") return "hrms";
    }
    return "hrms";
  });'''

if old_state in content:
    content = content.replace(old_state, new_state)

# Add activeModule === "hrms" full screen check
if 'if (activeModule === "hrms")' not in content:
    crm_check = '''  if (activeModule === "crm") {
    return (
      <div className="h-[calc(100vh-4rem)] overflow-y-auto w-full bg-surface border-l border-border/20">
        <LeadCrmWorkspace
          onBack={() => setActiveModule("hrms")}
          onViewChange={() => {}}
        />
      </div>
    );
  }'''

    hrms_check = '''  if (activeModule === "hrms") {
    return (
      <div className="h-[calc(100vh-4rem)] overflow-y-auto w-full bg-surface border-l border-border/20 p-6">
        <HireMindWorkspace onBack={() => setActiveModule("crm")} />
      </div>
    );
  }

  if (activeModule === "crm") {
    return (
      <div className="h-[calc(100vh-4rem)] overflow-y-auto w-full bg-surface border-l border-border/20">
        <LeadCrmWorkspace
          onBack={() => setActiveModule("hrms")}
          onViewChange={() => {}}
        />
      </div>
    );
  }'''

    if crm_check in content:
        content = content.replace(crm_check, hrms_check)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated BusinessSuitePage routing in business/page.tsx!")
