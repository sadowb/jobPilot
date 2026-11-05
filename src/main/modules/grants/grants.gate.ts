import type { z } from 'zod';
import type { AgentProvider, AgentRun, RunResultSchema, RunSpec } from '../../platform/agents/types';
import type { BrowserProvider } from '../../platform/browsers/types';
import type { GrantsService } from './grants.service';

/**
 * Puts the consent check in front of the real providers. `RunsService` and `PostingReader` receive the wrapped pair, so
 * a run, a posting read or the CV reader cannot start without both grants, and neither knows consent exists.
 * `agent.prepare()` is where callers ask "can I start?", so it checks the browser grant too.
 */
export function gateProviders(
  grants: GrantsService,
  agent: AgentProvider,
  browser: BrowserProvider,
): { agent: AgentProvider; browser: BrowserProvider } {
  const gatedBrowser: BrowserProvider = {
    get id() {
      return browser.id;
    },
    async mcpServerConfig(runId, signal, submit, upload) {
      await grants.assert('browser', browser.id);
      return browser.mcpServerConfig(runId, signal, submit, upload);
    },
    async openTab(runId, url) {
      await grants.assert('browser', browser.id);
      return browser.openTab(runId, url);
    },
    // Closing and reading an already-open tab stay possible after a revoke, so a run can always clean up.
    closeTab: (runId) => browser.closeTab(runId),
    formSnapshot: (runId) => browser.formSnapshot(runId),
    // Tab control only ever pauses or releases the agent, so a revoked grant never blocks it.
    holdTab: (runId) => browser.holdTab?.(runId) ?? false,
    releaseTab: (runId) => browser.releaseTab?.(runId),
    isHeld: (runId) => browser.isHeld?.(runId) ?? false,
    tabLocation: async (runId) => browser.tabLocation?.(runId) ?? null,
  };
  const gatedAgent: AgentProvider = {
    get id() {
      return agent.id;
    },
    async prepare() {
      await grants.assert('agent', agent.id);
      await grants.assert('browser', browser.id);
      await agent.prepare?.();
    },
    warm() {
      void grants
        .assert('agent', agent.id)
        .then(() => agent.warm?.())
        .catch(() => undefined);
    },
    run<S extends z.ZodType = typeof RunResultSchema>(spec: RunSpec<S>): AgentRun<z.infer<S>> {
      const started = grants.assert('agent', agent.id).then(() => agent.run(spec));
      const result = started.then((run) => run.result);
      void result.catch(() => undefined);
      async function* events() {
        yield* (await started).events;
      }
      return { events: events(), result };
    },
  };
  return { agent: gatedAgent, browser: gatedBrowser };
}
