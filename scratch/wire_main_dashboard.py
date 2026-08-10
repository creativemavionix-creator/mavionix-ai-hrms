import re

file_path = r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated\app\(dashboard)\dashboard\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

print("Read dashboard/page.tsx, checking content...")
if "HireMind" not in content:
    # Add HireMind quick launcher card snippet or link
    card_snippet = """
          {/* HireMind AI Recruiter Suite Card */}
          <Link href="/business?module=hrms">
            <Card className="glass-card border-white/[0.08] hover:border-violet-500/40 p-5 rounded-2xl transition-all cursor-pointer group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-500/10 border border-violet-500/25 flex items-center justify-center rounded-xl text-violet-400">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-white group-hover:text-violet-400 transition-colors">
                        HireMind AI Platform
                      </h3>
                      <span className="text-[9px] bg-violet-500/15 border border-violet-500/30 text-violet-400 px-2 py-0.5 rounded-full font-bold uppercase">
                        INTEGRATED
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      ATS, AI Resume Screening, Candidate Dossiers & Recruiter Copilot
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-violet-400 transition-colors" />
              </div>
            </Card>
          </Link>
    """
    # Insert before the end of quick action grid
    if "</Card>" in content:
        content = content.replace("</Card>", "</Card>\n" + card_snippet, 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated dashboard/page.tsx successfully!")
