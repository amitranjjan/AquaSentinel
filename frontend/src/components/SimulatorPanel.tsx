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
    <div className="rounded-3xl border border-cyan-500/40 bg-slate-900/95 shadow-2xl p-5 lg:p-6 mb-6 animate-in slide-in-from-top-4 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              AquaSentinel Hardware & Pond Simulator
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700">
                DEVELOPER / TEST MODE
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Test alert behaviors, BLE payloads, and Gemini responses without needing physical hardware
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={onToggleDrift}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              isDriftActive
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {isDriftActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isDriftActive ? 'Pause Drift' : 'Enable Real-time Drift'}</span>
          </button>

          <button
            onClick={onReset}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Reset to Optimal"
            aria-label="Reset to Optimal"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preset Buttons Grid */}
      <div className="mt-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
          1-Click Pond Scenarios:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SIMULATOR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className="p-2.5 rounded-xl bg-slate-950/70 hover:bg-cyan-950/30 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group"
            >
              <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">
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
      <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Temp Slider */}
        <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800/80">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-semibold">Temperature:</span>
            <span className="font-mono text-amber-400 font-bold">
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
          <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono">
            <span>16°C (Cold)</span>
            <span>28°C (Optimal)</span>
            <span>38°C (Hot)</span>
          </div>
        </div>

        {/* pH Slider */}
        <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800/80">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-semibold">pH Level:</span>
            <span className="font-mono text-emerald-400 font-bold">
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
          <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono">
            <span>4.5 (Acidic)</span>
            <span>7.2 (Neutral)</span>
            <span>10.5 (Alkaline)</span>
          </div>
        </div>

        {/* Turbidity Slider */}
        <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800/80">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-semibold">Turbidity:</span>
            <span className="font-mono text-cyan-400 font-bold">
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
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono">
            <span>0 (Crystal)</span>
            <span>35 (Healthy)</span>
            <span>140 (Muddy)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
