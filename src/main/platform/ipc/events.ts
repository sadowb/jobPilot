import { BrowserWindow } from 'electron';
import { Channels, DataChangedSchema, type DataChanged } from '../../../shared/ipc';
import { ChatEventSchema, type ChatEvent } from '../../../shared/dto';

/** Tell every window that cached data changed. Call after the state change has been written, never with row data. */
export function emitDataChanged(change: DataChanged): void {
  const payload = DataChangedSchema.parse(change);
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send(Channels.dataChanged, payload);
}

/** Push one streamed-reply event to every window. Carries the reply text only; validated before it leaves main. */
export function emitChatEvent(event: ChatEvent): void {
  const payload = ChatEventSchema.parse(event);
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send(Channels.chatEvent, payload);
}
