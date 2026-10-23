import { dialog, type BrowserWindow } from 'electron';
import { writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

/** Asks where to save, then writes the bytes. Returns false when the owner cancels. */
export async function saveCopy(owner: BrowserWindow, name: string, bytes: Uint8Array): Promise<boolean> {
  const result = await dialog.showSaveDialog(owner, { title: 'Save a copy', defaultPath: basename(name) });
  if (result.canceled || !result.filePath) return false;
  await writeFile(result.filePath, bytes);
  return true;
}
