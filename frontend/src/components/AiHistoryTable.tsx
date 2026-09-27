import React from 'react';
import { History, Trash2, Clock, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { AiRecommendation, UrgencyLevel } from '../types';

interface AiHistoryTableProps {
  history: AiRecommendation[];
  onClearHistory: () => void;
  onSelectRecommendation: (rec: AiRecommendation) => void;
}

export const AiHistoryTable: React.FC<AiHistoryTableProps> = ({
  history,
  onClearHistory,
  onSelectRecommendation
}) => {
  const getUrgencyIcon = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case 'LOW':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'MEDIUM':
        return <AlertTriangle className="w-3.5 h-3.5 text-blue-400" />;
      case 'HIGH':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'CRITICAL':
        return <AlertOctagon className="w-3.5 h-3.5 text-red-400" />;
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 shadow-xl p-5 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-cyan-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              AI Recommendation Log & Condition History
            </h3>
            <p className="text-xs text-slate-400">
              Auditable timeline showing how pond conditions evolved and actions suggested
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-red-950/60 border border-slate-700 hover:border-red-600/40 text-slate-400 hover:text-red-300 text-xs font-medium transition-colors self-start sm:self-center"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
          <Clock className="w-8 h-8 text-slate-700 mb-2" />
          <span>No recommendation history recorded yet.</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Condition</th>
                <th className="py-3 px-4">Urgency</th>
                <th className="py-3 px-4">AI Recommendation Summary</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {history.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  onClick={() => onSelectRecommendation(item)}
                >
                  <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                    {item.timeFormatted || new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        item.condition.includes('ALERT') || item.condition.includes('CRITICAL') || item.condition.includes('HIGH') || item.condition.includes('LOW')
                          ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                          : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      }`}
                    >
                      {item.condition}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {getUrgencyIcon(item.urgency)}
                      <span className="text-[11px] text-slate-300">{item.urgency}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-200 max-w-md truncate">
                    {item.summary}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRecommendation(item);
                      }}
                      className="text-cyan-400 hover:text-cyan-300 font-medium text-xs hover:underline"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
