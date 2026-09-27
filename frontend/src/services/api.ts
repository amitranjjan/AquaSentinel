import type {
  WaterQuality,
  SensorStatus,
  FarmProfile,
  AiRecommendation,
  ChatMessage
} from '../types';

const API_BASE = '/api/ai';

export async function fetchFishAdvice({
  waterQuality,
  status,
  farm,
  forceRefresh = false,
  triggerReason = 'manual'
}: {
  waterQuality: WaterQuality;
  status: SensorStatus;
  farm: FarmProfile;
  forceRefresh?: boolean;
  triggerReason?: string;
}): Promise<{ success: boolean; cached: boolean; data: AiRecommendation }> {
  const res = await fetch(`${API_BASE}/fish-advice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      waterQuality,
      status,
      farm,
      forceRefresh,
      triggerReason
    })
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch AI advice: ${res.statusText}`);
  }
  return res.json();
}

export async function sendChatMessage({
  message,
  conversationHistory,
  waterQuality,
  status,
  farm
}: {
  message: string;
  conversationHistory: ChatMessage[];
  waterQuality: WaterQuality;
  status: SensorStatus;
  farm: FarmProfile;
}): Promise<{ success: boolean; data: { reply: string; timestamp: string; _source?: string } }> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      conversationHistory: conversationHistory.map(m => ({ role: m.role, text: m.text })),
      waterQuality,
      status,
      farm
    })
  });

  if (!res.ok) {
    throw new Error(`Failed to send chat message: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchAdviceHistory(): Promise<{ success: boolean; data: AiRecommendation[] }> {
  const res = await fetch(`${API_BASE}/history`);
  if (!res.ok) {
    throw new Error(`Failed to fetch advice history: ${res.statusText}`);
  }
  return res.json();
}

export async function clearAdviceHistory(): Promise<void> {
  await fetch(`${API_BASE}/history`, { method: 'DELETE' });
}

export async function checkServerHealth(): Promise<{
  geminiLive: boolean;
  model: string;
  status: string;
}> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return { geminiLive: false, model: 'unknown', status: 'offline' };
    return res.json();
  } catch {
    return { geminiLive: false, model: 'unknown', status: 'unreachable' };
  }
}
