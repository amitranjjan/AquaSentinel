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
  Clock,
  Bluetooth
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
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            LOW URGENCY
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            MEDIUM URGENCY
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            HIGH URGENCY
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/30 text-red-200 border border-red-500/60 animate-pulse">
            CRITICAL URGENCY
          </span>
        );
    }
  };

  return (
    <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-cyan-950/20 shadow-2xl p-6 lg:p-7 relative overflow-hidden">
      {/* Decorative accent glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-md shadow-cyan-500/10">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Gemini Fish-Culture Assistant
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30">
                PROMPT GROUNDED
              </span>
            </div>
            <p className="text-xs text-slate-400">
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
        <div className="mt-4 px-3.5 py-2 rounded-xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{triggerNotification}</span>
          </div>
          {cooldownSeconds > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
              <Clock className="w-3 h-3 text-cyan-400" />
              Cooldown: {cooldownSeconds}s
            </span>
          )}
        </div>
      )}

      {/* Card Body */}
      {!isConnected ? (
        <div className="py-8 text-center space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-400">
            <Bluetooth className="w-6 h-6 text-slate-500 animate-pulse" />
          </div>
          <h4 className="text-sm font-semibold text-slate-300">
            Awaiting BLE Sensor Telemetry
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Gemini AI recommendations require an active Bluetooth Low Energy connection with the AquaSentinel ESP32 node. Connect your device above to begin live analysis.
          </p>
        </div>
      ) : isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <Bot className="w-5 h-5 text-cyan-400 absolute inset-0 m-auto" />
          </div>
          <p className="text-sm font-medium text-cyan-300 animate-pulse">
            Gemini is analyzing pond telemetry & fish biology...
          </p>
        </div>
      ) : advice ? (
        <div className="mt-5 space-y-5">
          {/* 1. Current Situation */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              Current Situation
            </h3>
            <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/60 text-slate-200 text-sm leading-relaxed">
              <blockquote className="italic font-normal">
                "{advice.summary}"
              </blockquote>
              {advice.reason && (
                <p className="mt-2 text-xs text-slate-400 border-t border-slate-700/60 pt-2">
                  <span className="font-semibold text-slate-300">Diagnostic Factor: </span>
                  {advice.reason}
                </p>
              )}
            </div>
          </div>

          {/* 2. What To Do Now */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              What To Do Now
            </h3>
            <div className="grid gap-2">
              {advice.whatToDoNow && advice.whatToDoNow.length > 0 ? (
                advice.whatToDoNow.map((action, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-200">
                      {action}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">Continue routine monitoring.</p>
              )}
            </div>
          </div>

          {/* 3. Monitor Tags */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
                Monitor:
              </span>
              {advice.monitor?.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 shadow-sm"
                >
                  • {item}
                </span>
              ))}
            </div>

            {advice._source && (
              <span className="text-[11px] text-slate-500 font-mono">
                Source: {advice._source}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-slate-400 text-sm">
          No analysis requested yet. Click below to ask Gemini for a pond assessment.
        </div>
      )}

      {/* Action Buttons (Section 5) */}
      <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onAskGemini}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-cyan-600/25 transition-all active:scale-95"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Ask Gemini</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoading || !isConnected}
            title={!isConnected ? "BLE connection required to refresh" : "Refresh AI guidance"}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-slate-700 text-xs sm:text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Suggestion</span>
          </button>
        </div>

        <button
          onClick={onViewDetails}
          className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2 py-1"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>View Details</span>
        </button>
      </div>

      {/* Safety Notice Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/40 flex items-center gap-2 text-[11px] text-slate-500">
        <AlertCircle className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
        <span>
          Decision Support System: AI guidance assists daily management. Always follow verified local aquaculture protocols for critical emergencies.
        </span>
      </div>
    </div>
  );
};
