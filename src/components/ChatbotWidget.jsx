import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { sendChatMessage } from '../api';
import {
  Bot, X, Send, Sparkles, RefreshCw, ChevronDown, MessageSquare,
  ArrowRight, Building2, Monitor, Car, LifeBuoy, FileText
} from 'lucide-react';

const QUICK_QUESTIONS = [
  { label: '🏢 How do I book a meeting room?', text: 'How do I book a meeting room in RoomBook?' },
  { label: '🖥️ How to reserve a workstation desk?', text: 'How can I reserve a workstation desk or hot desk?' },
  { label: '🚗 How to get a ParkSwift parking pass?', text: 'How do I book a parking slot and get a digital barrier pass?' },
  { label: '🎫 How to submit a Helpdesk ticket?', text: 'How do I submit a facility support ticket?' },
  { label: '📄 How does AI Invoice OCR work?', text: 'How does the multimodal AI Invoice OCR document parsing work?' },
];

export default function ChatbotWidget() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: "👋 Hi! I'm your Apexon Workplace AI Concierge. Ask me anything about booking meeting rooms, workstations, smart parking, visitor passes, invoice OCR, or submitting support tickets!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query || !query.trim() || loading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let currentMessages = [];
    setMessages(prev => {
      const userMsg = {
        id: `usr_${prev.length + 1}`,
        sender: 'user',
        text: query.trim(),
        timestamp: timeStr,
      };
      currentMessages = [...prev, userMsg];
      return currentMessages;
    });

    if (!textToSend) setInput('');
    setLoading(true);

    try {
      // Build conversation history format for API
      const history = currentMessages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ sender: m.sender, text: m.text }));

      const res = await sendChatMessage(query.trim(), history);
      setMessages(prev => [
        ...prev,
        {
          id: `bot_${prev.length + 1}`,
          sender: 'bot',
          text: res?.reply || "I'm here to help with any workplace questions!",
          timestamp: timeStr,
        }
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${prev.length + 1}`,
          sender: 'bot',
          text: "I experienced an issue fetching the answer. You can use RoomBook (/bookings) for meeting spaces, Workstations (/workstations) for desk reservations, ParkSwift (/parking) for parking slots, and Helpdesk (/helpdesk) for support tickets.",
          timestamp: timeStr,
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: "👋 Chat reset! How can I assist you with Apexon Workplace Operations today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Helper to detect navigation routes mentioned in response text
  const getActionButtons = (text) => {
    const buttons = [];
    const lower = text.toLowerCase();
    if (lower.includes('/bookings') || lower.includes('roombook')) {
      buttons.push({ label: 'Go to RoomBook', path: '/bookings', icon: Building2 });
    }
    if (lower.includes('/workstations') || lower.includes('workstation')) {
      buttons.push({ label: 'Go to Workstations', path: '/workstations', icon: Monitor });
    }
    if (lower.includes('/parking') || lower.includes('parkswift')) {
      buttons.push({ label: 'Go to ParkSwift', path: '/parking', icon: Car });
    }
    if (lower.includes('/helpdesk') || lower.includes('ticket')) {
      buttons.push({ label: 'Open Helpdesk', path: '/helpdesk', icon: LifeBuoy });
    }
    if (lower.includes('/invoices') || lower.includes('ocr')) {
      buttons.push({ label: 'Invoice OCR', path: '/invoices', icon: FileText });
    }
    return buttons;
  };

  // Basic formatting for bot responses with bold and bullet points
  const renderFormattedText = (text) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Process bold formatting **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-bold text-indigo-300">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc my-0.5 text-xs text-slate-200">
            {formattedParts}
          </li>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="my-0.5 leading-relaxed">
          {formattedParts}
        </p>
      );
    });
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end pointer-events-none">
      {/* CHATBOT POPUP WINDOW */}
      {isOpen && (
        <div className={`pointer-events-auto w-[360px] sm:w-[420px] h-[550px] max-h-[80vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden mb-4 transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-[#0a0f1d] border-indigo-500/30 text-white shadow-indigo-950/50'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-400/40'
        }`}>
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-indigo-200 relative">
                <Bot size={22} />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-indigo-800 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold tracking-tight flex items-center gap-1.5">
                  Apexon AI Assistant
                  <Sparkles size={14} className="text-yellow-300 animate-bounce" />
                </h3>
                <p className="text-[0.65rem] text-indigo-200 font-medium opacity-90">
                  Workplace Operations Concierge
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                title="Clear Chat"
                className="p-1.5 rounded-xl hover:bg-white/10 text-indigo-200 transition"
              >
                <RefreshCw size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize"
                className="p-1.5 rounded-xl hover:bg-white/10 text-white transition"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* Quick Questions Pills */}
          <div className={`p-2.5 border-b overflow-x-auto whitespace-nowrap flex items-center gap-1.5 no-scrollbar ${
            theme === 'dark' ? 'bg-[#080c18] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1 pl-1 pr-1 flex-shrink-0">
              <Sparkles size={12} /> Quick Ask:
            </span>
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q.text)}
                disabled={loading}
                className={`px-2.5 py-1 rounded-full text-[0.68rem] font-medium border transition flex-shrink-0 ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-indigo-500/50 hover:bg-indigo-500/10'
                    : 'bg-white border-slate-200 text-slate-700 hover:text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const actionButtons = !isUser ? getActionButtons(msg.text) : [];

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm text-xs ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : theme === 'dark'
                        ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                        : 'bg-slate-100 border border-slate-200 text-slate-800 rounded-bl-none'
                    }`}
                  >
                    <div className="space-y-1">
                      {isUser ? msg.text : renderFormattedText(msg.text)}
                    </div>

                    {/* Interactive Action Shortcuts */}
                    {actionButtons.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-800/60 flex flex-wrap gap-1.5">
                        {actionButtons.map((btn, idx) => {
                          const IconComp = btn.icon;
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                setIsOpen(false);
                                navigate(btn.path);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white border border-indigo-500/30 font-bold text-[0.65rem] transition flex items-center gap-1 shadow-sm"
                            >
                              <IconComp size={12} />
                              <span>{btn.label}</span>
                              <ArrowRight size={10} />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className={`text-[0.6rem] mt-1.5 text-right font-light ${
                      isUser ? 'text-indigo-200' : 'text-slate-500'
                    }`}>
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-indigo-400 py-2 px-1">
                <Bot size={16} className="animate-bounce" />
                <span className="font-semibold text-[0.7rem]">Thinking...</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse delay-150" />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse delay-300" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className={`p-3 border-t flex items-center gap-2 ${
              theme === 'dark' ? 'bg-[#080c18] border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about meeting rooms, desk booking..."
              disabled={loading}
              className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs outline-none border transition ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
              }`}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold transition shadow-md flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* FLOATING TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto p-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2.5 group relative border border-white/20"
      >
        <div className="relative">
          <Bot size={24} className="group-hover:rotate-12 transition-transform duration-300" />
          <Sparkles size={12} className="absolute -top-1 -right-1 text-yellow-300 animate-pulse" />
        </div>
        <span className="text-xs font-extrabold tracking-wide hidden sm:inline-block">
          {isOpen ? 'Close Concierge' : 'Apexon AI Concierge'}
        </span>
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-indigo-900 animate-ping absolute top-2 right-2 sm:static" />
      </button>
    </div>
  );
}
