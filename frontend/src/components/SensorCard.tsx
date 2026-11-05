import React from 'react';
import { Thermometer, Droplet, Activity, AlertCircle, CheckCircle2, CloudSun, Gauge } from 'lucide-react';
import type { SensorStatusCode } from '../types';

interface SensorCardProps {
  type: 'temperature' | 'ph' | 'turbidity' | 'airTemperature' | 'humidity';
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
          icon: <Thermometer className="w-5 h-5 text-amber-500" />,
          iconBg: 'bg-amber-50',
          min: 15,
          max: 40,
        };
      case 'airTemperature':
        return {
          title: 'Air Temperature (DHT11)',
          icon: <CloudSun className="w-5 h-5 text-amber-500" />,
          iconBg: 'bg-amber-50',
          min: 10,
          max: 50,
        };
      case 'humidity':
        return {
          title: 'Air Humidity (DHT11)',
          icon: <Gauge className="w-5 h-5 text-sky-500" />,
          iconBg: 'bg-sky-50',
          min: 10,
          max: 100,
        };
      case 'ph':
        return {
          title: 'pH Level',
          icon: <Activity className="w-5 h-5 text-cyan-500" />,
          iconBg: 'bg-cyan-50',
          min: 4,
          max: 11,
        };
      case 'turbidity':
        return {
          title: 'Turbidity (Clarity)',
          icon: <Droplet className="w-5 h-5 text-sky-500" />,
          iconBg: 'bg-sky-50',
          min: 0,
          max: 150,
        };
    }
  };

  const meta = getMeta();

  // Status badge styling
  const getStatusBadge = () => {
    switch (status) {
      case 'NORMAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            NORMAL
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <AlertCircle className="w-3 h-3 text-sky-600" />
            LOW
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            HIGH
          </span>
        );
      case 'SENSOR_ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            SENSOR ERROR
          </span>
        );
      case 'DISCONNECTED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
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

  // Progress bar fill color based on status
  const getBarColor = () => {
    switch (status) {
      case 'HIGH':
        return 'bg-amber-500';
      case 'LOW':
        return 'bg-sky-500';
      case 'NORMAL':
        return 'bg-emerald-500';
      case 'SENSOR_ERROR':
        return 'bg-rose-500';
      default:
        return 'bg-slate-300';
    }
  };

  const percentage = computePercentage();

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${meta.iconBg} flex items-center justify-center`}>
              {meta.icon}
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800">{meta.title}</span>
          </div>
          <div>{getStatusBadge()}</div>
        </div>

        {/* Big Reading Value */}
        <div className="my-2.5 flex items-baseline">
          {value !== null && !isNaN(value) ? (
            <>
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {type === 'ph' ? value.toFixed(2) : type === 'humidity' ? Math.round(value) : value.toFixed(1)}
              </span>
              {unit && (
                <span className="text-xs sm:text-sm font-semibold text-slate-500 ml-1.5">
                  {unit}
                </span>
              )}
            </>
          ) : (
            <span className="text-base font-semibold text-slate-400 py-2">
              (Awaiting Telemetry)
            </span>
          )}
        </div>

        {/* Visual Range Progress Bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden my-3">
          <div
            className={`h-full ${getBarColor()} transition-all duration-500 rounded-full`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Target Range Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">Target for {speciesName}:</span>
        <span className="font-bold text-slate-700">{targetRange}</span>
      </div>
    </div>
  );
};
