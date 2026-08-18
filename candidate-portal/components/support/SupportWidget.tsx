"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "ai";
  content: string;
}

const QUICK_QUESTIONS = [
  "What if my interview is terminated?",
  "How is the Speaking Round evaluated?",
  "What if technical issues persist?",
  "What are the rules regarding external help?"
];

function renderMessageContent(content: string) {
  const lines = content.split('\n');
  return lines.map((line, lineIdx) => {
    const parts: (string | React.ReactNode)[] = [];
    let lastIdx = 0;
    const combinedRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(\+?\d{1,3}[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})/g;
    let match;

    while ((match = combinedRegex.exec(line)) !== null) {
      if (match.index > lastIdx) {
        parts.push(line.substring(lastIdx, match.index));
      }

      const matchText = match[0];
      if (match[1]) {
        parts.push(
          <a
            key={`email-${lineIdx}-${match.index}`}
            href={`mailto:${matchText}`}
            className="text-blue-400 hover:text-blue-300 underline font-medium transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            {matchText}
          </a>
        );
      } else if (match[2]) {
        const cleanPhone = matchText.replace(/[^\d+]/g, '');
        parts.push(
          <a
            key={`phone-${lineIdx}-${match.index}`}
            href={`tel:${cleanPhone}`}
            className="text-blue-400 hover:text-blue-300 underline font-medium transition-colors"
          >
            {matchText}
          </a>
        );
      }

      lastIdx = combinedRegex.lastIndex;
    }

    if (lastIdx < line.length) {
      parts.push(line.substring(lastIdx));
    }

    return (
      <div key={lineIdx}>
        {parts.length > 0 ? parts : line}
      </div>
    );
  });
}

export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hi! I'm the Candidate Support Assistant. Ask me anything about the interview process, company culture, or technical troubleshooting." }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput !== undefined ? overrideInput : input;
    if (!textToSend.trim() || isTyping) return;
    
    const userMsg = textToSend.trim();
    if (overrideInput === undefined) {
      setInput("");
    }
    
    // Optimistic UI
    const updatedMessages: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(updatedMessages);
    setIsTyping(true);
    
    try {
      // Connect to SSE backend
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || process.env.ADMIN_API_URL || "http://localhost:8000").replace(/\/$/, "")
      const res = await fetch(`${apiBase}/api/support/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg, history: messages.slice(1) }),
      });
      
      if (!res.body) throw new Error("No body");
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      setMessages(prev => [...prev, { role: "ai", content: "" }]);
      
      let aiResponse = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.replace("data: ", "");
            if (data === "[DONE]") break;
            
            aiResponse += data;
            
            // Update the last message in state
            setMessages(prev => {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1].content = aiResponse;
              return newMsgs;
            });
          }
        }
      }
      
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "ai", content: "Sorry, I am currently unable to connect to the support server." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 sm:w-96 h-[500px] flex flex-col bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Floating Header */}
          <div className="p-4 bg-gradient-to-r from-[#C800FF] to-[#7C3AED] text-white flex items-center justify-between shadow-md">
            <div>
              <h3 className="font-display font-extrabold text-sm tracking-wide">CANDIDATE SUPPORT AI</h3>
              <p className="eyebrow text-[9px] text-white/80">LIVE TROUBLESHOOTING & FAQ</p>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          {/* Chat Messages */}
          <div className="p-4 h-72 overflow-y-auto chat-scroll bg-black/40 space-y-3" ref={scrollRef}>
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div 
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed border ${
                    msg.role === "user" 
                      ? "bg-signal/20 border-signal/30 text-white font-medium" 
                      : "bg-white/[0.03] border-white/[0.06] text-neutral-200"
                  }`}
                >
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/[0.03] border border-white/[0.06] px-3.5 py-2.5 rounded-xl flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-signal rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-signal rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-signal rounded-full animate-bounce" />
                </div>
              </div>
            )}
          </div>
          
          {/* Quick Questions / Recommended Actions */}
          {!isTyping && (
            <div className="px-3.5 py-2 flex flex-wrap gap-1 border-t border-white/[0.06] bg-black/60">
              <span className="w-full text-[9px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">SUGGESTED INQUIRIES:</span>
              {QUICK_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    handleSend(q);
                  }}
                  className="text-[11px] bg-white/[0.04] hover:bg-signal/20 hover:text-signal text-neutral-300 py-1 px-2.5 rounded-lg border border-white/[0.06] transition-colors text-left font-medium"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          
          {/* Input Area */}
          <div className="p-3 border-t border-white/[0.06] bg-black/80">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="relative flex items-center"
            >
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-2 pl-3.5 pr-10 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-signal transition-all"
                disabled={isTyping}
              />
              <button 
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-1.5 p-1.5 rounded-lg btn-primary text-white disabled:opacity-40 transition-transform hover:scale-105"
              >
                {isTyping ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full btn-primary text-white shadow-xl shadow-signal/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </div>
  );
}
