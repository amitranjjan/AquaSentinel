import React, { useState, useEffect, useRef } from 'react';
import { Waves, Droplets, Power, ShieldAlert, Cpu, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';
import { sendBLECommand } from '../services/bleService';
import { sendSerialCommand } from '../services/serialService';

interface PumpControlCardProps {
  pump1Active?: boolean;
  pump2Active?: boolean;
  isConnected: boolean;
  connectionMode?: 'ble' | 'serial' | 'simulator' | 'disconnected';
}

export const PumpControlCard: React.FC<PumpControlCardProps> = ({
  pump1Active = false,
  pump2Active = false,
  isConnected,
  connectionMode = 'disconnected'
}) => {
  const [localP1, setLocalP1] = useState(pump1Active);
  const [localP2, setLocalP2] = useState(pump2Active);
  const [isManualMode, setIsManualMode] = useState(true); // Default to Manual mode so farmer has full control
  const [sending, setSending] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [relayPolarity, setRelayPolarity] = useState<'LOW' | 'HIGH'>('LOW'); // Active-LOW is standard for 5V Songle modules

  // Lock to avoid incoming 2s telemetry overwriting manual click immediately
  const suppressTelemetryUntil = useRef(0);

  // Sync with prop when prop changes (if not within suppression lock window)
  useEffect(() => {
    if (Date.now() > suppressTelemetryUntil.current) {
      setLocalP1(pump1Active);
    }
  }, [pump1Active]);

  useEffect(() => {
    if (Date.now() > suppressTelemetryUntil.current) {
      setLocalP2(pump2Active);
    }
  }, [pump2Active]);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg(prev => prev === msg ? null : prev);
    }, 4000);
  };

  const dispatchCommand = async (cmd: string): Promise<boolean> => {
    let success = false;
    if (connectionMode === 'serial') {
      success = await sendSerialCommand(cmd);
    } else if (connectionMode === 'ble') {
      success = await sendBLECommand(cmd);
    } else {
      // Fallback: try serial then BLE
      success = await sendSerialCommand(cmd);
      if (!success) {
        success = await sendBLECommand(cmd);
      }
    }
    return success;
  };

  const togglePump1 = async () => {
    if (!isConnected || sending) return;
    const nextState = !localP1;
    setSending(true);
    setLocalP1(nextState);
    setIsManualMode(true);
    suppressTelemetryUntil.current = Date.now() + 3500; // Hold state for 3.5s

    const cmd = nextState ? 'P1_ON' : 'P1_OFF';
    const ok = await dispatchCommand(cmd);
    if (ok) {
      showFeedback(`Command "${cmd}" sent to Arduino. Relay 1 (Pin D7) ${nextState ? 'ACTIVATED' : 'STOPPED'}.`);
    } else {
      showFeedback(`Failed to send "${cmd}". Check serial / Bluetooth connection.`);
    }
    setSending(false);
  };

  const togglePump2 = async () => {
    if (!isConnected || sending) return;
    const nextState = !localP2;
    setSending(true);
    setLocalP2(nextState);
    setIsManualMode(true);
    suppressTelemetryUntil.current = Date.now() + 3500;

    const cmd = nextState ? 'P2_ON' : 'P2_OFF';
    const ok = await dispatchCommand(cmd);
    if (ok) {
      showFeedback(`Command "${cmd}" sent to Arduino. Relay 2 (Pin D8) ${nextState ? 'ACTIVATED' : 'STOPPED'}.`);
    } else {
      showFeedback(`Failed to send "${cmd}". Check serial / Bluetooth connection.`);
    }
    setSending(false);
  };

  const switchToAuto = async () => {
    if (!isConnected || sending) return;
    setSending(true);
    setIsManualMode(false);
    suppressTelemetryUntil.current = 0;
    const ok = await dispatchCommand('AUTO_ON');
    if (ok) {
      showFeedback('Switched to Auto Thresholds. Arduino will manage pumps based on temp/pH/turbidity.');
    }
    setSending(false);
  };

  const switchToManual = async () => {
    if (!isConnected || sending) return;
    setSending(true);
    setIsManualMode(true);
    const ok = await dispatchCommand('MANUAL');
    if (ok) {
      showFeedback('Switched to Full Manual Control. Automatic overrides are disabled.');
    }
    setSending(false);
  };

  const togglePolarity = async () => {
    if (!isConnected || sending) return;
    setSending(true);
    const nextPolarity = relayPolarity === 'LOW' ? 'HIGH' : 'LOW';
    setRelayPolarity(nextPolarity);
    const cmd = nextPolarity === 'LOW' ? 'RELAY_LOW' : 'RELAY_HIGH';
    await dispatchCommand(cmd);
    showFeedback(`Relay polarity set to: Active-${nextPolarity}`);
    setSending(false);
  };

  const testPulse = async (pumpNum: 1 | 2) => {
    if (!isConnected || sending) return;
    setSending(true);
    suppressTelemetryUntil.current = Date.now() + 3000;
    showFeedback(`Testing Relay ${pumpNum} coil click (1-second pulse)...`);

    if (pumpNum === 1) {
      setLocalP1(true);
      await dispatchCommand('P1_ON');
      setTimeout(async () => {
        setLocalP1(false);
        await dispatchCommand('P1_OFF');
        setSending(false);
        showFeedback('Relay 1 test complete. Did you hear the click?');
      }, 1000);
    } else {
      setLocalP2(true);
      await dispatchCommand('P2_ON');
      setTimeout(async () => {
        setLocalP2(false);
        await dispatchCommand('P2_OFF');
        setSending(false);
        showFeedback('Relay 2 test complete. Did you hear the click?');
      }, 1000);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-5 shadow-xl transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Relay & Pump Control</h3>
              {connectionMode !== 'disconnected' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                  {connectionMode === 'serial' ? 'HC-05 / Serial COM' : connectionMode}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Dual Relay Module on Arduino Uno (Pump 1: D7 • Pump 2: D8)
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950/70 border border-slate-800 shrink-0">
          <button
            onClick={switchToManual}
            disabled={!isConnected || sending}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isManualMode
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            } disabled:opacity-50`}
            title="Farmer has full control. Auto overrides are disabled."
          >
            <Power className="w-3.5 h-3.5 text-amber-400" />
            <span>⚡ Manual Mode</span>
          </button>

          <button
            onClick={switchToAuto}
            disabled={!isConnected || sending}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              !isManualMode
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            } disabled:opacity-50`}
            title="Arduino automatically runs pumps based on water parameters."
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>🤖 Auto-Thresholds</span>
          </button>
        </div>
      </div>

      {/* Live Feedback Toast Banner */}
      {feedbackMsg && (
        <div className="mb-4 px-3.5 py-2 rounded-xl text-xs font-medium bg-cyan-950/50 border border-cyan-500/30 text-cyan-200 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Pumps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pump 1: Aerator / Circulation */}
        <div className={`p-4 rounded-2xl border transition-all ${
          localP1
            ? 'bg-cyan-950/40 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
            : 'bg-slate-950/50 border-slate-800/80'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                localP1 ? 'bg-cyan-500/20 text-cyan-400 animate-spin-slow ring-1 ring-cyan-500/40' : 'bg-slate-800 text-slate-500'
              }`}>
                <Waves className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Pump 1: Aerator</h4>
                <p className="text-[11px] text-slate-400">Oxygenation & Circulation (Relay 1 - D7)</p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
              localP1
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20 animate-pulse'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {localP1 ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>

          <p className="mt-3 text-[11px] text-slate-400">
            {isManualMode ? 'Manual override active. Click button below to control.' : 'Auto-triggers when Temp > 30°C or Turbidity > 50 NTU'}
          </p>

          <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
            <button
              onClick={() => testPulse(1)}
              disabled={!isConnected || sending}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-all disabled:opacity-40"
              title="Pulses Relay 1 for 1 second so you can hear the physical click"
            >
              <RotateCcw className="w-3 h-3 text-cyan-400" />
              <span>Test Click (1s)</span>
            </button>

            <button
              onClick={togglePump1}
              disabled={!isConnected || sending}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all text-xs ${
                localP1
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-500/20'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30'
              } disabled:opacity-50`}
            >
              <Power className="w-4 h-4" />
              <span>{localP1 ? 'Stop Pump 1' : 'Start Pump 1'}</span>
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
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                localP2 ? 'bg-blue-500/20 text-blue-400 animate-pulse ring-1 ring-blue-500/40' : 'bg-slate-800 text-slate-500'
              }`}>
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Pump 2: Fresh Water</h4>
                <p className="text-[11px] text-slate-400">Inlet / Dilution (Relay 2 - D8)</p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
              localP2
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm shadow-blue-500/20 animate-pulse'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {localP2 ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>

          <p className="mt-3 text-[11px] text-slate-400">
            {isManualMode ? 'Manual override active. Click button below to control.' : 'Auto-triggers when Turbidity > 75 NTU or pH outside 6.2 - 8.8'}
          </p>

          <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
            <button
              onClick={() => testPulse(2)}
              disabled={!isConnected || sending}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-all disabled:opacity-40"
              title="Pulses Relay 2 for 1 second so you can hear the physical click"
            >
              <RotateCcw className="w-3 h-3 text-blue-400" />
              <span>Test Click (1s)</span>
            </button>

            <button
              onClick={togglePump2}
              disabled={!isConnected || sending}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all text-xs ${
                localP2
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-500/20'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
              } disabled:opacity-50`}
            >
              <Power className="w-4 h-4" />
              <span>{localP2 ? 'Stop Pump 2' : 'Start Pump 2'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Relay Hardware Diagnostic Bar & Electrical Note */}
      <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>External Power Loop Required:</strong> Connect external 5V/12V adapter in series with Relay COM and NO terminals.
          </span>
        </div>

        <button
          onClick={togglePolarity}
          disabled={!isConnected || sending}
          className="px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center gap-1.5 transition-all text-[10px] shrink-0 disabled:opacity-50"
          title="Change relay trigger logic if your relay board turns ON when you click Stop"
        >
          <span>Logic:</span>
          <span className="font-bold text-amber-300">Active-{relayPolarity}</span>
          <span className="text-slate-500">(Click to invert)</span>
        </button>
      </div>
    </div>
  );
};
