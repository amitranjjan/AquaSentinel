import React, { useState } from 'react';
import { Waves, Droplets, Power, ShieldAlert, Cpu } from 'lucide-react';
import { sendBLECommand } from '../services/bleService';
import { sendSerialCommand } from '../services/serialService';

interface PumpControlCardProps {
  pump1Active?: boolean;
  pump2Active?: boolean;
  isConnected: boolean;
}

export const PumpControlCard: React.FC<PumpControlCardProps> = ({
  pump1Active = false,
  pump2Active = false,
  isConnected
}) => {
  const [localP1, setLocalP1] = useState(pump1Active);
  const [localP2, setLocalP2] = useState(pump2Active);
  const [autoMode, setAutoMode] = useState(true);
  const [sending, setSending] = useState(false);

  // Sync with prop when prop changes
  React.useEffect(() => {
    setLocalP1(pump1Active);
  }, [pump1Active]);

  React.useEffect(() => {
    setLocalP2(pump2Active);
  }, [pump2Active]);

  const dispatchCommand = async (cmd: string) => {
    const bleSuccess = await sendBLECommand(cmd);
    if (!bleSuccess) {
      await sendSerialCommand(cmd);
    }
  };

  const togglePump1 = async () => {
    if (!isConnected || sending) return;
    const nextState = !localP1;
    setSending(true);
    setLocalP1(nextState);
    setAutoMode(false);
    await dispatchCommand(nextState ? 'P1_ON' : 'P1_OFF');
    setSending(false);
  };

  const togglePump2 = async () => {
    if (!isConnected || sending) return;
    const nextState = !localP2;
    setSending(true);
    setLocalP2(nextState);
    setAutoMode(false);
    await dispatchCommand(nextState ? 'P2_ON' : 'P2_OFF');
    setSending(false);
  };

  const setAuto = async () => {
    if (!isConnected || sending) return;
    setSending(true);
    setAutoMode(true);
    await dispatchCommand('AUTO_ON');
    setSending(false);
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-5 shadow-xl transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Relay & Pump Control
            </h3>
            <p className="text-xs text-slate-400">
              Dual Relay Module on Arduino Uno (Pins D7 & D8)
            </p>
          </div>
        </div>

        <button
          onClick={setAuto}
          disabled={!isConnected || sending}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
            autoMode
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
          } disabled:opacity-50`}
        >
          <span className={`w-2 h-2 rounded-full ${autoMode ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          {autoMode ? 'Auto-Thresholds Active' : 'Switch to Auto'}
        </button>
      </div>

      {/* Pumps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Pump 1: Aerator / Circulation */}
        <div className={`p-4 rounded-2xl border transition-all ${
          localP1
            ? 'bg-cyan-950/40 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
            : 'bg-slate-950/50 border-slate-800/80'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                localP1 ? 'bg-cyan-500/20 text-cyan-400 animate-spin-slow' : 'bg-slate-800 text-slate-500'
              }`}>
                <Waves className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Pump 1: Aerator</h4>
                <p className="text-[11px] text-slate-400">Oxygen & Circulation (Relay 1 - D7)</p>
              </div>
            </div>

            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              localP1
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800 text-slate-500'
            }`}>
              {localP1 ? 'Running' : 'Off'}
            </span>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400">
              Triggers when temp &gt; 30°C or turb &gt; 50 NTU
            </span>
            <button
              onClick={togglePump1}
              disabled={!isConnected || sending}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs ${
                localP1
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30'
              } disabled:opacity-50`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{localP1 ? 'Stop Pump' : 'Start Pump'}</span>
            </button>
          </div>
        </div>

        {/* Pump 2: Freshwater Flush / Drain */}
        <div className={`p-4 rounded-2xl border transition-all ${
          localP2
            ? 'bg-blue-950/40 border-blue-500/50 shadow-lg shadow-blue-500/10'
            : 'bg-slate-950/50 border-slate-800/80'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                localP2 ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 'bg-slate-800 text-slate-500'
              }`}>
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Pump 2: Fresh Water</h4>
                <p className="text-[11px] text-slate-400">Inlet / Dilution (Relay 2 - D8)</p>
              </div>
            </div>

            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              localP2
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'bg-slate-800 text-slate-500'
            }`}>
              {localP2 ? 'Running' : 'Off'}
            </span>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400">
              Triggers when turbidity &gt; 75 NTU or pH extreme
            </span>
            <button
              onClick={togglePump2}
              disabled={!isConnected || sending}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs ${
                localP2
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
              } disabled:opacity-50`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{localP2 ? 'Stop Pump' : 'Start Pump'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Safety warning */}
      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-800/50">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span>Ensure your 2 pumps are powered via an external power adapter, NOT drawing power from the Arduino Uno 5V pin.</span>
      </div>
    </div>
  );
};
