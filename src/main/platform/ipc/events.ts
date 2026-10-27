import { BrowserWindow } from 'electron';
import { Channels, DataChangedSchema, type DataChanged } from '../../../shared/ipc';

/** Tell every window that cached data changed. Call after the state change has been written, never with row data. */
export function emitDataChanged(change: DataChanged): void {
  const payload = DataChangedSchema.parse(change);
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send(Channels.dataChanged, payload);
}
