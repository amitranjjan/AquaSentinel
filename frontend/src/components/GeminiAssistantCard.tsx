import React from 'react';
import {
  Bot,
  RefreshCw,
  MessageSquare,
  FileText,
  AlertCircle,
  CheckCircle,
  Eye,
  Info,
  Clock
} from 'lucide-react';
import type { AiRecommendation, UrgencyLevel } from '../types';

interface GeminiAssistantCardProps {
  advice: AiRecommendation | null;
  isLoading: boolean;
  onRefresh: () => void;
  onAskGemini: () => void;
  onViewDetails: () => void;
  cooldownSeconds?: number;
  triggerNotification?: string | null;
  isConnected: boolean;
}

export const GeminiAssistantCard: React.FC<GeminiAssistantCardProps> = ({
  advice,
  isLoading,
  onRefresh,
  onAskGemini,
  onViewDetails,
  cooldownSeconds = 0,
  triggerNotification,
  isConnected
}) => {
  const getUrgencyBadge = (urgency: UrgencyLevel = 'LOW') => {
    switch (urgency) {
      case 'LOW':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
            LOW URGENCY
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 uppercase">
            MEDIUM URGENCY
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
            HIGH URGENCY
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase animate-pulse">
            CRITICAL URGENCY
          </span>
        );
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs p-6 lg:p-7 relative overflow-hidden">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 shadow-xs flex items-center justify-center">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Gemini Fish-Culture Assistant
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 uppercase">
                PROMPT GROUNDED
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Sensor-aware aquaculture guidance tailored to species comfort ranges
            </p>
          </div>
        </div>

        {/* Urgency Badge */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {advice && getUrgencyBadge(advice.urgency)}
        </div>
      </div>

      {/* Trigger alert notification strip */}
      {triggerNotification && (
        <div className="mt-4 px-4 py-2.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Auto-analysis triggered: {triggerNotification}</span>
          </div>
          {cooldownSeconds > 0 && (
            <div className="flex items-center gap-1.5 text-sky-700 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>Cool down: {cooldownSeconds}s</span>
            </div>
          )}
        </div>
      )}

      {/* Main Guidance Content */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-sky-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-700">
            Synthesizing biological analysis with Gemini AI...
          </p>
          <p className="text-xs text-slate-400 max-w-sm">
            Cross-referencing telemetry points with aquaculture physiology knowledge
          </p>
        </div>
      ) : advice ? (
        <div className="mt-5 space-y-4">
          {/* Situation Box */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 uppercase tracking-wider mb-2">
              <Eye className="w-4 h-4 text-sky-600" />
              <span>CURRENT SITUATION</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
              <p className="text-slate-800 font-medium text-sm italic">
                "{advice.summary}"
              </p>
              {advice.reason && (
                <p className="text-xs text-slate-600 mt-1.5">
                  <strong className="text-slate-700">Diagnostic Factor:</strong> {advice.reason}
                </p>
              )}
            </div>
          </div>

          {/* Action Points */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>WHAT TO DO NOW</span>
            </div>
            <div className="space-y-2">
              {advice.whatToDoNow && advice.whatToDoNow.length > 0 ? (
                advice.whatToDoNow.map((action, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-sky-50/40 border border-sky-100/80 flex items-center gap-3 text-slate-800 text-xs sm:text-sm font-medium"
                  >
                    <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {idx + 1}
                    </span>
                    <span>{action}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">No emergency actions required. Maintain standard protocol.</p>
              )}
            </div>
          </div>

          {/* Monitoring recommendations & Source */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-sky-800 uppercase">MONITOR:</span>
              {advice.monitor && advice.monitor.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  {item}
                </span>
              ))}
            </div>

            <div className="text-xs text-slate-400">
              Source: <span className="font-semibold text-slate-600">{advice._source || 'AquaSentinel Expert Rule Engine (Standalone Mode)'}</span>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={onAskGemini}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white flex items-center gap-2 shadow-sm shadow-sky-500/20 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask Gemini</span>
              </button>

              <button
                onClick={onRefresh}
                disabled={cooldownSeconds > 0}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cooldownSeconds > 0 ? 'animate-spin' : ''}`} />
                <span>Refresh Suggestion</span>
              </button>
            </div>

            <button
              onClick={onViewDetails}
              className="text-sky-600 hover:text-sky-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Details</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-slate-400 text-xs">
          <p>No active recommendations. Click "Refresh Suggestion" to request advice.</p>
        </div>
      )}

      {/* Safety Guardrail / Disclaimer Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span>
          Decision Support System: AI guidance assists daily management. Always follow verified local aquaculture protocols for critical emergencies.
        </span>
      </div>
    </div>
  );
};
