import React from 'react';
import { Thermometer, Droplet, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { SensorStatusCode } from '../types';

interface SensorCardProps {
  type: 'temperature' | 'ph' | 'turbidity';
  value: number | null;
  status: SensorStatusCode;
  unit: string;
  targetRange: string;
  speciesName: string;
}

export const SensorCard: React.FC<SensorCardProps> = ({
  type,
  value,
  status,
  unit,
  targetRange,
  speciesName
}) => {
  const getMeta = () => {
    switch (type) {
      case 'temperature':
        return {
          title: 'Water Temperature',
          icon: <Thermometer className="w-5 h-5 text-amber-400" />,
          accentBg: 'from-amber-500/10 to-orange-500/5',
          borderColor: 'border-amber-500/20',
          min: 15,
          max: 40,
          optimalMin: 26,
          optimalMax: 32,
        };
      case 'ph':
        return {
          title: 'pH Level',
          icon: <Activity className="w-5 h-5 text-emerald-400" />,
          accentBg: 'from-emerald-500/10 to-teal-500/5',
          borderColor: 'border-emerald-500/20',
          min: 4,
          max: 11,
          optimalMin: 6.5,
          optimalMax: 8.5,
        };
      case 'turbidity':
        return {
          title: 'Turbidity (Clarity)',
          icon: <Droplet className="w-5 h-5 text-cyan-400" />,
          accentBg: 'from-cyan-500/10 to-blue-500/5',
          borderColor: 'border-cyan-500/20',
          min: 0,
          max: 150,
          optimalMin: 0,
          optimalMax: 50,
        };
    }
  };

  const meta = getMeta();

  // Status badge styling
  const getStatusBadge = () => {
    switch (status) {
      case 'NORMAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            NORMAL
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 border border-blue-500/40 text-blue-300">
            <AlertCircle className="w-3 h-3 text-blue-400" />
            LOW
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 border border-amber-500/40 text-amber-300">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            HIGH
          </span>
        );
      case 'SENSOR_ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950/90 border border-red-500/50 text-red-300 animate-pulse">
            <AlertCircle className="w-3 h-3 text-red-400" />
            SENSOR ERROR
          </span>
        );
      case 'DISCONNECTED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800/90 border border-slate-700 text-slate-400">
            DISCONNECTED
          </span>
        );
    }
  };

  // Compute percentage on visual bar
  const computePercentage = () => {
    if (value === null || isNaN(value)) return 0;
    const clamped = Math.max(meta.min, Math.min(meta.max, value));
    return Math.round(((clamped - meta.min) / (meta.max - meta.min)) * 100);
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${meta.borderColor} bg-gradient-to-b ${meta.accentBg} bg-slate-900/90 p-5 shadow-xl transition-all duration-300 hover:border-slate-600`}>
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50">
            {meta.icon}
          </div>
          <span className="text-sm font-semibold text-slate-300">{meta.title}</span>
        </div>
        {getStatusBadge()}
      </div>

      {/* Numerical Reading */}
      <div className="my-3 flex items-baseline gap-2">
        {status === 'DISCONNECTED' ? (
          <div className="text-3xl font-extrabold text-slate-600 tracking-tight flex items-baseline gap-2 font-mono">
            <span>--</span>
            <span className="text-xs font-normal text-slate-500 font-sans">(Awaiting BLE)</span>
          </div>
        ) : value === null || status === 'SENSOR_ERROR' ? (
          <div className="text-2xl font-bold text-red-400 tracking-tight flex items-center gap-1.5">
            <span>Unavailable</span>
            <span className="text-xs font-normal text-slate-400">(Check probe)</span>
          </div>
        ) : (
          <>
            <span className="text-4xl font-extrabold tracking-tight text-white font-mono">
              {value.toFixed(type === 'turbidity' ? 1 : 2)}
            </span>
            <span className="text-sm font-semibold text-slate-400">{unit}</span>
          </>
        )}
      </div>

      {/* Visual meter bar */}
      <div className="mt-4 mb-2">
        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden relative">
          {value !== null && status !== 'SENSOR_ERROR' && (
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                status === 'NORMAL'
                  ? 'bg-emerald-400'
                  : status === 'LOW'
                  ? 'bg-blue-400'
                  : 'bg-amber-400'
              }`}
              style={{ width: `${computePercentage()}%` }}
            />
          )}
        </div>
      </div>

      {/* Optimal species recommendation footer */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-2">
        <span>Target for {speciesName}:</span>
        <span className="font-semibold text-slate-200">{targetRange}</span>
      </div>
    </div>
  );
};
