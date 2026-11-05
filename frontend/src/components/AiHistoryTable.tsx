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
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'MEDIUM':
        return <AlertTriangle className="w-3.5 h-3.5 text-sky-600" />;
      case 'HIGH':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
      case 'CRITICAL':
        return <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />;
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs p-5 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-600">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              AI Recommendation Log &amp; Condition History
            </h3>
            <p className="text-xs text-slate-500">
              Auditable timeline showing how pond conditions evolved and actions suggested
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-slate-600 hover:text-rose-700 text-xs font-semibold transition-colors self-start sm:self-center shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
          <Clock className="w-8 h-8 text-slate-300 mb-2" />
          <span>No recommendation history recorded yet.</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Condition</th>
                <th className="py-3 px-4">Urgency</th>
                <th className="py-3 px-4">AI Recommendation Summary</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {history.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => onSelectRecommendation(item)}
                >
                  <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                    {item.timeFormatted || new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        item.condition.includes('ALERT') || item.condition.includes('CRITICAL') || item.condition.includes('HIGH') || item.condition.includes('LOW')
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      {item.condition}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {getUrgencyIcon(item.urgency)}
                      <span className="text-[11px] text-slate-700 font-semibold">{item.urgency}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 max-w-md truncate">
                    {item.summary}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRecommendation(item);
                      }}
                      className="text-sky-600 hover:text-sky-700 font-bold text-xs hover:underline"
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
