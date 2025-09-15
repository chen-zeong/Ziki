import { defineStore } from 'pinia';

export type LogLevel = 'info' | 'success' | 'warning' | 'error';

export interface LogEntry {
  id: string;
  timestamp: number; // epoch ms
  level: LogLevel;
  message: string;
  meta?: Record<string, any>;
}

const MAX_LOGS = 200;

export const useLogStore = defineStore('log', {
  state: () => ({
    logs: [] as LogEntry[],
    unread: 0,
  }),
  getters: {
    hasUnread: (s) => s.unread > 0,
    orderedLogs: (s) => [...s.logs].sort((a, b) => b.timestamp - a.timestamp),
  },
  actions: {
    add(message: string, level: LogLevel = 'info', meta?: Record<string, any>) {
      const entry: LogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        level,
        message,
        meta,
      };
      this.logs.unshift(entry);
      if (this.logs.length > MAX_LOGS) this.logs.length = MAX_LOGS;
      this.unread += 1;
      return entry.id;
    },
    addInfo(message: string, meta?: Record<string, any>) { this.add(message, 'info', meta); },
    addSuccess(message: string, meta?: Record<string, any>) { this.add(message, 'success', meta); },
    addWarning(message: string, meta?: Record<string, any>) { this.add(message, 'warning', meta); },
    addError(message: string, meta?: Record<string, any>) { this.add(message, 'error', meta); },
    clear() { this.logs = []; this.unread = 0; },
    markAllRead() { this.unread = 0; },
  }
});