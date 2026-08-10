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
    # 1. Update the first nav items section (slice(0, 5))
    ("""                {navItems.slice(0, 5).map((item) => {
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
                })}""",
     """                {navItems.slice(0, 5).map((item) => {
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-radius-full transition-all duration-200 ease-out relative group overflow-hidden ${
                        isActive
                           ? "text-[var(--hm-accent)] bg-[var(--hm-accent-muted)] font-semibold border border-[var(--hm-accent)]/20"
                           : "text-neutral-400 hover:text-neutral-200 border border-transparent"
                      }`}
                    >
                      {!isActive && (
                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.04] transition-all duration-200 ease-out" />
                      )}
                      <item.icon className={`w-4 h-4 shrink-0 relative z-10 transition-colors duration-200 ${isActive ? "text-[var(--hm-accent)]" : "text-neutral-400 group-hover:text-neutral-200"}`} />
                      {!sidebarCollapsed && (
                        <span className="text-[11px] font-bold tracking-wide relative z-10 transition-colors duration-200 uppercase">
                          {item.label}
                        </span>
                      )}
                      {isActive && (
                        <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-[var(--hm-accent)] rounded-r-full z-20" />
                      )}
                    </button>
                  )
                })}"""),

    # 2. Update the second nav items section (slice(5))
    ("""                {navItems.slice(5).map((item) => {
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
                })}""",
     """                {navItems.slice(5).map((item) => {
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-radius-full transition-all duration-200 ease-out relative group overflow-hidden ${
                        isActive
                           ? "text-[var(--hm-accent)] bg-[var(--hm-accent-muted)] font-semibold border border-[var(--hm-accent)]/20"
                           : "text-neutral-400 hover:text-neutral-200 border border-transparent"
                      }`}
                    >
                      {!isActive && (
                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.04] transition-all duration-200 ease-out" />
                      )}
                      <item.icon className={`w-4 h-4 shrink-0 relative z-10 transition-colors duration-200 ${isActive ? "text-[var(--hm-accent)]" : "text-neutral-400 group-hover:text-neutral-200"}`} />
                      {!sidebarCollapsed && (
                        <span className="text-[11px] font-bold tracking-wide relative z-10 transition-colors duration-200 uppercase">
                          {item.label}
                        </span>
                      )}
                      {isActive && (
                        <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-[var(--hm-accent)] rounded-r-full z-20" />
                      )}
                    </button>
                  )
                })}"""),

    # 3. Update the global search bar in the navbar to make it functional
    ("""          {/* Global Search and Command Palette */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.06] rounded-full text-neutral-400 cursor-pointer w-64 max-w-sm transition-all duration-200">""",
     """          {/* Global Search and Command Palette */}
          <div onClick={() => setActiveTab("candidates")} className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.06] rounded-radius-full text-neutral-400 cursor-pointer w-64 max-w-sm transition-all duration-200">"""),
]

process_file("app/page.tsx", replacements)
