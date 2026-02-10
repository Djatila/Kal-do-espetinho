import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, Loader2 } from 'lucide-react';
import { getGeminiResponse } from '../services/geminiService';
import { ChatMessage, MenuItem } from '../types';

interface GeminiAssistantProps {
  systemInstruction: string;
  menuItems: MenuItem[];
}

const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ systemInstruction, menuItems }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Olá! Sou o Garçom Virtual do Kal. Posso sugerir um espetinho ou uma bebida especial?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await getGeminiResponse(input, systemInstruction, menuItems);

      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error("Erro no chat:", error);
      // Fallback message just in case getGeminiResponse completely fails unexpectedly
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Tive um pequeno problema técnico. Pode repetir?",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start">
      {/* Chat Window */}
      <div 
        className={`origin-bottom-left transition-all duration-300 ease-in-out ${
          isOpen 
            ? 'scale-100 opacity-100 mb-4' 
            : 'scale-0 opacity-0 mb-0 h-0 w-0 overflow-hidden'
        }`}
      >
        <div className="w-[85vw] sm:w-80 h-96 bg-neutral-900 border border-orange-500/50 rounded-2xl shadow-neon flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-neutral-950 p-4 border-b border-orange-500/20 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <h3 className="font-display font-bold text-orange-500">Garçom Virtual</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-900">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-orange-600 text-white rounded-br-none' 
                      : 'bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-bl-none'
                  }`}
                >
                  {msg.role === 'model' && (
                    <div className="flex items-center gap-1 mb-1 text-xs text-orange-400 font-bold uppercase">
                      <Bot size={12} /> Kal AI
                    </div>
                  )}
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start w-full">
                <div className="bg-neutral-800 p-3 rounded-2xl rounded-bl-none border border-neutral-700">
                  <Loader2 size={16} className="animate-spin text-orange-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Pergunte sobre os pratos..."
              className="flex-1 bg-neutral-900 text-white border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 placeholder-neutral-500"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center gap-2 bg-neutral-900 border border-orange-500/50 text-white p-4 rounded-full shadow-neon hover:shadow-neon-strong transition-all duration-300 hover:scale-105 ${isOpen ? 'bg-orange-600 border-orange-600' : ''}`}
      >
        <div className="relative">
          <MessageCircle size={24} className={isOpen ? 'text-white' : 'text-orange-500'} />
          {!isOpen && <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-ping"></span>}
        </div>
        <span className={`font-bold font-display ${isOpen ? 'text-white' : 'text-orange-500'} hidden sm:inline`}>
          {isOpen ? 'Fechar Chat' : 'Ajuda / Dicas'}
        </span>
      </button>
    </div>
  );
};

export default GeminiAssistant;