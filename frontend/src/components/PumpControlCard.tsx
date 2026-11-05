import React, { useState, useEffect, useRef } from 'react';
import { Waves, Droplets, Power, ShieldAlert, Cpu, Sparkles, CheckCircle2, RotateCcw, Play } from 'lucide-react';
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
  const [isManualMode, setIsManualMode] = useState(true);
  const [sending, setSending] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [relayPolarity, setRelayPolarity] = useState<'LOW' | 'HIGH'>('LOW');

  const suppressTelemetryUntil = useRef(0);

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
    suppressTelemetryUntil.current = Date.now() + 3500;

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
    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 lg:p-6 shadow-xs transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Relay &amp; Pump Control</h3>
              {connectionMode !== 'disconnected' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 uppercase">
                  {connectionMode === 'serial' ? 'HC-05 / SERIAL COM' : connectionMode}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Dual Relay Module on Arduino Uno (Pump 1: D7 • Pump 2: D8)
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-50 border border-slate-200 shrink-0">
          <button
            onClick={switchToManual}
            disabled={!isConnected || sending}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isManualMode
                ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-transparent'
            } disabled:opacity-50`}
            title="Farmer has full control. Auto overrides are disabled."
          >
            <Power className="w-3.5 h-3.5 text-amber-500" />
            <span>Manual Mode</span>
          </button>

          <button
            onClick={switchToAuto}
            disabled={!isConnected || sending}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              !isManualMode
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-transparent'
            } disabled:opacity-50`}
            title="Arduino automatically runs pumps based on water parameters."
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Thresholds</span>
          </button>
        </div>
      </div>

      {/* Live Feedback Toast Banner */}
      {feedbackMsg && (
        <div className="mb-4 px-3.5 py-2 rounded-xl text-xs font-medium bg-sky-50 border border-sky-200 text-sky-900 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Pumps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pump 1: Aerator / Circulation */}
        <div className="p-4 rounded-2xl border border-sky-100 bg-sky-50/40 transition-all">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-100 text-sky-600">
                <Waves className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Pump 1: Aerator</h4>
                <p className="text-[11px] text-slate-400">Oxygenation &amp; Circulation (Relay 1 - D7)</p>
              </div>
            </div>

            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              localP1
                ? 'bg-sky-100 text-sky-700 border border-sky-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              {localP1 ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>

          <p className="mt-2 text-[11px] text-slate-500">
            {isManualMode ? 'Manual override active. Click button below to control.' : 'Auto-triggers when Temp > 30°C or Turbidity > 50 NTU'}
          </p>

          <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
            <button
              onClick={() => testPulse(1)}
              disabled={!isConnected || sending}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-40"
              title="Pulses Relay 1 for 1 second so you can hear the physical click"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
              <span>Test Click (1s)</span>
            </button>

            <button
              onClick={togglePump1}
              disabled={!isConnected || sending}
              className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs ${
                localP1
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-xs'
                  : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-500/20'
              } disabled:opacity-50`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{localP1 ? 'Stop Pump 1' : 'Start Pump 1'}</span>
            </button>
          </div>
        </div>

        {/* Pump 2: Freshwater Flush / Drain */}
        <div className="p-4 rounded-2xl border border-sky-100 bg-sky-50/40 transition-all">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-100 text-sky-600">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Pump 2: Fresh Water</h4>
                <p className="text-[11px] text-slate-400">Inlet / Dilution (Relay 2 - D8)</p>
              </div>
            </div>

            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              localP2
                ? 'bg-sky-100 text-sky-700 border border-sky-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              {localP2 ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>

          <p className="mt-2 text-[11px] text-slate-500">
            {isManualMode ? 'Manual override active. Click button below to control.' : 'Auto-triggers when Turbidity > 75 NTU or pH outside 6.2 - 8.8'}
          </p>

          <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
            <button
              onClick={() => testPulse(2)}
              disabled={!isConnected || sending}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-40"
              title="Pulses Relay 2 for 1 second so you can hear the physical click"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
              <span>Test Click (1s)</span>
            </button>

            <button
              onClick={togglePump2}
              disabled={!isConnected || sending}
              className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs ${
                localP2
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-xs'
                  : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sm shadow-sky-500/20'
              } disabled:opacity-50`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{localP2 ? 'Stop Pump 2' : 'Start Pump 2'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Relay Hardware Diagnostic Bar & Electrical Note */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            <strong>External Power Loop Required:</strong> Connect external 5V/12V adapter in series with Relay COM and NO terminals.
          </span>
        </div>

        <button
          onClick={togglePolarity}
          disabled={!isConnected || sending}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors shrink-0 disabled:opacity-50"
          title="Change relay trigger logic if your relay board turns ON when you click Stop"
        >
          <span>Logic:</span>
          <span className="font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[11px]">
            Active {relayPolarity}
          </span>
          <span className="text-slate-400 hover:text-slate-600">(Click to invert)</span>
        </button>
      </div>
    </div>
  );
};
