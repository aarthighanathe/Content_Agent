/**
 * Minimal structured logger.
 *
 * WHY: CLAUDE.md forbids console.log in production code. Rather than pull in
 * a new dependency (pino/winston — neither is present in package.json), this
 * wraps console.error/warn/info in a consistent, parseable JSON shape so log
 * lines can be ingested by any log aggregator without extra tooling.
 *
 * NOTE: console.error/console.warn calls elsewhere in the codebase already
 * comply with the "no console.log" rule and are left as-is; new call sites
 * should prefer this module for consistency.
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogMeta {
  [key: string]: unknown;
}

interface LogLine {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function write(level: LogLevel, message: string, meta?: LogMeta): void {
  const line: LogLine = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  // WHY: route by severity to the matching console method so log
  // aggregators that separate stdout/stderr streams still classify
  // correctly (console.error/warn write to stderr, info to stdout).
  if (level === 'error') {
    console.error(JSON.stringify(line));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(line));
  } else {
    console.info(JSON.stringify(line));
  }
}

export const logger = {
  info(message: string, meta?: LogMeta): void {
    write('info', message, meta);
  },
  warn(message: string, meta?: LogMeta): void {
    write('warn', message, meta);
  },
  error(message: string, meta?: LogMeta): void {
    write('error', message, meta);
  },
};
