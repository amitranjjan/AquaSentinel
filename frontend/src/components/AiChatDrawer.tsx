import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Bot,
  User,
  Sparkles,
  HelpCircle,
  Thermometer,
  Droplet,
  Activity,
  Loader2
} from 'lucide-react';
import type { ChatMessage, WaterQuality, SensorStatus, FarmProfile } from '../types';

interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isSending: boolean;
  waterQuality: WaterQuality;
  sensorStatus: SensorStatus;
  farmProfile: FarmProfile;
}

const SUGGESTED_QUESTIONS = [
  "What should I do now?",
  "Why is my pH high?",
  "Is this temperature suitable for my fish?",
  "What should I check when turbidity is high?",
  "Why are my fish not feeding normally?",
  "How often should I monitor the water?",
  "Explain this alert in simple language."
];

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  isSending,
  waterQuality,
  sensorStatus,
  farmProfile
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    const msg = input.trim();
    setInput('');
    await onSendMessage(msg);
  };

  const handlePromptClick = (question: string) => {
    if (isSending) return;
    onSendMessage(question);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                AquaSentinel AI Assistant
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Gemini Chat
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Pond Telemetry & Aquaculture Decision Support
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Telemetry Snapshot Strip */}
        <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Telemetry Context:</span>
          {waterQuality.temperature !== null || waterQuality.ph !== null ? (
            <div className="flex items-center gap-3 font-mono">
              <span className="flex items-center gap-1 text-amber-400">
                <Thermometer className="w-3 h-3" />
                {waterQuality.temperature !== null ? `${waterQuality.temperature}°C` : 'Err'}
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <Activity className="w-3 h-3" />
                {waterQuality.ph !== null ? `pH ${waterQuality.ph}` : 'Err'}
              </span>
              <span className="flex items-center gap-1 text-cyan-400">
                <Droplet className="w-3 h-3" />
                {waterQuality.turbidity !== null ? `${waterQuality.turbidity} NTU` : 'Err'}
              </span>
            </div>
          ) : (
            <span className="text-slate-500 font-mono text-[11px]">
              BLE Disconnected (Connect device for live telemetry)
            </span>
          )}
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white">
                Ask Gemini anything about your pond
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                AquaSentinel grounds every response in your live sensor telemetry and{' '}
                <span className="text-cyan-300 font-semibold">{farmProfile.fishSpecies}</span> tolerances.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs sm:text-sm ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'model' && (
                  <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-xs shadow-md'
                      : 'bg-slate-800/90 border border-slate-700/80 text-slate-200 rounded-tl-xs'
                  }`}
                >
                  <div className="whitespace-pre-line break-words">{msg.text}</div>
                  <div className="mt-1 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>{msg.timestamp}</span>
                    {msg._source && <span className="font-mono text-[9px]">({msg._source})</span>}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {isSending && (
            <div className="flex gap-3 text-xs items-center text-cyan-400 animate-pulse">
              <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <span>Gemini is evaluating water telemetry and drafting response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts (PRD Section 7) */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 mb-2">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Suggested Farmer Questions:</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handlePromptClick(q)}
                disabled={isSending}
                className="shrink-0 px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-900 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${farmProfile.fishSpecies} or water alerts...`}
            disabled={isSending}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-medium text-xs sm:text-sm flex items-center justify-center transition-colors"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
