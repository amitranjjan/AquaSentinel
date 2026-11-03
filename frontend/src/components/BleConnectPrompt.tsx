import React from 'react';
import { Bluetooth, Cable, AlertCircle, WifiOff, Sparkles, Info } from 'lucide-react';
import { isWebBluetoothSupported } from '../services/bleService';
import { isWebSerialSupported } from '../services/serialService';

interface BleConnectPromptProps {
  onConnectBLE: () => void;
  onConnectSerial: () => void;
  onEnableSimulator: () => void;
}

export const BleConnectPrompt: React.FC<BleConnectPromptProps> = ({
  onConnectBLE,
  onConnectSerial,
  onEnableSimulator
}) => {
  const isBleSupported = isWebBluetoothSupported();
  const isSerialSupported = isWebSerialSupported();

  return (
    <div className="rounded-3xl border-2 border-dashed border-cyan-500/40 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-cyan-950/20 shadow-2xl p-6 lg:p-10 text-center relative overflow-hidden my-4">
      {/* Background glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto space-y-6 relative z-10">
        {/* Pulsing Bluetooth / Serial Icon */}
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
            The web dashboard operates in real time when connected to your <span className="text-cyan-400 font-semibold">Arduino Uno (HC-05 or HM-10)</span>, <span className="text-cyan-400 font-semibold">ESP8266</span>, or <span className="text-cyan-400 font-semibold">ESP32</span>.
          </p>
        </div>

        {/* Important notice explaining HC-05 Classic Bluetooth vs BLE */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 text-left text-xs text-slate-300 space-y-2">
          <div className="flex items-center gap-2 font-bold text-cyan-400 text-sm">
            <Info className="w-4 h-4 shrink-0" />
            <span>Using the HC-05 Bluetooth Module?</span>
          </div>
          <p className="leading-relaxed text-slate-300">
            <strong>HC-05 uses Classic Bluetooth 2.0 (SPP)</strong>, while standard Web Bluetooth only scans for Bluetooth Low Energy (BLE 4.0 / HM-10). To connect your HC-05:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1 text-[11px]">
            <li>Open <strong className="text-white">Windows Settings &rarr; Bluetooth &amp; Devices</strong> and pair your <strong>HC-05</strong> (PIN: <code className="text-cyan-300">1234</code> or <code className="text-cyan-300">0000</code>).</li>
            <li>Click the <strong className="text-white">"Connect HC-05 Bluetooth / USB"</strong> button below.</li>
            <li>Select the paired <strong>Bluetooth Standard Serial COM port</strong> from the popup!</li>
          </ol>
        </div>

        {/* Primary Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {/* Button 1: Web Serial for HC-05 Bluetooth & USB */}
          <button
            onClick={onConnectSerial}
            disabled={!isSerialSupported}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all transform active:scale-95 disabled:opacity-50"
          >
            <Cable className="w-5 h-5" />
            <span>Connect HC-05 Bluetooth / USB Serial</span>
          </button>

          {/* Button 2: Web Bluetooth for HM-10 / ESP32 */}
          <button
            onClick={onConnectBLE}
            disabled={!isBleSupported}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
          >
            <Bluetooth className="w-4 h-4 text-cyan-400" />
            <span>Connect BLE (HM-10 / ESP32)</span>
          </button>
        </div>

        {/* Browser compatibility check */}
        {(!isSerialSupported && !isBleSupported) && (
          <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-600/50 text-amber-200 text-xs flex items-center gap-2 justify-center">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              Web Serial and Web Bluetooth require Google Chrome, Microsoft Edge, or Opera on Windows, Mac, or Linux.
            </span>
          </div>
        )}

        {/* Developer / Demo Simulator Fallback */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Waiting for connection...</span>
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
