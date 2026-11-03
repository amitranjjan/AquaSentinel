import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  WaterQuality,
  SensorStatus,
  FarmProfile,
  AiRecommendation,
  TelemetryPoint,
  ChatMessage
} from './types';
import {
  fetchFishAdvice,
  sendChatMessage,
  fetchAdviceHistory,
  clearAdviceHistory,
  checkServerHealth
} from './services/api';
import {
  requestAndConnectBLE,
  disconnectBLE
} from './services/bleService';
import {
  requestAndConnectSerial,
  disconnectSerial
} from './services/serialService';
import {
  computeStatuses,
  applyRealisticDrift,
  type SimulatorPreset,
  SIMULATOR_PRESETS
} from './services/sensorSimulator';
import { Header } from './components/Header';
import { SensorCard } from './components/SensorCard';
import { OverallStatusCard } from './components/OverallStatusCard';
import { GeminiAssistantCard } from './components/GeminiAssistantCard';
import { WaterQualityChart } from './components/WaterQualityChart';
import { AiChatDrawer } from './components/AiChatDrawer';
import { FarmProfileModal } from './components/FarmProfileModal';
import { AiHistoryTable } from './components/AiHistoryTable';
import { SimulatorPanel } from './components/SimulatorPanel';
import { RecommendationDetailModal } from './components/RecommendationDetailModal';
import { BleConnectPrompt } from './components/BleConnectPrompt';
import { PumpControlCard } from './components/PumpControlCard';
import { Terminal } from 'lucide-react';

