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

# 1. Update app/page.tsx navigation shell (sidebar + navbar)
page_replacements = [
    # Exclude system status box and insert the new profile card & workspace switcher layout
    ("""      {/* Floating Sidebar Container */}
      <div
        className={`my-4 ml-4 mb-4 ${
          sidebarCollapsed ? "w-20" : "w-68"
        } glass-panel rounded-2xl flex flex-col justify-between transition-all duration-300 z-50 shrink-0 shadow-2xl relative overflow-hidden`}
      >
        {/* Glow border overlay */}
        <div className="absolute inset-0 border border-white/[0.04] rounded-2xl pointer-events-none" />

        <div className="p-5 flex flex-col h-full overflow-hidden relative z-10">
          {/* Logo header */}
          <div className="flex items-center justify-between mb-8 px-1">
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-sm font-extrabold tracking-widest bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  HIREMIND AI
                </h1>
                <p className="text-[8px] text-neutral-500 font-medium tracking-widest uppercase mt-0.5">
                  Enterprise Recruitment
                </p>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Brain className="w-4 h-4 text-white" />
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-all ml-auto"
            >
              <ChevronRight
                className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? "" : "rotate-180"}`}
              />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5 overflow-y-auto flex-1 scrollbar-none pr-0.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-left rounded-xl transition-all duration-200 ease-out relative group overflow-hidden ${
                    isActive
                       ? "text-white font-semibold shadow-[0_0_20px_rgba(139,92,246,0.25)] border border-violet-500/30"
                       : "text-neutral-400 hover:text-neutral-200 border border-transparent"
                  }`}
                >
                  {/* Active background gradient */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600/90 to-indigo-600/90" />
                  )}
                  {/* Hover capsule indicator */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.04] transition-all duration-200 ease-out" />
                  )}
                  
                  <item.icon className={`w-4 h-4 shrink-0 relative z-10 transition-colors duration-200 ${isActive ? "text-white" : "text-neutral-400 group-hover:text-neutral-200"}`} />
                  {!sidebarCollapsed && (
                    <span className="text-xs tracking-wide relative z-10 transition-colors duration-200">
                      {item.label}
                    </span>
                  )}
                  {/* active side accent marker */}
                  {isActive && (
                    <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-white rounded-r-full z-20" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* System status box */}
          {!sidebarCollapsed && (
            <div className="mt-6 p-4 bg-white/[0.01] dark:bg-black/25 border border-white/[0.05] rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping shrink-0"></span>
                <span>SYSTEM ONLINE</span>
              </div>
              <div className="text-[10px] text-neutral-400 space-y-1">
                <div className="flex justify-between"><span>Uptime:</span> <span className="font-mono text-neutral-300">{formatUptime()}</span></div>
                <div className="flex justify-between"><span>Active Jobs:</span> <span className="font-semibold text-neutral-300">{activeJobsCount}</span></div>
                <div className="flex justify-between"><span>In Progress:</span> <span className="font-semibold text-neutral-300">{inProgressAppsCount}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>""",
     """      {/* Floating Sidebar Container */}
      <div
        className={`my-4 ml-4 mb-4 ${
          sidebarCollapsed ? "w-20" : "w-68"
        } glass-panel rounded-2xl flex flex-col justify-between transition-all duration-300 z-50 shrink-0 shadow-2xl relative overflow-hidden`}
      >
        {/* Glow border overlay */}
        <div className="absolute inset-0 border border-white/[0.04] rounded-2xl pointer-events-none" />

        <div className="p-5 flex flex-col h-full overflow-hidden relative z-10">
          {/* Workspace Switcher */}
          {!sidebarCollapsed ? (
            <div className="mb-6 px-1 flex items-center gap-2.5 bg-white/[0.01] border border-white/[0.05] rounded-xl p-2 hover:bg-white/[0.03] transition-colors cursor-pointer shrink-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-violet-500/10">
                <Brain className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 overflow-hidden text-left">
                <p className="text-[10px] font-bold text-white truncate uppercase tracking-wider">MaVionix Engine</p>
                <p className="text-[8px] text-neutral-500 truncate uppercase font-mono">Workspace v1.2</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 mb-6 mx-auto cursor-pointer shrink-0">
              <Brain className="w-4 h-4 text-white" />
            </div>
          )}

          {/* Logo header */}
          <div className="flex items-center justify-between mb-4 px-1 shrink-0">
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-[10px] font-extrabold tracking-widest bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  HIREMIND SYSTEM
                </h1>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-all ml-auto"
            >
              <ChevronRight
                className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? "" : "rotate-180"}`}
              />
            </button>
          </div>

          {/* Navigation Items split into categories */}
          <nav className="space-y-4 overflow-y-auto flex-1 scrollbar-none pr-0.5">
            <div>
              {!sidebarCollapsed && (
                <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest px-2 mb-2">RECRUITMENT OPERATIONS</p>
              )}
              <div className="space-y-1">
                {navItems.slice(0, 5).map((item) => {
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-full transition-all duration-200 ease-out relative group overflow-hidden ${
                        isActive
                           ? "text-white font-semibold shadow-[0_0_20px_rgba(139,92,246,0.2)] border border-violet-500/30"
                           : "text-neutral-400 hover:text-neutral-200 border border-transparent"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/90 to-indigo-600/90" />
                      )}
                      {!isActive && (
                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.04] transition-all duration-200 ease-out" />
                      )}
                      <item.icon className={`w-4 h-4 shrink-0 relative z-10 transition-colors duration-200 ${isActive ? "text-white" : "text-neutral-400 group-hover:text-neutral-200"}`} />
                      {!sidebarCollapsed && (
                        <span className="text-[11px] font-bold tracking-wide relative z-10 transition-colors duration-200 uppercase">
                          {item.label}
                        </span>
                      )}
                      {isActive && (
                        <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-white rounded-r-full z-20" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              {!sidebarCollapsed && (
                <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest px-2 mb-2">SYSTEM ADMINISTRATION</p>
              )}
              <div className="space-y-1">
                {navItems.slice(5).map((item) => {
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-full transition-all duration-200 ease-out relative group overflow-hidden ${
                        isActive
                           ? "text-white font-semibold shadow-[0_0_20px_rgba(139,92,246,0.25)] border border-violet-500/30"
                           : "text-neutral-400 hover:text-neutral-200 border border-transparent"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/90 to-indigo-600/90" />
                      )}
                      {!isActive && (
                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.04] transition-all duration-200 ease-out" />
                      )}
                      <item.icon className={`w-4 h-4 shrink-0 relative z-10 transition-colors duration-200 ${isActive ? "text-white" : "text-neutral-400 group-hover:text-neutral-200"}`} />
                      {!sidebarCollapsed && (
                        <span className="text-[11px] font-bold tracking-wide relative z-10 transition-colors duration-200 uppercase">
                          {item.label}
                        </span>
                      )}
                      {isActive && (
                        <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-white rounded-r-full z-20" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </nav>

          {/* User Profile Card (Bottom) */}
          <div className="border-t border-white/[0.05] pt-4 mt-2 flex items-center gap-3 shrink-0 text-left">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white uppercase shrink-0 shadow-md shadow-violet-500/10">
              PA
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-bold text-white truncate uppercase tracking-wider">Palak Arora</p>
                <p className="text-[8px] text-neutral-500 truncate uppercase font-mono">palak@hiremind.ai</p>
              </div>
            )}
          </div>
        </div>
      </div>"""),

    # Navbar breadcrumbs and command palette & action cogs update
    ("""        {/* Top bar toolbar */}
        <div className="h-20 border-b border-white/[0.05] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="text-neutral-500 font-medium tracking-wider uppercase">RECRUITMENT</span>
            <span className="text-neutral-600">/</span>
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent font-bold tracking-wider uppercase">
              {getBreadcrumbLabel()}
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-xs">""",
     """        {/* Top bar toolbar */}
        <div className="h-20 border-b border-white/[0.05] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="text-neutral-500 font-medium tracking-wider uppercase">RECRUITMENT</span>
            <span className="text-neutral-600">/</span>
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent font-bold tracking-wider uppercase">
              {getBreadcrumbLabel()}
            </span>
          </div>

          {/* Global Search and Command Palette */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.06] rounded-full text-neutral-400 cursor-pointer w-64 max-w-sm transition-all duration-200">
            <span className="text-[10px] tracking-wide font-bold uppercase font-sans">Search Command...</span>
            <kbd className="ml-auto text-[8px] bg-white/10 px-1.5 py-0.5 rounded text-neutral-300 font-mono">Ctrl+K</kbd>
          </div>
          
          <div className="flex items-center gap-4 text-xs">
            {/* Quick action trigger */}
            <button
              onClick={() => setActiveTab("candidates")}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] hover:from-[#7c3aed] hover:to-[#c026d3] text-white rounded-full text-[9px] font-bold tracking-wider uppercase transition-all duration-200 shrink-0 shadow-md shadow-violet-500/10"
            >
              + Add Candidate
            </button>""")
]

process_file("app/page.tsx", page_replacements)
