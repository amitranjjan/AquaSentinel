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
          containerBg: 'bg-emerald-50/70 border-emerald-200/90 text-slate-800',
          iconBox: 'bg-emerald-500 text-white',
          icon: <ShieldCheck className="w-6 h-6 text-white" />,
          badgeClass: 'bg-emerald-600 text-white font-bold'
        };
      case 'ATTENTION':
        return {
          label: 'ATTENTION',
          description: `One parameter is trending toward outer thresholds. Early observation recommended.`,
          containerBg: 'bg-sky-50/70 border-sky-200/90 text-slate-800',
          iconBox: 'bg-sky-500 text-white',
          icon: <AlertTriangle className="w-6 h-6 text-white" />,
          badgeClass: 'bg-sky-600 text-white font-bold'
        };
      case 'WARNING':
        return {
          label: 'WARNING',
          description: `At least one parameter is outside preferred range. Check telemetry and fish behavior.`,
          containerBg: 'bg-amber-50/70 border-amber-200/90 text-slate-800',
          iconBox: 'bg-amber-500 text-white',
          icon: <AlertTriangle className="w-6 h-6 text-white animate-pulse" />,
          badgeClass: 'bg-amber-600 text-white font-bold'
        };
      case 'CRITICAL':
      case 'ALERT':
        return {
          label: 'CRITICAL ALERT',
          description: `Conditions present immediate stress to cultured fish! Follow safety actions immediately.`,
          containerBg: 'bg-rose-50/70 border-rose-200/90 text-slate-800',
          iconBox: 'bg-rose-500 text-white shadow-xs',
          icon: <AlertOctagon className="w-6 h-6 text-white animate-pulse" />,
          badgeClass: 'bg-rose-600 text-white font-bold'
        };
      case 'SENSOR_ERROR':
        return {
          label: 'SENSOR ERROR',
          description: `One or more probes are disconnected or unreadable. Inspect physical hardware wiring.`,
          containerBg: 'bg-rose-50/70 border-rose-200/90 text-slate-800',
          iconBox: 'bg-rose-500 text-white',
          icon: <HelpCircle className="w-6 h-6 text-white animate-pulse" />,
          badgeClass: 'bg-rose-600 text-white font-bold'
        };
      case 'DISCONNECTED':
      default:
        if (connectionMode === 'serial') {
          return {
            label: 'SERIAL LINKED — AWAITING TELEMETRY',
            description: `Serial port linked! Listening for JSON telemetry stream from Arduino Uno...`,
            containerBg: 'bg-sky-50/70 border-sky-200 text-slate-800',
            iconBox: 'bg-sky-500 text-white',
            icon: <Radio className="w-6 h-6 text-white animate-pulse" />,
            badgeClass: 'bg-sky-600 text-white font-bold'
          };
        }
        if (connectionMode === 'ble') {
          return {
            label: 'BLE LINKED — AWAITING TELEMETRY',
            description: `Bluetooth Low Energy linked! Waiting for first telemetry notification packet...`,
            containerBg: 'bg-sky-50/70 border-sky-200 text-slate-800',
            iconBox: 'bg-sky-500 text-white',
            icon: <Radio className="w-6 h-6 text-white animate-pulse" />,
            badgeClass: 'bg-sky-600 text-white font-bold'
          };
        }
        return {
          label: 'DEVICE DISCONNECTED',
          description: `Click 'Connect HC-05 Bluetooth / USB Serial' to connect your Arduino Uno.`,
          containerBg: 'bg-white border-slate-200 text-slate-800 shadow-xs',
          iconBox: 'bg-slate-100 text-slate-500 border border-slate-200',
          icon: <HelpCircle className="w-6 h-6 text-slate-500" />,
          badgeClass: 'bg-slate-200 text-slate-700 font-bold'
        };
    }
  };

  const details = getOverallDetails(status.overall);

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${details.containerBg} shadow-xs relative overflow-hidden transition-all duration-300`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Status Icon & Text */}
        <div className="flex items-center gap-3.5">
          <div className={`p-2.5 rounded-xl ${details.iconBox} shadow-xs shrink-0 flex items-center justify-center`}>
            {details.icon}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                OVERALL WATER QUALITY
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${details.badgeClass}`}>
                {details.label}
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
              {details.description}
            </p>
          </div>
        </div>

        {/* Right Side: Cultured Stock & Last Telemetry */}
        <div className="flex items-center gap-6 self-start md:self-center border-t md:border-t-0 md:border-l border-slate-200/80 pt-3 md:pt-0 md:pl-6 shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              CULTURED STOCK
            </span>
            <span className="text-sm font-bold text-slate-800">
              {species}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              LAST TELEMETRY
            </span>
            <span className="text-sm font-bold text-slate-800">
              {lastUpdated}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
