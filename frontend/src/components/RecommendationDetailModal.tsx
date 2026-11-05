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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-200">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Gemini Analysis Telemetry &amp; Diagnostic Report
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Log ID: {recommendation.id} • {recommendation.timeFormatted}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Diagnostic Assessment */}
          <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-1.5">
            <div className="text-sky-700 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-sky-600" />
              <span>DIAGNOSTIC ASSESSMENT:</span>
            </div>
            <p className="text-slate-900 leading-relaxed text-sm font-medium">
              {recommendation.reason}
            </p>
          </div>

          {/* Farm and Sensor Snapshot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
            <div className="p-4 rounded-2xl bg-sky-50/40 border border-sky-100">
              <span className="text-sky-700 block text-xs font-bold uppercase">TELEMETRY SNAPSHOT</span>
              <div className="mt-2 text-slate-900 font-medium text-sm space-y-1">
                <div>Temp: {recommendation.readings?.temperature !== null && recommendation.readings?.temperature !== undefined ? `${recommendation.readings.temperature} °C` : 'N/A'}</div>
                <div>pH: {recommendation.readings?.ph ?? 'N/A'}</div>
                <div>Turbidity: {recommendation.readings?.turbidity !== null && recommendation.readings?.turbidity !== undefined ? `${recommendation.readings.turbidity} NTU` : 'N/A'}</div>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-sky-50/40 border border-sky-100">
              <span className="text-sky-700 block text-xs font-bold uppercase">FARM CONTEXT</span>
              <div className="mt-2 text-slate-900 font-medium text-sm space-y-1">
                <div>Species: {recommendation.farmContext?.fishSpecies ?? 'Tilapia'}</div>
                <div>System: {recommendation.farmContext?.cultureType ?? 'Pond'}</div>
                <div>Pond: {recommendation.farmContext?.pondName ?? 'Primary Grow-out Pond'}</div>
              </div>
            </div>
          </div>

          {/* Model Engine Source */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-semibold text-xs">Model / Engine Source:</span>
            <span className="font-mono text-sky-700 font-bold text-xs">
              {recommendation._source || 'AquaSentinel Expert Rule Engine (Standalone Mode)'}
            </span>
          </div>

          {/* Raw Structured JSON Output */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Code className="w-3.5 h-3.5 text-sky-600" />
                Raw Structured Gemini Response (JSON):
              </span>
              <button
                onClick={handleCopyJson}
                className="text-sky-600 hover:text-sky-700 font-semibold text-xs flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-[11px] overflow-x-auto max-h-52 leading-relaxed">
              {JSON.stringify(recommendation, null, 2)}
            </pre>
          </div>

          {/* Guardrail Disclaimer */}
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Gemini Safety Guardrail:</strong> Recommendations are constrained to conservative actions. Clinical diagnoses or hazardous water treatments are blocked by backend system prompt constraints.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-xs transition-all"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