export const App: React.FC = () => {
  // 1. Initial State: Disconnected by default until device is paired
  const [waterQuality, setWaterQuality] = useState<WaterQuality>({
    temperature: null,
    ph: null,
    turbidity: null,
    airTemperature: null,
    humidity: null,
    pump1: false,
    pump2: false
  });

  const [sensorStatus, setSensorStatus] = useState<SensorStatus>({
    temperature: 'DISCONNECTED',
    ph: 'DISCONNECTED',
    turbidity: 'DISCONNECTED',
    airTemperature: 'DISCONNECTED',
    humidity: 'DISCONNECTED',
    overall: 'DISCONNECTED',
    buzzer: false,
    pump1: false,
    pump2: false
  });

  const [farmProfile, setFarmProfile] = useState<FarmProfile>(() => {
    const saved = localStorage.getItem('aquasentinel_farm_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      farmName: 'AquaPond Alpha',
      pondName: 'Primary Grow-out Pond',
      fishSpecies: 'Tilapia',
      cultureType: 'Pond',
      pondSize: '1000 m2',
      fishAge: '3 months',
      approxStock: '5000'
    };
  });

  // UI Modals & Drawers
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDetailRec, setSelectedDetailRec] = useState<AiRecommendation | null>(null);

  // Connection mode: 'ble' (HM-10/ESP32), 'serial' (HC-05/USB), 'simulator', or 'disconnected'
  const [connectionMode, setConnectionMode] = useState<'ble' | 'serial' | 'simulator' | 'disconnected'>('disconnected');
  const [bleDeviceName, setBleDeviceName] = useState<string | null>(null);
  const [isDriftActive, setIsDriftActive] = useState<boolean>(false);
  const [buzzerMuted, setBuzzerMuted] = useState(false);
  const [geminiLive, setGeminiLive] = useState(false);

  // AI & Telemetry State
  const [currentAdvice, setCurrentAdvice] = useState<AiRecommendation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [triggerNotification, setTriggerNotification] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);
  const [adviceHistory, setAdviceHistory] = useState<AiRecommendation[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');

  // Tracking refs for automatic alert analysis cooldown
  const lastAnalyzedStatusRef = useRef<string>('');
  const lastAnalysisTimeRef = useRef<number>(0);
  const AUTO_ANALYSIS_COOLDOWN_MS = 45 * 1000;

  // Helper to reset sensors on disconnect
  const resetSensorsToDisconnected = useCallback(() => {
    setWaterQuality({
      temperature: null,
      ph: null,
      turbidity: null,
      airTemperature: null,
      humidity: null,
      pump1: false,
      pump2: false
    });
    setSensorStatus({
      temperature: 'DISCONNECTED',
      ph: 'DISCONNECTED',
      turbidity: 'DISCONNECTED',
      airTemperature: 'DISCONNECTED',
      humidity: 'DISCONNECTED',
      overall: 'DISCONNECTED',
      buzzer: false,
      pump1: false,
      pump2: false
    });
  }, []);

  // Save profile changes to localStorage
  const handleSaveProfile = (updated: FarmProfile) => {
    setFarmProfile(updated);
    localStorage.setItem('aquasentinel_farm_profile', JSON.stringify(updated));
    const newStatuses = computeStatuses(waterQuality, updated.fishSpecies);
    setSensorStatus(newStatuses);
  };

  // Check backend health on mount
  useEffect(() => {
    checkServerHealth().then(res => {
      setGeminiLive(res.geminiLive);
    });
    fetchAdviceHistory().then(res => {
      if (res.data) setAdviceHistory(res.data);
    }).catch(() => {});
  }, []);

  // Request AI Advice
  const requestAdvice = useCallback(async (forceRefresh = false, triggerReason = 'manual', reasonLabel?: string) => {
    setIsAnalyzing(true);
    if (reasonLabel) {
      setTriggerNotification(reasonLabel);
    }
    try {
      const res = await fetchFishAdvice({
        waterQuality,
        status: sensorStatus,
        farm: farmProfile,
        forceRefresh,
        triggerReason
      });

      if (res.success && res.data) {
        setCurrentAdvice(res.data);
        lastAnalyzedStatusRef.current = `${sensorStatus.overall}-${sensorStatus.ph}-${sensorStatus.temperature}-${sensorStatus.turbidity}`;
        lastAnalysisTimeRef.current = Date.now();

        fetchAdviceHistory().then(h => {
          if (h.data) setAdviceHistory(h.data);
        }).catch(() => {});
      }
    } catch (err: any) {
      console.error('[App] Failed to fetch advice:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [waterQuality, sensorStatus, farmProfile]);

  // Automatic alert detection
  useEffect(() => {
    if (connectionMode === 'disconnected' || (waterQuality.temperature === null && waterQuality.ph === null)) {
      return;
    }

    const isAlertState =
      sensorStatus.overall === 'ALERT' ||
      sensorStatus.overall === 'CRITICAL' ||
      sensorStatus.overall === 'SENSOR_ERROR' ||
      sensorStatus.ph === 'HIGH' ||
      sensorStatus.ph === 'LOW' ||
      sensorStatus.temperature === 'HIGH' ||
      sensorStatus.temperature === 'LOW' ||
      sensorStatus.turbidity === 'HIGH';

    const currentFingerprint = `${sensorStatus.overall}-${sensorStatus.ph}-${sensorStatus.temperature}-${sensorStatus.turbidity}`;
    const now = Date.now();
    const hasStatusChanged = currentFingerprint !== lastAnalyzedStatusRef.current;
    const cooldownElapsed = now - lastAnalysisTimeRef.current > AUTO_ANALYSIS_COOLDOWN_MS;

    if (isAlertState && (hasStatusChanged || cooldownElapsed) && !isAnalyzing) {
      let triggerText = `Auto-analysis triggered: ${sensorStatus.overall} status`;
      if (sensorStatus.ph !== 'NORMAL') triggerText = `Auto-analysis triggered: pH is ${sensorStatus.ph}`;
      else if (sensorStatus.turbidity === 'HIGH') triggerText = 'Auto-analysis triggered: High Turbidity detected';
      else if (sensorStatus.temperature !== 'NORMAL') triggerText = `Auto-analysis triggered: Temperature is ${sensorStatus.temperature}`;

      requestAdvice(false, 'auto_alert', triggerText);
    }
  }, [sensorStatus, connectionMode, waterQuality, isAnalyzing, requestAdvice]);

  // Cooldown countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.round((AUTO_ANALYSIS_COOLDOWN_MS - (now - lastAnalysisTimeRef.current)) / 1000));
      setCooldownSeconds(diff);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update Telemetry Record Stream
  const recordTelemetryPoint = useCallback((wq: WaterQuality, st: SensorStatus) => {
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setTelemetryHistory(prev => {
      const updated = [
        ...prev,
        {
          timestamp: now.getTime(),
          timeFormatted,
          temperature: wq.temperature,
          ph: wq.ph,
          turbidity: wq.turbidity,
          airTemperature: wq.airTemperature,
          humidity: wq.humidity,
          overallStatus: st.overall
        }
      ];
      if (updated.length > 30) updated.shift();
      return updated;
    });

    setLastUpdated(timeFormatted);
  }, []);

  // Simulator Drift Interval
  useEffect(() => {
    if (connectionMode !== 'simulator' || !isDriftActive) return;

    const interval = setInterval(() => {
      setWaterQuality(prev => {
        const drifted = applyRealisticDrift(prev);
        const newStatuses = computeStatuses(drifted, farmProfile.fishSpecies);
        setSensorStatus(newStatuses);
        recordTelemetryPoint(drifted, newStatuses);
        return drifted;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [connectionMode, isDriftActive, farmProfile.fishSpecies, recordTelemetryPoint]);

  // Manual simulator slider / preset update
  const handleUpdateWaterQuality = (newWq: WaterQuality) => {
    setWaterQuality(newWq);
    const newStatuses = computeStatuses(newWq, farmProfile.fishSpecies);
    setSensorStatus(newStatuses);
    recordTelemetryPoint(newWq, newStatuses);
  };

  const handleSelectPreset = (preset: SimulatorPreset) => {
    const newWq: WaterQuality = {
      temperature: preset.temperature,
      ph: preset.ph,
      turbidity: preset.turbidity,
      airTemperature: 29.5,
      humidity: 68.0,
      pump1: false,
      pump2: false
    };
    handleUpdateWaterQuality(newWq);
  };

  const hasRequestedFirstAdviceRef = useRef(false);

  // 1. Web Bluetooth (HM-10 / ESP32) Handler
  const handleConnectBLE = async () => {
    hasRequestedFirstAdviceRef.current = false;
    try {
      const devName = await requestAndConnectBLE(
        (data) => {
          setWaterQuality(data.waterQuality);
          setSensorStatus(data.status);
          recordTelemetryPoint(data.waterQuality, data.status);

          if (!hasRequestedFirstAdviceRef.current && (data.waterQuality.temperature !== null || data.waterQuality.ph !== null)) {
            hasRequestedFirstAdviceRef.current = true;
            requestAdvice(true, 'ble_connected', `Live telemetry established from ${devName}`);
          }
        },
        () => {
          setConnectionMode('disconnected');
          setBleDeviceName(null);
          hasRequestedFirstAdviceRef.current = false;
          resetSensorsToDisconnected();
          setTriggerNotification('AquaSentinel Node disconnected');
        },
        (err) => {
          alert(`Bluetooth Error: ${err.message}`);
        }
      );
      setConnectionMode('ble');
      setBleDeviceName(devName);
      setIsSimulatorOpen(false);
      setIsDriftActive(false);
      setTriggerNotification(`Connected to ${devName} via BLE`);
    } catch (err: any) {
      console.warn('BLE connect rejected or failed:', err.message);
    }
  };

  // 2. Web Serial (HC-05 Bluetooth COM / USB Cable) Handler
  const handleConnectSerial = async () => {
    hasRequestedFirstAdviceRef.current = false;
    try {
      const portLabel = await requestAndConnectSerial(
        (data) => {
          setWaterQuality(data.waterQuality);
          setSensorStatus(data.status);
          recordTelemetryPoint(data.waterQuality, data.status);

          if (!hasRequestedFirstAdviceRef.current && (data.waterQuality.temperature !== null || data.waterQuality.ph !== null)) {
            hasRequestedFirstAdviceRef.current = true;
            requestAdvice(true, 'serial_connected', `Live telemetry established from ${portLabel}`);
          }
        },
        () => {
          setConnectionMode('disconnected');
          setBleDeviceName(null);
          hasRequestedFirstAdviceRef.current = false;
          resetSensorsToDisconnected();
          setTriggerNotification('Serial / HC-05 device disconnected');
        },
        (err) => {
          alert(`Serial/HC-05 Error: ${err.message}`);
        }
      );
      setConnectionMode('serial');
      setBleDeviceName(portLabel);
      setIsSimulatorOpen(false);
      setIsDriftActive(false);
      setTriggerNotification(`Connected to ${portLabel}`);
    } catch (err: any) {
      console.warn('Serial connect rejected or failed:', err.message);
    }
  };

  // Disconnect any active hardware
  const handleDisconnect = async () => {
    if (connectionMode === 'ble') {
      disconnectBLE();
    } else if (connectionMode === 'serial') {
      await disconnectSerial();
    }
    setConnectionMode('disconnected');
    setBleDeviceName(null);
    hasRequestedFirstAdviceRef.current = false;
    resetSensorsToDisconnected();
    setTriggerNotification('Hardware disconnected by user');
  };

  // Demo Simulator Mode
  const handleEnableSimulator = () => {
    setConnectionMode('simulator');
    setBleDeviceName('Demo Simulator');
    setIsSimulatorOpen(true);
    setIsDriftActive(true);
    handleSelectPreset(SIMULATOR_PRESETS[0]);
    requestAdvice(true, 'simulator_enabled', 'Demo simulator active (Simulated Pond)');
  };

  // Chat message submit
  const handleSendMessage = async (userText: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setIsSendingChat(true);

    try {
      const res = await sendChatMessage({
        message: userText,
        conversationHistory: chatMessages,
        waterQuality,
        status: sensorStatus,
        farm: farmProfile
      });

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: res.data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        _source: res.data._source
      };

      setChatMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `Error contacting assistant: ${err.message}. Please check connection.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errMsg]);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Clear history
  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear AI recommendation logs?')) {
      await clearAdviceHistory();
      setAdviceHistory([]);
    }
  };

  // Audio tone for buzzer alert
  useEffect(() => {
    if (sensorStatus.buzzer && !buzzerMuted && typeof window !== 'undefined') {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } catch {}
    }
  }, [sensorStatus.buzzer, buzzerMuted, waterQuality]);

  const isHardwareConnected = connectionMode === 'ble' || connectionMode === 'serial';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 1. Header */}
      <Header
        connectionMode={connectionMode}
        bleDeviceName={bleDeviceName}
        onConnectBLE={handleConnectBLE}
        onConnectSerial={handleConnectSerial}
        onDisconnect={handleDisconnect}
        onToggleSimulator={() => setIsSimulatorOpen(prev => !prev)}
        isSimulatorOpen={isSimulatorOpen}
        onOpenProfile={() => setIsProfileOpen(true)}
        sensorStatus={sensorStatus}
        farmProfile={farmProfile}
        buzzerMuted={buzzerMuted}
        onToggleMute={() => setBuzzerMuted(prev => !prev)}
        geminiLive={geminiLive}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Connection Banner when Disconnected */}
        {connectionMode === 'disconnected' && (
          <BleConnectPrompt
            onConnectBLE={handleConnectBLE}
            onConnectSerial={handleConnectSerial}
            onEnableSimulator={handleEnableSimulator}
          />
        )}

        {/* Simulator Drawer / Toolbar */}
        <SimulatorPanel
          isOpen={isSimulatorOpen && connectionMode === 'simulator'}
          waterQuality={waterQuality}
          onUpdateWaterQuality={handleUpdateWaterQuality}
          onSelectPreset={handleSelectPreset}
          isDriftActive={isDriftActive}
          onToggleDrift={() => setIsDriftActive(prev => !prev)}
          onReset={() => handleSelectPreset(SIMULATOR_PRESETS[0])}
        />

        {/* 2. Overall Water Quality Banner */}
        <OverallStatusCard
          status={sensorStatus}
          lastUpdated={lastUpdated}
          species={farmProfile.fishSpecies}
          connectionMode={connectionMode}
        />

        {/* Diagnostic Helper Banner for Serial / HC-05 */}
        {connectionMode === 'serial' && sensorStatus.overall === 'DISCONNECTED' && (
          <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
            <div>
              <p className="font-bold text-cyan-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                Serial Port Connected &mdash; Awaiting First Telemetry Packet
              </p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Windows creates 2 Bluetooth ports for HC-05 (<strong>Outgoing</strong> and <strong>Incoming</strong>). If no readings appear within 5 seconds, click <strong>Disconnect</strong> and select the other COM port from the prompt.
              </p>
            </div>
            <button
              onClick={handleDisconnect}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold shrink-0 text-[11px]"
            >
              Switch COM Port
            </button>
          </div>
        )}

        {/* 3. Sensor Metrics Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <SensorCard
            type="temperature"
            value={waterQuality.temperature}
            status={sensorStatus.temperature}
            unit="°C"
            targetRange="26 - 32 °C"
            speciesName={farmProfile.fishSpecies}
          />
          <SensorCard
            type="ph"
            value={waterQuality.ph}
            status={sensorStatus.ph}
            unit=""
            targetRange="6.5 - 8.5"
            speciesName={farmProfile.fishSpecies}
          />
          <SensorCard
            type="turbidity"
            value={waterQuality.turbidity}
            status={sensorStatus.turbidity}
            unit="NTU"
            targetRange="< 50 NTU"
            speciesName={farmProfile.fishSpecies}
          />
          <SensorCard
            type="airTemperature"
            value={waterQuality.airTemperature ?? null}
            status={sensorStatus.airTemperature ?? (waterQuality.airTemperature !== null ? 'NORMAL' : 'DISCONNECTED')}
            unit="°C"
            targetRange="20 - 35 °C"
            speciesName={farmProfile.fishSpecies}
          />
          <SensorCard
            type="humidity"
            value={waterQuality.humidity ?? null}
            status={sensorStatus.humidity ?? (waterQuality.humidity !== null ? 'NORMAL' : 'DISCONNECTED')}
            unit="%"
            targetRange="40 - 80 %"
            speciesName={farmProfile.fishSpecies}
          />
        </div>

        {/* 4. Dual Relay Pump Controller */}
        <PumpControlCard
          pump1Active={Boolean(waterQuality.pump1 || sensorStatus.pump1)}
          pump2Active={Boolean(waterQuality.pump2 || sensorStatus.pump2)}
          isConnected={isHardwareConnected}
        />

        {/* 5. Gemini Fish-Culture Assistant Card */}
        <GeminiAssistantCard
          advice={currentAdvice}
          isLoading={isAnalyzing}
          isConnected={connectionMode !== 'disconnected'}
          onRefresh={() => requestAdvice(true, 'manual_refresh', 'Manual refresh requested by farmer')}
          onAskGemini={() => setIsChatOpen(true)}
          onViewDetails={() => {
            setSelectedDetailRec(currentAdvice);
            setIsDetailsOpen(true);
          }}
          cooldownSeconds={cooldownSeconds}
          triggerNotification={triggerNotification}
        />

        {/* 6. Water Quality Time Series Chart */}
        <WaterQualityChart
          data={telemetryHistory}
          farmProfile={farmProfile}
        />

        {/* 7. AI History Table */}
        <AiHistoryTable
          history={adviceHistory}
          onClearHistory={handleClearHistory}
          onSelectRecommendation={(rec) => {
            setSelectedDetailRec(rec);
            setIsDetailsOpen(true);
          }}
        />

        {/* Hardware & Connect Quick Tip */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Supports <strong>HC-05 (via Web Serial COM)</strong>, <strong>HM-10 (BLE)</strong>, and <strong>Direct USB</strong>. Firmware in <code className="font-mono text-cyan-300">firmware/AquaSentinel_ArduinoUno/</code>.
            </span>
          </div>
          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="text-cyan-400 hover:text-cyan-300 underline font-medium self-start sm:self-center"
          >
            Configure Test Scenarios
          </button>
        </div>
      </main>

      {/* Slide-out / Modal Panels */}
      <AiChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        isSending={isSendingChat}
        waterQuality={waterQuality}
        sensorStatus={sensorStatus}
        farmProfile={farmProfile}
      />

      <FarmProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={farmProfile}
        onSave={handleSaveProfile}
      />

      <RecommendationDetailModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        recommendation={selectedDetailRec}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-600">
        AquaSentinel • IoT Water Quality & Gemini AI Decision Support for Fish Farming • Owner: Amit Ranjan
      </footer>
    </div>
  );
};

export default App;
