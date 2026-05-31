import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Bot, User, ShoppingCart, Stethoscope } from "lucide-react";

interface Message { role: "user" | "bot"; text: string; products?: any[]; }

const QUICK = ["I have fever", "Headache remedies", "Cold & cough", "Vitamin deficiency", "Diabetes medicines", "Store timings"];

export default function Chatbot() {
  const { user, addToCart } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Hello! I'm your medical assistant at Fatima Medical Store 👨‍⚕️\n\nI can help you with:\n• Symptoms & medicine guidance\n• Dosage information\n• Health advice\n• Store & delivery queries\n\nPlease describe your symptoms or ask your health question!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Build history excluding the initial greeting
    const history = messages.slice(1).map(m => ({ role: m.role, text: m.text }));

    try {
      const BASE = import.meta.env.VITE_API_URL || "https://fatima-medical-api.onrender.com/api";
const res = await fetch(`${BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          customerId: user?.id,
          history
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "bot", text: data.reply, products: data.suggestedProducts }]);
    } catch {
      setMessages(prev => [...prev, { role: "bot", text: "Sorry, I couldn't connect. Please try again." }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-teal-100 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-teal-500 rounded-full flex items-center justify-center">
          <Stethoscope size={18} className="text-white" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Medical Assistant</p>
          <p className="text-xs text-green-500">● Online — Powered by Gemini AI</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === "bot" ? "bg-teal-100" : "bg-gray-200"}`}>
              {msg.role === "bot" ? <Bot size={16} className="text-teal-600" /> : <User size={16} className="text-gray-600" />}
            </div>
            <div className={`max-w-xs md:max-w-md ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-2`}>
              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "bot" ? "bg-white border border-gray-100 text-gray-800 rounded-tl-sm" : "bg-teal-500 text-white rounded-tr-sm"}`}>
                {msg.text}
              </div>
              {msg.products && msg.products.length > 0 && (
                <div className="space-y-2 w-full">
                  <p className="text-xs text-gray-500 font-medium">💊 Suggested products:</p>
                  {msg.products.map((p: any) => (
                    <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                        <p className="text-xs text-teal-600 font-semibold">₹{Number(p.price).toFixed(2)}</p>
                      </div>
                      <button onClick={() => addToCart({ id: p.id, name: p.name, price: Number(p.price) })}
                        className="bg-teal-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1">
                        <ShoppingCart size={12} /> Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
              <Bot size={16} className="text-teal-600" />
            </div>
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
              {[0, 1, 2].map(i => <span key={i} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto bg-white border-t border-gray-100">
        {QUICK.map(q => (
          <button key={q} onClick={() => send(q)}
            className="flex-shrink-0 text-xs bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1.5 rounded-full hover:bg-teal-100">
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send(input)}
          placeholder="Describe your symptoms or ask a health question..."
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-400" />
        <button onClick={() => send(input)} disabled={!input.trim() || loading}
          className="w-10 h-10 bg-teal-500 disabled:opacity-40 hover:bg-teal-600 text-white rounded-xl flex items-center justify-center">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}