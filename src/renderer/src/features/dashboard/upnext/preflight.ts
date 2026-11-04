import { useAgent } from '../../../lib/api';

export interface PreflightStatus {
  canStart: boolean;
  reason?: string;
}

/**
 * Consumes browser status; lane #196 is adding browser status.
 * Keep as a single small hook to adapt when browser IPC lands.
 */
export function useBrowserStatus(): { reachable: boolean; reason?: string } {
  return { reachable: true };
}

/**
 * Evaluates preflight status from agent state and browser reachability.
 */
export function evaluatePreflight(
  agent: { confirmed: boolean; status: string } | undefined,
  browser: { reachable: boolean; reason?: string },
): PreflightStatus {
  if (agent && (!agent.confirmed || agent.status !== 'ready')) {
    const reason = !agent.confirmed
      ? 'Claude is not confirmed. Open Settings → Agent.'
      : agent.status === 'tool_not_installed'
        ? 'Claude is not installed. Open Settings → Agent.'
        : agent.status === 'not_logged_in'
          ? 'Claude is not signed in. Open Settings → Agent.'
          : agent.status === 'api_key_required'
            ? 'Claude API key is required. Open Settings → Agent.'
            : 'Claude is not ready. Open Settings → Agent.';
    return { canStart: false, reason };
  }

  if (!browser.reachable) {
    return { canStart: false, reason: browser.reason ?? 'Browser is unreachable.' };
  }

  return { canStart: true };
}

/**
 * Preflight check before starting a run: ensures Claude is confirmed and browser is reachable.
 */
export function useRunPreflight(): PreflightStatus {
  const { data: agent } = useAgent();
  const browser = useBrowserStatus();
  return evaluatePreflight(agent, browser);
}
