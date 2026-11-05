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
    <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand and Subtitle */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-sky-500 text-white shadow-sm flex items-center justify-center">
            <Waves className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                AquaSentinel
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-sky-50 text-sky-600 border border-sky-200">
                  IOT + GEMINI AI
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Fish Pond Monitoring System • <span className="text-sky-600 font-semibold">{farmProfile.pondName}</span> ({farmProfile.fishSpecies})
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* AI Intelligence Mode Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-emerald-50 border-emerald-200/80 text-emerald-800">
            <span className={`w-2 h-2 rounded-full ${geminiLive ? 'bg-emerald-500 shadow-sm shadow-emerald-400' : 'bg-amber-500'}`} />
            <span>{geminiLive ? 'Gemini 3.8 Flash Active' : 'Aquaculture Rule Engine'}</span>
          </div>

          {/* Buzzer Alert Status Indicator */}
          {sensorStatus.buzzer && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-bounce shadow-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>BUZZER ALERT</span>
              <button
                onClick={onToggleMute}
                title={buzzerMuted ? "Unmute Buzzer" : "Mute Buzzer"}
                aria-label={buzzerMuted ? "Unmute Buzzer" : "Mute Buzzer"}
                className="ml-0.5 p-0.5 hover:text-rose-900"
              >
                {buzzerMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Connection Status Pill */}
          <div className="flex items-center">
            {connectionMode === 'ble' ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <Bluetooth className="w-3.5 h-3.5 text-emerald-600" />
                <span>BLE: CONNECTED ({bleDeviceName || 'Device'})</span>
                <button
                  onClick={onDisconnect}
                  className="ml-1 text-sky-600 hover:text-sky-700 text-[11px] underline font-bold"
                >
                  Disconnect
                </button>
              </div>
            ) : connectionMode === 'serial' ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <Cable className="w-3.5 h-3.5 text-emerald-600" />
                <span>SERIAL: CONNECTED ({bleDeviceName || 'HC-05 / Serial COM'})</span>
                <button
                  onClick={onDisconnect}
                  className="ml-1 text-sky-600 hover:text-sky-700 text-[11px] underline font-bold"
                >
                  Disconnect
                </button>
              </div>
            ) : connectionMode === 'simulator' ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                <span>SIMULATOR ACTIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-xs font-medium">
                <BluetoothOff className="w-3.5 h-3.5 text-slate-400" />
                <span>DISCONNECTED</span>
              </div>
            )}
          </div>

          {/* Quick Connect Action Buttons when Disconnected */}
          {connectionMode === 'disconnected' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onConnectSerial}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-sm shadow-sky-500/20 transition-all"
                title="Connect HC-05 Bluetooth or USB Cable via Web Serial"
              >
                <Cable className="w-3.5 h-3.5" />
                <span>Connect HC-05 / USB</span>
              </button>

              <button
                onClick={onConnectBLE}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs transition-all"
                title="Connect BLE (HM-10 or ESP32)"
              >
                <Bluetooth className="w-3.5 h-3.5 text-sky-600" />
                <span>BLE</span>
              </button>
            </div>
          )}

          {/* Toggle Simulator Controls */}
          <button
            onClick={onToggleSimulator}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isSimulatorOpen
                ? 'bg-sky-50 border-sky-300 text-sky-700'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-sky-600" />
            <span>{isSimulatorOpen ? 'Hide Simulator' : 'Test Scenarios'}</span>
          </button>

          {/* Farm Profile Button */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs transition-all"
          >
            <UserCheck className="w-3.5 h-3.5 text-sky-600" />
            <span>Farm Profile</span>
          </button>
        </div>
      </div>
    </header>
  );
};
