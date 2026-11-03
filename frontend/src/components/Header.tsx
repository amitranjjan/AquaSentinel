import React from 'react';
import {
  Waves,
  Bluetooth,
  Cable,
  BluetoothOff,
  Sliders,
  UserCheck,
  Volume2,
  VolumeX,
  AlertTriangle
} from 'lucide-react';
import type { SensorStatus, FarmProfile } from '../types';

interface HeaderProps {
  connectionMode: 'ble' | 'serial' | 'simulator' | 'disconnected';
  bleDeviceName: string | null;
  onConnectBLE: () => void;
  onConnectSerial: () => void;
  onDisconnect: () => void;
  onToggleSimulator: () => void;
  isSimulatorOpen: boolean;
  onOpenProfile: () => void;
  sensorStatus: SensorStatus;
  farmProfile: FarmProfile;
  buzzerMuted: boolean;
  onToggleMute: () => void;
  geminiLive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  connectionMode,
  bleDeviceName,
  onConnectBLE,
  onConnectSerial,
  onDisconnect,
  onToggleSimulator,
  isSimulatorOpen,
  onOpenProfile,
  sensorStatus,
  farmProfile,
  buzzerMuted,
  onToggleMute,
  geminiLive
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand and Subtitle */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-lg shadow-cyan-500/20">
            <Waves className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                AquaSentinel
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  IoT + Gemini AI
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Fish Pond Monitoring System • <span className="text-cyan-300 font-medium">{farmProfile.pondName}</span> ({farmProfile.fishSpecies})
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* AI Intelligence Mode Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-slate-800/80 border-slate-700 text-slate-300">
            <span className={`w-2 h-2 rounded-full ${geminiLive ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400'}`} />
            <span>{geminiLive ? 'Gemini 3.8 Flash Active' : 'Aquaculture Rule Engine'}</span>
          </div>

          {/* Buzzer Alert Status Indicator */}
          {sensorStatus.buzzer && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-500 text-red-300 text-xs font-semibold animate-bounce">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>BUZZER ALERT</span>
              <button
                onClick={onToggleMute}
                title={buzzerMuted ? "Unmute Buzzer" : "Mute Buzzer"}
                aria-label={buzzerMuted ? "Unmute Buzzer" : "Mute Buzzer"}
                className="ml-1 p-0.5 hover:text-white"
              >
                {buzzerMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Connection Status Pill */}
          <div className="flex items-center">
            {connectionMode === 'ble' ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <Bluetooth className="w-3.5 h-3.5 text-emerald-400" />
                <span>BLE: CONNECTED ({bleDeviceName || 'Device'})</span>
                <button
                  onClick={onDisconnect}
                  className="ml-1 text-slate-400 hover:text-white text-[11px] underline"
                >
                  Disconnect
                </button>
              </div>
            ) : connectionMode === 'serial' ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <Cable className="w-3.5 h-3.5 text-emerald-400" />
                <span>SERIAL: CONNECTED ({bleDeviceName || 'HC-05 / COM'})</span>
                <button
                  onClick={onDisconnect}
                  className="ml-1 text-slate-400 hover:text-white text-[11px] underline"
                >
                  Disconnect
                </button>
              </div>
            ) : connectionMode === 'simulator' ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>SIMULATOR ACTIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs">
                <BluetoothOff className="w-3.5 h-3.5" />
                <span>DISCONNECTED</span>
              </div>
            )}
          </div>

          {/* Quick Connect Action Buttons when Disconnected */}
          {connectionMode === 'disconnected' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onConnectSerial}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-colors"
                title="Connect HC-05 Bluetooth or USB Cable via Web Serial"
              >
                <Cable className="w-3.5 h-3.5" />
                <span>Connect HC-05 / USB</span>
              </button>

              <button
                onClick={onConnectBLE}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition-colors"
                title="Connect BLE (HM-10 or ESP32)"
              >
                <Bluetooth className="w-3.5 h-3.5 text-cyan-400" />
                <span>BLE</span>
              </button>
            </div>
          )}

          {/* Toggle Simulator Controls */}
          <button
            onClick={onToggleSimulator}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isSimulatorOpen
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isSimulatorOpen ? 'Hide Simulator' : 'Test Scenarios'}</span>
          </button>

          {/* Farm Profile Button */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Farm Profile</span>
          </button>
        </div>
      </div>
    </header>
  );
};
