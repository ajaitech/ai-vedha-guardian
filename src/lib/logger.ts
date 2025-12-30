/**
 * Production-safe logger utility
 *
 * Only logs in development mode (import.meta.env.DEV)
 * In production, all logging is silently suppressed
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },

  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },

  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
  },

  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },

  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },

  // Group logging for organized output
  group: (label: string) => {
    if (isDev) console.group(label);
  },

  groupEnd: () => {
    if (isDev) console.groupEnd();
  },

  // Table for structured data
  table: (data: unknown) => {
    if (isDev) console.table(data);
  }
};

export default logger;
