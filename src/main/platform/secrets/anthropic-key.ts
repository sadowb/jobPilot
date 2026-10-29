import { safeStorage } from 'electron';
import { z } from 'zod';
import { ClaudeApiKeySchema, type ClaudeKeyStatus, type ClaudeKeyTest } from '../../../shared/dto';
import { UserFacingError } from '../ipc/user-facing-error';

const encryptedSchema = z
  .string()
  .min(4)
  .max(8192)
  .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/);

export class AnthropicKeyStore {
  constructor(
    private readonly storage: {
      anthropicKey(): unknown;
      storeAnthropicKey(encrypted: string): void;
      removeAnthropicKey(): void;
    },
  ) {}

  private async requireEncryption(): Promise<void> {
    if (
      !(await safeStorage.isAsyncEncryptionAvailable()) ||
      (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')
    ) {
      throw new UserFacingError('Secure storage is unavailable.');
    }
  }

  async set(key: string): Promise<void> {
    try {
      const parsed = ClaudeApiKeySchema.parse(key);
      await this.requireEncryption();
      this.storage.storeAnthropicKey((await safeStorage.encryptStringAsync(parsed)).toString('base64'));
    } catch {
      throw new UserFacingError('Could not save the Claude API key.');
    }
  }

  async readApiKey(): Promise<string> {
    try {
      const encrypted = encryptedSchema.parse(this.storage.anthropicKey());
      await this.requireEncryption();
      const { result } = await safeStorage.decryptStringAsync(Buffer.from(encrypted, 'base64'));
      return ClaudeApiKeySchema.parse(result);
    } catch {
      throw new UserFacingError('Claude API key is unavailable.');
    }
  }

  async status(): Promise<ClaudeKeyStatus> {
    try {
      if (this.storage.anthropicKey() === undefined) return { set: false, last4: null };
      return { set: true, last4: (await this.readApiKey()).slice(-4) };
    } catch {
      throw new UserFacingError('Could not read Claude API key status.');
    }
  }

  remove(): void {
    try {
      this.storage.removeAnthropicKey();
    } catch {
      throw new UserFacingError('Could not remove the Claude API key.');
    }
  }

  async test(): Promise<ClaudeKeyTest> {
    try {
      if (this.storage.anthropicKey() === undefined) return 'not_set';
      const response = await fetch('https://api.anthropic.com/v1/models?limit=1', {
        method: 'GET',
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
        headers: {
          'anthropic-version': '2023-06-01',
          'x-api-key': await this.readApiKey(),
        },
      });
      if (!response.ok) {
        await response.body?.cancel();
        return response.status === 401 || response.status === 403 ? 'invalid' : 'unreachable';
      }
      const parsed = z
        .object({ data: z.array(z.object({ type: z.literal('model'), id: z.string() })) })
        .safeParse(await response.json());
      return parsed.success ? 'ok' : 'unreachable';
    } catch {
      return 'unreachable';
    }
  }
}
