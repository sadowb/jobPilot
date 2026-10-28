type LogFn = (fields: object | string, message?: string) => void;

/** The (fields, message) call shape every module logs with; implemented by LogService. */
export interface Logger {
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  fatal: LogFn;
}
