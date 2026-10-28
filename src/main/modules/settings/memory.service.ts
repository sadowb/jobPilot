import type { MemoryProvider } from '../../platform/memory/types';

/** Owner actions for the optional memory tool (ADR 0015); the provider owns install, files and processes. */
export class MemorySettingsService {
  constructor(private readonly provider: MemoryProvider) {}

  status() {
    return this.provider.status();
  }

  install() {
    return this.provider.install();
  }

  remove() {
    return this.provider.remove();
  }
}
