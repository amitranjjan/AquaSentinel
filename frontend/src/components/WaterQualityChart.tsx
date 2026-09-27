import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import type { TelemetryPoint, FarmProfile } from '../types';
import { LineChart as ChartIcon, Waves } from 'lucide-react';

interface WaterQualityChartProps {
  data: TelemetryPoint[];
  farmProfile: FarmProfile;
}

export const WaterQualityChart: React.FC<WaterQualityChartProps> = ({
  data,
  farmProfile
}) => {
  const [metricFilter, setMetricFilter] = useState<'all' | 'temperature' | 'ph' | 'turbidity'>('all');

  // Custom Dark Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1 z-50">
          <p className="font-mono text-slate-400 font-semibold mb-1.5">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 font-mono">
              <span style={{ color: entry.color }} className="font-semibold">
                {entry.name}:
              </span>
              <span className="text-white font-bold">
                {entry.value !== null && entry.value !== undefined ? entry.value : 'N/A'} {entry.unit}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 shadow-xl p-5 lg:p-6">
      {/* Header and Filter Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-cyan-400">
            <ChartIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Water Quality Telemetry Trends
            </h3>
            <p className="text-xs text-slate-400">
              Live time-series data with {farmProfile.fishSpecies} optimal reference thresholds
            </p>
          </div>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 self-start sm:self-center">
          <button
            onClick={() => setMetricFilter('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              metricFilter === 'all'
                ? 'bg-cyan-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setMetricFilter('temperature')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              metricFilter === 'temperature'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Temp
          </button>
          <button
            onClick={() => setMetricFilter('ph')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              metricFilter === 'ph'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            pH
          </button>
          <button
            onClick={() => setMetricFilter('turbidity')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              metricFilter === 'turbidity'
                ? 'bg-cyan-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Turbidity
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full">
        {data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <Waves className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
            <span>Connect AquaSentinel via BLE to stream real-time water quality trends.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="timeFormatted"
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                iconType="circle"
              />

              {/* Temperature Line */}
              {(metricFilter === 'all' || metricFilter === 'temperature') && (
                <Line
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature (°C)"
                  unit="°C"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              )}

              {/* pH Line */}
              {(metricFilter === 'all' || metricFilter === 'ph') && (
                <Line
                  type="monotone"
                  dataKey="ph"
                  name="pH"
                  unit=""
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              )}

              {/* Turbidity Line */}
              {(metricFilter === 'all' || metricFilter === 'turbidity') && (
                <Line
                  type="monotone"
                  dataKey="turbidity"
                  name="Turbidity (NTU)"
                  unit=" NTU"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/60 pt-2">
        <span>Displaying latest {data.length} telemetry points</span>
        <span className="font-mono text-cyan-400">Sampling Rate: 2.0s</span>
      </div>
    </div>
  );
};
