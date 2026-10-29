export interface RemoveAllDataSteps {
  /** Logged first, while log handles are still open. */
  log(): void;
  /** Shared quit path: aborts runs, closes owned tabs, kills child processes. */
  stopOwnedWork(): Promise<void>;
  closeDatabase(): void;
  closeLogs(): void;
  deleteUserData(): Promise<void>;
  removeKeychainItem(): Promise<unknown>;
  exit(code: number): void;
}

/**
 * ADR 0016 rule 3. The Keychain item goes only after the data directory is gone: if deletion fails the encrypted
 * database must stay recoverable. The directory is never recreated here; Chromium may still write cache files while
 * the process exits (documented trade-off).
 */
export async function removeAllData(steps: RemoveAllDataSteps): Promise<void> {
  let code = 0;
  try {
    steps.log();
    await steps.stopOwnedWork();
    steps.closeDatabase();
    steps.closeLogs();
    await steps.deleteUserData();
    await steps.removeKeychainItem();
  } catch (error) {
    code = 1;
    // Logs are closed by now; stderr is the only channel left.
    process.stderr.write(`Remove all data failed: ${error instanceof Error ? error.name : 'Unknown'}\n`);
  } finally {
    steps.exit(code);
  }
}
