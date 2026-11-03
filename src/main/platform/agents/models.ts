import { query } from '@anthropic-ai/claude-agent-sdk';

export interface AgentModel {
  value: string;
  label: string;
}

const LIST_TIMEOUT_MS = 15_000;
const cache = new Map<string, AgentModel[]>();

/**
 * Asks the installed Claude Code which models it offers (the SDK's `initialize` reply: no API call, no tokens), so no
 * model name is hard-coded here. Opus is left out on purpose: onboarding and runs stay on the cheap tier, and an owner who
 * wants Opus picks it in Settings. `cwd`/`env` are the same private, scrubbed values a run gets.
 */
export async function listClaudeModels(options: {
  executablePath: string;
  version: string | null;
  cwd: string;
  env: Record<string, string>;
}): Promise<AgentModel[]> {
  const key = `${options.executablePath}:${options.version ?? ''}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const controller = new AbortController();
  let release!: () => void;
  const hold = new Promise<void>((resolve) => (release = resolve));
  // A streaming prompt that sends nothing keeps the process in control mode without starting a turn.
  const silent: AsyncIterable<never> = {
    [Symbol.asyncIterator]: () => ({ next: () => hold.then(() => ({ done: true as const, value: undefined })) }),
  };
  const stream = query({
    prompt: silent,
    options: {
      pathToClaudeCodeExecutable: options.executablePath,
      cwd: options.cwd,
      env: options.env,
      abortController: controller,
      persistSession: false,
      settingSources: [],
      strictMcpConfig: true,
      mcpServers: {},
      tools: [],
    },
  });
  const timer = setTimeout(() => controller.abort(), LIST_TIMEOUT_MS);
  try {
    const models = (await stream.supportedModels())
      .filter((model) => !/opus/i.test(`${model.value} ${model.displayName} ${model.resolvedModel ?? ''}`))
      .map((model) => ({ value: model.value.slice(0, 128), label: model.displayName.slice(0, 128) }));
    cache.set(key, models);
    return models;
  } finally {
    clearTimeout(timer);
    release();
    controller.abort();
    stream.close();
  }
}
