import React from 'react';
import { Bluetooth, AlertCircle, WifiOff, Sparkles, CheckCircle2 } from 'lucide-react';
import { isWebBluetoothSupported } from '../services/bleService';

interface BleConnectPromptProps {
  onConnectBLE: () => void;
  onEnableSimulator: () => void;
}

export const BleConnectPrompt: React.FC<BleConnectPromptProps> = ({
  onConnectBLE,
  onEnableSimulator
}) => {
  const isSupported = isWebBluetoothSupported();

  return (
    <div className="rounded-3xl border-2 border-dashed border-cyan-500/40 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-cyan-950/20 shadow-2xl p-6 lg:p-10 text-center relative overflow-hidden my-4">
      {/* Background glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto space-y-6 relative z-10">
        {/* Pulsing Bluetooth Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-20 h-20 rounded-3xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-500/20">
            <Bluetooth className="w-10 h-10 animate-pulse text-cyan-400" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
          </span>
        </div>

        {/* Title and Subheading */}
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight sm:text-3xl">
            AquaSentinel Node Required
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed max-w-lg mx-auto">
            The web dashboard operates in real time <span className="text-cyan-400 font-semibold">only when connected to the AquaSentinel ESP32 hardware via Bluetooth Low Energy (BLE)</span>.
          </p>
        </div>

        {/* Step-by-step guidance cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-cyan-900 flex items-center justify-center text-[10px] font-mono text-cyan-200">1</span>
              Power Node
            </div>
            <p className="text-slate-400 text-[11px]">
              Turn on your ESP32 water sensor unit near your computer.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-cyan-900 flex items-center justify-center text-[10px] font-mono text-cyan-200">2</span>
              Pair Device
            </div>
            <p className="text-slate-400 text-[11px]">
              Click Connect and select <span className="font-mono text-slate-200">AquaSentinel-ESP32</span> in the browser prompt.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-cyan-900 flex items-center justify-center text-[10px] font-mono text-cyan-200">3</span>
              Live Telemetry & AI
            </div>
            <p className="text-slate-400 text-[11px]">
              Sensors stream live data, and Gemini analyzes pond safety instantly.
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onConnectBLE}
            disabled={!isSupported}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-600/30 flex items-center justify-center gap-2.5 transition-all transform active:scale-95 disabled:opacity-50"
          >
            <Bluetooth className="w-5 h-5" />
            <span>Connect AquaSentinel BLE Device</span>
          </button>
        </div>

        {/* Browser compatibility check */}
        {!isSupported && (
          <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-600/50 text-amber-200 text-xs flex items-center gap-2 justify-center">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              Web Bluetooth is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Opera on Windows, Mac, Linux, or Android.
            </span>
          </div>
        )}

        {/* Developer / Demo Simulator Fallback */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Waiting for BLE advertisement...</span>
          </span>
          <button
            onClick={onEnableSimulator}
            className="mt-2 sm:mt-0 text-cyan-400 hover:text-cyan-300 font-semibold underline hover:no-underline flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Testing without hardware? Enable Demo Simulator</span>
          </button>
        </div>
      </div>
    </div>
  );
};
