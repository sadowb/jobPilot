import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { ZodError, type z } from 'zod';
import type { Logger } from 'pino';
import { UserFacingError } from './user-facing-error';
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

/**
 * What the renderer may learn about a failure. Details go to the log only.
 * Only UserFacingError (and the validation summary) keeps its text; everything else is generic.
 */
function publicError(error: unknown): Error {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    const where = issue?.path.map(String).join('.');
    return new Error(issue ? `Invalid request: ${where ? `${where}: ` : ''}${issue.message}` : 'Invalid request.');
  }
  if (error instanceof UserFacingError) return error;
  return new Error('Something went wrong. Try again.');
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
          throw publicError(error);
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
