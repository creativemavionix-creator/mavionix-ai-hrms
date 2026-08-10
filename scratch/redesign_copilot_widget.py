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
    # 1. Add imports at the top
    ("""import { recruiterCopilotApi, RecruiterCopilotResponse, RecruiterDailyBrief, CopilotCard, CopilotMatrixRow } from "@/lib/api\"""",
     """import { recruiterCopilotApi, RecruiterCopilotResponse, RecruiterDailyBrief, CopilotCard, CopilotMatrixRow } from "@/lib/api"
import { AiThinkingState } from "@/components/ui/AiComponents\""""),

    # 2. Replace loading block
    ("""            {loading && (
              <div className="flex gap-2.5 items-center text-xs text-neutral-400 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl font-bold animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-violet-400 shrink-0" />
                <span>QUERYING RECRUITER METRIC BASES & SYNTHESIZING DRAFT...</span>
              </div>
            )}""",
     """            {loading && (
              <AiThinkingState status="QUERYING METRIC BASES & SYNTHESIZING RESPONSE..." />
            )}"""),

    # 3. Update input area corner rounding to custom tokens
    ("""              <button
                onClick={toggleVoiceInput}
                type="button"
                className={`p-2.5 border text-xs rounded-xl transition-all shrink-0 active:scale-95 ${
                  isListening
                    ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse"
                    : "bg-white/[0.01] border-white/[0.08] text-neutral-400 hover:text-violet-400"
                }`}
                title={isListening ? "Listening... Speak now" : "Voice-to-Text"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={isListening ? "LISTENING... SPEAK NOW" : "ASK COPILOT... (E.G. COMPARE CANDIDATES)"}
                disabled={loading}
                className="flex-1 bg-white/[0.02] dark:bg-black/25 border border-white/[0.08] text-xs text-neutral-200 px-4 py-2.5 rounded-xl placeholder:text-neutral-500 focus:outline-none focus:border-violet-500 font-semibold"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || loading}
                className="p-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95 disabled:bg-white/[0.02] disabled:text-neutral-500 text-white rounded-xl transition-all shrink-0 active:scale-95 shadow-md shadow-violet-500/10 h-10 w-10 flex items-center justify-center"
              >""",
     """              <button
                onClick={toggleVoiceInput}
                type="button"
                className={`p-2.5 border text-xs rounded-radius-md transition-all shrink-0 active:scale-95 ${
                  isListening
                    ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse"
                    : "bg-white/[0.01] border-white/[0.08] text-neutral-400 hover:text-violet-400"
                }`}
                title={isListening ? "Listening... Speak now" : "Voice-to-Text"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={isListening ? "LISTENING... SPEAK NOW" : "ASK COPILOT... (E.G. COMPARE CANDIDATES)"}
                disabled={loading}
                className="flex-1 bg-white/[0.02] dark:bg-black/25 border border-white/[0.08] text-xs text-neutral-200 px-4 py-2.5 rounded-radius-md placeholder:text-neutral-500 focus:outline-none focus:border-violet-500 font-semibold"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || loading}
                className="p-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95 disabled:bg-white/[0.02] disabled:text-neutral-500 text-white rounded-radius-full transition-all shrink-0 active:scale-95 shadow-md shadow-violet-500/10 h-10 w-10 flex items-center justify-center"
              >"""),
]

process_file("components/recruitment/RecruiterCopilotWidget.tsx", replacements)
