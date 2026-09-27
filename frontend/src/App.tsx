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
import { Terminal } from 'lucide-react';

export const App: React.FC = () => {
  // 1. Initial State: Disconnected by default until BLE device is paired
  const [waterQuality, setWaterQuality] = useState<WaterQuality>({
    temperature: null,
    ph: null,
    turbidity: null
  });

  const [sensorStatus, setSensorStatus] = useState<SensorStatus>({
    temperature: 'DISCONNECTED',
    ph: 'DISCONNECTED',
    turbidity: 'DISCONNECTED',
    overall: 'DISCONNECTED',
    buzzer: false
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

  // Connection & Simulator state: Web only operates when connected to BLE device
  const [connectionMode, setConnectionMode] = useState<'ble' | 'simulator' | 'disconnected'>('disconnected');
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

  // Save profile changes to localStorage
  const handleSaveProfile = (updated: FarmProfile) => {
    setFarmProfile(updated);
    localStorage.setItem('aquasentinel_farm_profile', JSON.stringify(updated));
    // Recompute statuses for new species
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

        // Refresh advice history
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

  // Automatic alert detection (PRD Section 6) - only active when device is connected
  useEffect(() => {
    // Only analyze when device is actively streaming data
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
          overallStatus: st.overall
        }
      ];
      // Keep latest 30 telemetry points
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
      turbidity: preset.turbidity
    };
    handleUpdateWaterQuality(newWq);
  };

  // Web Bluetooth Handlers
  const hasRequestedFirstBleAdviceRef = useRef(false);

  const handleConnectBLE = async () => {
    hasRequestedFirstBleAdviceRef.current = false;
    try {
      const devName = await requestAndConnectBLE(
        (data) => {
          setWaterQuality(data.waterQuality);
          setSensorStatus(data.status);
          recordTelemetryPoint(data.waterQuality, data.status);

          // Request first AI assessment on initial BLE telemetry packet
          if (!hasRequestedFirstBleAdviceRef.current && (data.waterQuality.temperature !== null || data.waterQuality.ph !== null)) {
            hasRequestedFirstBleAdviceRef.current = true;
            requestAdvice(true, 'ble_connected', `Live telemetry established from ${devName}`);
          }
        },
        () => {
          setConnectionMode('disconnected');
          setBleDeviceName(null);
          hasRequestedFirstBleAdviceRef.current = false;
          setWaterQuality({ temperature: null, ph: null, turbidity: null });
          setSensorStatus({
            temperature: 'DISCONNECTED',
            ph: 'DISCONNECTED',
            turbidity: 'DISCONNECTED',
            overall: 'DISCONNECTED',
            buzzer: false
          });
          setTriggerNotification('AquaSentinel ESP32 disconnected');
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

  const handleDisconnectBLE = () => {
    disconnectBLE();
    setConnectionMode('disconnected');
    setBleDeviceName(null);
    hasRequestedFirstBleAdviceRef.current = false;
    setWaterQuality({ temperature: null, ph: null, turbidity: null });
    setSensorStatus({
      temperature: 'DISCONNECTED',
      ph: 'DISCONNECTED',
      turbidity: 'DISCONNECTED',
      overall: 'DISCONNECTED',
      buzzer: false
    });
    setTriggerNotification('AquaSentinel BLE disconnected');
  };

  const handleEnableSimulator = () => {
    setConnectionMode('simulator');
    setIsSimulatorOpen(true);
    setIsDriftActive(true);
    const initialWq: WaterQuality = {
      temperature: 29.25,
      ph: 6.95,
      turbidity: 55.6
    };
    setWaterQuality(initialWq);
    const newStatuses = computeStatuses(initialWq, farmProfile.fishSpecies);
    setSensorStatus(newStatuses);
    recordTelemetryPoint(initialWq, newStatuses);
    requestAdvice(true, 'simulator_enabled', 'Simulation mode activated for test verification');
  };

  // Farmer Chat Handler
  const handleSendMessage = async (msg: string) => {
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: msg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setIsSendingChat(true);

    try {
      const res = await sendChatMessage({
        message: msg,
        conversationHistory: [...chatMessages, userMsg],
        waterQuality,
        status: sensorStatus,
        farm: farmProfile
      });

      if (res.success && res.data) {
        const modelMsg: ChatMessage = {
          id: `mod-${Date.now()}`,
          role: 'model',
          text: res.data.reply,
          timestamp: new Date(res.data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          _source: res.data._source
        };
        setChatMessages(prev => [...prev, modelMsg]);
      }
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: 'Unable to reach the assistant server. Please check your backend connection.',
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
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz alert tone
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15); // short 150ms beep
      } catch {}
    }
  }, [sensorStatus.buzzer, buzzerMuted, waterQuality]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 1. Header */}
      <Header
        connectionMode={connectionMode}
        bleDeviceName={bleDeviceName}
        onConnectBLE={handleConnectBLE}
        onDisconnectBLE={handleDisconnectBLE}
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
        {/* Prominent BLE Connection Banner: Web operates only when device is connected via BLE */}
        {connectionMode === 'disconnected' && (
          <BleConnectPrompt
            onConnectBLE={handleConnectBLE}
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

        {/* 2. Overall Water Quality Banner (PRD Section 16) */}
        <OverallStatusCard
          status={sensorStatus}
          lastUpdated={lastUpdated}
          species={farmProfile.fishSpecies}
        />

        {/* 3. Sensor Metrics Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
        </div>

        {/* 4. Gemini Fish-Culture Assistant Card (PRD Section 5) */}
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

        {/* 5. Water Quality Time Series Chart (PRD Section 16) */}
        <WaterQualityChart
          data={telemetryHistory}
          farmProfile={farmProfile}
        />

        {/* 6. AI History Table (PRD Section 15) */}
        <AiHistoryTable
          history={adviceHistory}
          onClearHistory={handleClearHistory}
          onSelectRecommendation={(rec) => {
            setSelectedDetailRec(rec);
            setIsDetailsOpen(true);
          }}
        />

        {/* Hardware & BLE Guide Quick Tip */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              ESP32 Firmware ready in <code className="font-mono text-cyan-300">firmware/AquaSentinel_ESP32/</code>. Connects directly via Chrome Web Bluetooth.
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
        AquaSentinel • IoT Water Quality & Gemini AI Decision Support for Fish Farming
      </footer>
    </div>
  );
};

export default App;
