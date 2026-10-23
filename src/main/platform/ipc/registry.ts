import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import type { z } from 'zod';

export interface IpcContext {
  event: IpcMainInvokeEvent;
  /** Window that sent the request; null if it closed meanwhile. */
  window: BrowserWindow | null;
}

export interface IpcHandler {
  channel: string;
  register(isTrustedSender: (event: IpcMainInvokeEvent) => boolean): void;
}

/** channel -> zod input schema -> handler. The renderer sends one payload argument (or none for `z.void()`). */
export function defineHandler<S extends z.ZodType, R>(
  channel: string,
  input: S,
  run: (payload: z.output<S>, ctx: IpcContext) => R | Promise<R>,
): IpcHandler {
  return {
    channel,
    register(isTrustedSender) {
      ipcMain.handle(channel, (event, raw: unknown) => {
        if (!isTrustedSender(event)) throw new Error(`untrusted sender for ${channel}`);
        const parsed = input.safeParse(raw);
        if (!parsed.success) throw new TypeError(`invalid payload for ${channel}: ${parsed.error.message}`);
        return run(parsed.data, { event, window: BrowserWindow.fromWebContents(event.sender) });
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

export function registerIpc(handlers: IpcHandler[], isTrustedSender: (event: IpcMainInvokeEvent) => boolean): void {
  for (const handler of handlers) handler.register(isTrustedSender);
}
