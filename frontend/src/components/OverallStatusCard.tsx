import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, HelpCircle, Radio } from 'lucide-react';
import type { OverallStatusCode, SensorStatus } from '../types';

interface OverallStatusCardProps {
  status: SensorStatus;
  lastUpdated: string;
  species: string;
  connectionMode?: 'ble' | 'serial' | 'simulator' | 'disconnected';
}

export const OverallStatusCard: React.FC<OverallStatusCardProps> = ({
  status,
  lastUpdated,
  species,
  connectionMode = 'disconnected'
}) => {
  const getOverallDetails = (code: OverallStatusCode) => {
    switch (code) {
      case 'NORMAL':
        return {
          label: 'NORMAL',
          description: `All monitored parameters are well within safe physiological limits for ${species}.`,
          bg: 'from-emerald-950/60 to-slate-900 border-emerald-500/40 text-emerald-300',
          icon: <ShieldCheck className="w-8 h-8 text-emerald-400" />,
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        };
      case 'ATTENTION':
        return {
          label: 'ATTENTION',
          description: `One parameter is trending toward outer thresholds. Early observation recommended.`,
          bg: 'from-blue-950/60 to-slate-900 border-blue-500/40 text-blue-300',
          icon: <AlertTriangle className="w-8 h-8 text-blue-400" />,
          badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
        };
      case 'WARNING':
        return {
          label: 'WARNING',
          description: `At least one parameter is outside preferred range. Check telemetry and fish behavior.`,
          bg: 'from-amber-950/70 to-slate-900 border-amber-500/40 text-amber-300',
          icon: <AlertTriangle className="w-8 h-8 text-amber-400 animate-pulse" />,
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        };
      case 'CRITICAL':
      case 'ALERT':
        return {
          label: 'CRITICAL ALERT',
          description: `Conditions present immediate stress to cultured fish! Follow safety actions immediately.`,
          bg: 'from-red-950/80 to-slate-900 border-red-500/60 text-red-200',
          icon: <AlertOctagon className="w-8 h-8 text-red-400 animate-bounce" />,
          badgeBg: 'bg-red-500/30 text-red-200 border-red-500/60'
        };
      case 'SENSOR_ERROR':
        return {
          label: 'SENSOR ERROR',
          description: `One or more probes are disconnected or unreadable. Inspect physical hardware wiring.`,
          bg: 'from-purple-950/80 to-slate-900 border-purple-500/60 text-purple-200',
          icon: <HelpCircle className="w-8 h-8 text-purple-400 animate-pulse" />,
          badgeBg: 'bg-purple-500/30 text-purple-200 border-purple-500/60'
        };
      case 'DISCONNECTED':
      default:
        if (connectionMode === 'serial') {
          return {
            label: 'SERIAL PORT OPEN — AWAITING SENSOR DATA',
            description: `Serial port linked! Listening for JSON telemetry stream from Arduino Uno...`,
            bg: 'from-teal-950/70 to-slate-900 border-teal-500/50 text-teal-300',
            icon: <Radio className="w-8 h-8 text-teal-400 animate-pulse" />,
            badgeBg: 'bg-teal-500/30 text-teal-200 border-teal-500/60'
          };
        }
        if (connectionMode === 'ble') {
          return {
            label: 'BLE LINKED — AWAITING TELEMETRY',
            description: `Bluetooth Low Energy linked! Waiting for first telemetry notification packet...`,
            bg: 'from-cyan-950/70 to-slate-900 border-cyan-500/50 text-cyan-300',
            icon: <Radio className="w-8 h-8 text-cyan-400 animate-pulse" />,
            badgeBg: 'bg-cyan-500/30 text-cyan-200 border-cyan-500/60'
          };
        }
        return {
          label: 'DEVICE DISCONNECTED',
          description: `Click 'Connect HC-05 Bluetooth / USB Serial' to connect your Arduino Uno.`,
          bg: 'from-slate-950 to-slate-900 border-slate-700 text-slate-400',
          icon: <HelpCircle className="w-8 h-8 text-slate-500" />,
          badgeBg: 'bg-slate-800 text-slate-300 border-slate-700'
        };
    }
  };

  const details = getOverallDetails(status.overall);

  return (
    <div className={`rounded-2xl border p-5 bg-gradient-to-r ${details.bg} shadow-lg relative overflow-hidden transition-all duration-300`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Status Icon & Text */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-700/50 shadow-inner">
            {details.icon}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Overall Water Quality
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${details.badgeBg}`}>
                {details.label}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium leading-relaxed">
              {details.description}
            </p>
          </div>
        </div>

        {/* Right Side: Species & Time Badge */}
        <div className="flex items-center gap-3 self-end md:self-center shrink-0">
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Cultured Stock</p>
            <p className="text-sm font-bold text-white font-mono">{species}</p>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Last Telemetry</p>
            <p className="text-sm font-bold text-slate-200 font-mono">{lastUpdated}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
