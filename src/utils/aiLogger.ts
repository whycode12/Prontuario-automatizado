export interface AiLogEntry {
  id: string;
  timestamp: string;
  action: string;
  model: string;
  status: 'running' | 'success' | 'error';
  durationMs?: number;
  message: string;
  errorDetails?: string;
  payloadLength?: number;
}

type LogListener = () => void;
const listeners = new Set<LogListener>();
const logs: AiLogEntry[] = [];
const MAX_LOGS = 60;

export function addAiLog(entry: Omit<AiLogEntry, 'id' | 'timestamp'>): string {
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const timestamp = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const newEntry: AiLogEntry = { ...entry, id, timestamp };
  logs.unshift(newEntry);
  if (logs.length > MAX_LOGS) {
    logs.pop();
  }
  notify();
  return id;
}

export function updateAiLog(id: string, updates: Partial<AiLogEntry>): void {
  const item = logs.find((l) => l.id === id);
  if (item) {
    Object.assign(item, updates);
    notify();
  }
}

export function getAiLogs(): AiLogEntry[] {
  return [...logs];
}

export function clearAiLogs(): void {
  logs.length = 0;
  notify();
}

export function subscribeAiLogs(listener: LogListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}
