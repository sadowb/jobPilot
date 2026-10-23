import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import type { z } from 'zod';
import type { Logger } from 'pino';
import type { IpcValidationError } from '../../../shared/ipc';

type IpcLogger = Pick<Logger, 'debug' | 'warn' | 'error'>;

export interface IpcContext {
  event: IpcMainInvokeEvent;
  /** Window that sent the request; null if it closed meanwhile. */
  window: BrowserWindow | null;
}

export interface IpcHandler {
  channel: string;
  register(isTrustedSender: (event: IpcMainInvokeEvent) => boolean, logger: IpcLogger): void;
}

/** channel -> zod input schema -> handler. The renderer sends one payload argument (or none for `z.void()`). */
export function defineHandler<S extends z.ZodType, R>(
  channel: string,
  input: S,
  run: (payload: z.output<S>, ctx: IpcContext) => R | Promise<R>,
): IpcHandler {
  return {
    channel,
    register(isTrustedSender, logger) {
      ipcMain.handle(channel, async (event, raw: unknown) => {
        if (!isTrustedSender(event)) {
          logger.warn({ channel }, 'Untrusted IPC sender');
          throw new Error(`untrusted sender for ${channel}`);
        }
        try {
          const parsed = input.safeParse(raw);
          if (!parsed.success) {
            const issue_codes = parsed.error.issues.map((issue) => issue.code);
            logger.debug({ channel, issue_codes });
            return { ipcError: 'INVALID_INPUT', issue_codes } satisfies IpcValidationError;
          }
          return await run(parsed.data, { event, window: BrowserWindow.fromWebContents(event.sender) });
        } catch (error) {
          logger.error({ channel, err: error }, 'IPC handler failed');
          throw error;
        }
      });
    },
  };
}

/** Trusted = the main frame of a window, loaded from the app origin (or the dev server). */
export function originCheck(isTrustedUrl: (url: URL) => boolean) {
  return (event: IpcMainInvokeEvent): boolean => {
    const frame = event.senderFrame;
    if (!frame || frame !== event.sender.mainFrame) return false;
    try {
      return isTrustedUrl(new URL(frame.url));
    } catch {
      return false;
    }
  };
}

export function registerIpc(
  handlers: IpcHandler[],
  isTrustedSender: (event: IpcMainInvokeEvent) => boolean,
  logger: IpcLogger,
): void {
  for (const handler of handlers) handler.register(isTrustedSender, logger);
}
