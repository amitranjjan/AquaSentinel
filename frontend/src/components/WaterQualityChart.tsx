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
import { LineChart as ChartIcon } from 'lucide-react';

interface WaterQualityChartProps {
  data: TelemetryPoint[];
  farmProfile: FarmProfile;
}

export const WaterQualityChart: React.FC<WaterQualityChartProps> = ({
  data,
  farmProfile
}) => {
  const [metricFilter, setMetricFilter] = useState<'all' | 'temperature' | 'ph' | 'turbidity'>('all');

  // Custom Light Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xl text-xs space-y-1 z-50">
          <p className="font-mono text-slate-400 font-semibold mb-1.5">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 font-mono">
              <span style={{ color: entry.color }} className="font-semibold">
                {entry.name}:
              </span>
              <span className="text-slate-900 font-bold">
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
    <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs p-5 lg:p-6">
      {/* Header and Filter Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-600">
            <ChartIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Water Quality Telemetry Trends
            </h3>
            <p className="text-xs text-slate-500">
              Live time-series data with {farmProfile.fishSpecies} optimal reference thresholds
            </p>
          </div>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setMetricFilter('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              metricFilter === 'all'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setMetricFilter('temperature')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              metricFilter === 'temperature'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Temp
          </button>
          <button
            onClick={() => setMetricFilter('ph')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              metricFilter === 'ph'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            pH
          </button>
          <button
            onClick={() => setMetricFilter('turbidity')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              metricFilter === 'turbidity'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Turbidity
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 sm:h-72 w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} />

              {(metricFilter === 'all' || metricFilter === 'temperature') && (
                <Line
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature (°C)"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#f59e0b' }}
                  isAnimationActive={false}
                />
              )}

              {(metricFilter === 'all' || metricFilter === 'turbidity') && (
                <Line
                  type="monotone"
                  dataKey="turbidity"
                  name="Turbidity (NTU)"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#0284c7' }}
                  isAnimationActive={false}
                />
              )}

              {(metricFilter === 'all' || metricFilter === 'ph') && (
                <Line
                  type="monotone"
                  dataKey="ph"
                  name="pH"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#10b981' }}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs">
            Connecting to stream... Telemetry trends will render when readings arrive.
          </div>
        )}
      </div>

      {/* Chart Footer Meta */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-400">Displaying latest 30 telemetry points</span>
        <span className="text-sky-600 font-semibold">Sampling Rate: 2.0s</span>
      </div>
    </div>
  );
};
