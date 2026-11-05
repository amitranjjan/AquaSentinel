import React from 'react';
import { Sliders, Play, Pause, RefreshCw } from 'lucide-react';
import { SIMULATOR_PRESETS, type SimulatorPreset } from '../services/sensorSimulator';
import type { WaterQuality } from '../types';

interface SimulatorPanelProps {
  isOpen: boolean;
  waterQuality: WaterQuality;
  onUpdateWaterQuality: (wq: WaterQuality) => void;
  onSelectPreset: (preset: SimulatorPreset) => void;
  isDriftActive: boolean;
  onToggleDrift: () => void;
  onReset: () => void;
}

export const SimulatorPanel: React.FC<SimulatorPanelProps> = ({
  isOpen,
  waterQuality,
  onUpdateWaterQuality,
  onSelectPreset,
  isDriftActive,
  onToggleDrift,
  onReset
}) => {
  if (!isOpen) return null;

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs p-5 lg:p-6 mb-6 animate-in slide-in-from-top-4 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-200">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              AquaSentinel Hardware &amp; Pond Simulator
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-bold uppercase">
                DEVELOPER / TEST MODE
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Test alert behaviors, BLE payloads, and Gemini responses without needing physical hardware
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={onToggleDrift}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isDriftActive
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isDriftActive ? <Pause className="w-3.5 h-3.5 text-emerald-600" /> : <Play className="w-3.5 h-3.5 text-slate-600" />}
            <span>{isDriftActive ? 'Pause Drift' : 'Enable Real-time Drift'}</span>
          </button>

          <button
            onClick={onReset}
            className="p-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 hover:text-slate-900 shadow-xs transition-colors"
            title="Reset to Optimal"
            aria-label="Reset to Optimal"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preset Buttons Grid */}
      <div className="mt-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
          1-Click Pond Scenarios:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SIMULATOR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-sky-50/60 border border-slate-200 hover:border-sky-300 text-left transition-all group shadow-xs"
            >
              <div className="text-xs font-bold text-slate-800 group-hover:text-sky-700">
                {preset.name}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Manual Sliders */}
      <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Temp Slider */}
        <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-600 font-semibold">Temperature:</span>
            <span className="font-mono text-amber-600 font-bold">
              {waterQuality.temperature !== null ? `${waterQuality.temperature.toFixed(2)} °C` : 'Fault (null)'}
            </span>
          </div>
          <input
            type="range"
            min="16"
            max="38"
            step="0.25"
            value={waterQuality.temperature ?? 28}
            onChange={(e) =>
              onUpdateWaterQuality({
                ...waterQuality,
                temperature: parseFloat(e.target.value)
              })
            }
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
            <span>16°C (Cold)</span>
            <span>28°C (Optimal)</span>
            <span>38°C (Hot)</span>
          </div>
        </div>

        {/* pH Slider */}
        <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-600 font-semibold">pH Level:</span>
            <span className="font-mono text-emerald-600 font-bold">
              {waterQuality.ph !== null ? waterQuality.ph.toFixed(2) : 'Fault (null)'}
            </span>
          </div>
          <input
            type="range"
            min="4.5"
            max="10.5"
            step="0.05"
            value={waterQuality.ph ?? 7.2}
            onChange={(e) =>
              onUpdateWaterQuality({
                ...waterQuality,
                ph: parseFloat(e.target.value)
              })
            }
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
            <span>4.5 (Acidic)</span>
            <span>7.2 (Neutral)</span>
            <span>10.5 (Alkaline)</span>
          </div>
        </div>

        {/* Turbidity Slider */}
        <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-600 font-semibold">Turbidity:</span>
            <span className="font-mono text-sky-600 font-bold">
              {waterQuality.turbidity !== null ? `${waterQuality.turbidity.toFixed(1)} NTU` : 'Fault (null)'}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="140"
            step="1"
            value={waterQuality.turbidity ?? 30}
            onChange={(e) =>
              onUpdateWaterQuality({
                ...waterQuality,
                turbidity: parseFloat(e.target.value)
              })
            }
            className="w-full accent-sky-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
            <span>0 (Crystal)</span>
            <span>35 (Healthy)</span>
            <span>140 (Muddy)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
