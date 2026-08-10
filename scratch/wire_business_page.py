file_path = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated\app\(dashboard)\business\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add import
import_line = "import HireMindWorkspace from \"@/components/business/hiremind/HireMindWorkspace\";\n"
if "HireMindWorkspace" not in content:
    content = import_line + content

# Replace HrmsModuleView placeholder with HireMindWorkspace
if "<HrmsModuleView />" in content:
    content = content.replace("<HrmsModuleView />", "<HireMindWorkspace onBack={() => setActiveModule(\"crm\")} />")
elif "activeModule === \"hrms\"" in content:
    content = re.sub(r'\{activeModule === "hrms" && .*?\}', '{activeModule === "hrms" && <HireMindWorkspace onBack={() => setActiveModule("crm")} />}', content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully wired HireMindWorkspace into business/page.tsx!")
