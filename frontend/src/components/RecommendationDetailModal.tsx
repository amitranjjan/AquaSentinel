import React, { useState } from 'react';
import { X, Bot, Copy, Check, Code, ShieldAlert, Cpu } from 'lucide-react';
import type { AiRecommendation } from '../types';

interface RecommendationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendation: AiRecommendation | null;
}

export const RecommendationDetailModal: React.FC<RecommendationDetailModalProps> = ({
  isOpen,
  onClose,
  recommendation
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !recommendation) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(recommendation, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Gemini Analysis Telemetry & Diagnostic Report
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Log ID: {recommendation.id} • {recommendation.timeFormatted}
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

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Diagnostic Reason */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="text-cyan-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Cpu className="w-4 h-4" />
              <span>Diagnostic Assessment:</span>
            </div>
            <p className="text-slate-200 leading-relaxed text-sm">
              {recommendation.reason}
            </p>
          </div>

          {/* Farm and Sensor Snapshot */}
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">Telemetry Snapshot</span>
              <div className="mt-1 text-slate-200 space-y-0.5">
                <div>Temp: {recommendation.readings?.temperature ?? 'N/A'} °C</div>
                <div>pH: {recommendation.readings?.ph ?? 'N/A'}</div>
                <div>Turbidity: {recommendation.readings?.turbidity ?? 'N/A'} NTU</div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">Farm Context</span>
              <div className="mt-1 text-slate-200 space-y-0.5">
                <div>Species: {recommendation.farmContext?.fishSpecies ?? 'Tilapia'}</div>
                <div>System: {recommendation.farmContext?.cultureType ?? 'Pond'}</div>
                <div>Pond: {recommendation.farmContext?.pondName ?? 'Pond 1'}</div>
              </div>
            </div>
          </div>

          {/* Model Engine Source */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 font-medium">Model / Engine Source:</span>
            <span className="font-mono text-cyan-400 font-semibold">
              {recommendation._source || 'gemini-3.8-flash'}
            </span>
          </div>

          {/* Raw Structured JSON Output */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-cyan-400" />
                Raw Structured Gemini Response (JSON):
              </span>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-48 scrollbar-thin">
              {JSON.stringify(recommendation, null, 2)}
            </pre>
          </div>

          {/* Safety Rule Note */}
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-[11px] flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <span>
              <b>Gemini Safety Guardrail:</b> Recommendations are constrained to conservative actions. Clinical diagnoses or hazardous water treatments are blocked by backend system prompt constraints.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
