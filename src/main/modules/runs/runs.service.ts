import { join } from 'node:path';
import { z } from 'zod';
import type { JobPilotDb } from '../../platform/db/database';
import { type RunStatus, RunSummarySchema } from '../../../shared/dto';
import { RunEventSchema, RunResultSchema, type AgentProvider, type RunResult } from '../../platform/agents/types';
import type { BrowserProvider } from '../../platform/browsers/types';
import { ApplyWorker } from '../../platform/queue/apply';
import { ApplicationsService } from '../applications/applications.service';
import { AuditService, RunTraceService } from '../observability/observability.service';
import { loggerFor } from '../observability/log.service';
import { applyConcurrency } from '../settings/settings.service';
import { RunsRepository } from './runs.repository';

export class RunsService {
  private readonly repository: RunsRepository;
  private readonly worker: ApplyWorker;

  constructor(
    private readonly db: JobPilotDb,
    userData: string,
    private readonly agent?: AgentProvider,
    private readonly browser?: BrowserProvider,
  ) {
    this.repository = new RunsRepository(db);
    this.worker = new ApplyWorker(
      join(userData, 'apply-queue.db'),
      applyConcurrency(db),
      (id, signal) => this.execute(id, signal),
      async (id) => this.browser?.closeTab(id),
      () => loggerFor('runs').error('Apply queue worker failed'),
    );
  }

  async initialize(): Promise<void> {
    for (const row of this.repository.list()) {
      if (row.status === 'running') this.transition(row.id, 'failed', { error: 'app restarted' });
      if (row.status === 'queued') await this.worker.enqueue(row.id);
    }
    this.resume();
  }

  list() {
    return this.repository.list().map((row) => RunSummarySchema.parse(row));
  }

  async start(applicationId: string) {
    const existing = this.repository.active(applicationId);
    if (existing) {
      await this.worker.enqueue(existing.id);
      return RunSummarySchema.parse(existing);
    }
    if (!this.agent || !this.browser) throw new Error('No application provider is configured.');
    const application = new ApplicationsService(this.db).list().find((row) => row.id === applicationId);
    if (!application) throw new Error('Application is unavailable.');
    const agent = this.agent.id;
    const browser = this.browser.id;
    const row = this.db.transaction(() => {
      const created = this.repository.create({ applicationId, agent, browser });
      if (created) {
        AuditService.record({
          applicationId,
          runId: created.id,
          type: 'run_transition',
          actor: 'owner',
          fromStatus: null,
          toStatus: 'queued',
        });
      }
      const result = created ?? this.repository.active(applicationId);
      if (!result) throw new Error('Run could not be queued.');
      return result;
    });
    try {
      await this.worker.enqueue(row.id);
    } catch (error) {
      this.transition(row.id, 'failed', { error: 'Queue unavailable' });
      throw error;
    }
    return RunSummarySchema.parse(row);
  }

  async cancel(runId: string) {
    const row = this.repository.get(runId);
    if (row.status === 'queued' || row.status === 'running') this.transition(runId, 'cancelled');
    await this.worker.cancel(runId);
    return RunSummarySchema.parse(this.repository.get(runId));
  }

  pause() {
    return this.worker.pause();
  }
  resume() {
    return this.worker.resume();
  }
  stop() {
    return this.worker.stop();
  }

  private transition(runId: string, status: RunStatus, details: { error?: string; result?: RunResult } = {}) {
    return this.db.transaction(() => {
      const row = this.repository.get(runId);
      const allowed =
        row.status === 'queued'
          ? ['running', 'cancelled', 'failed']
          : row.status === 'running'
            ? ['awaiting_approval', 'needs_you', 'failed', 'cancelled']
            : [];
      if (!allowed.includes(status)) throw new Error(`Invalid run transition: ${row.status} -> ${status}`);
      const updated = this.repository.update(runId, {
        status,
        ...details,
        ...(details.result ? { formHash: details.result.form_hash } : {}),
        ...(status === 'running' ? { startedAt: Date.now() } : { finishedAt: Date.now() }),
      });
      AuditService.record({
        applicationId: row.applicationId,
        runId,
        type: 'run_transition',
        actor: 'system',
        fromStatus: row.status,
        toStatus: status,
        payload: details.error ? { reason: details.error } : {},
      });
      loggerFor('runs').info(
        { run_id: runId, application_id: row.applicationId, agent: row.agent, status },
        'Run transitioned',
      );
      return updated;
    });
  }

  private async execute(runId: string, signal: AbortSignal): Promise<void> {
    if (this.repository.get(runId).status !== 'queued') return;
    try {
      if (!this.agent || !this.browser) throw new Error('No application provider is configured.');
      const row = this.transition(runId, 'running');
      const application = new ApplicationsService(this.db).list().find((item) => item.id === row.applicationId);
      if (!application) throw new Error('Application is unavailable.');
      const tab = await this.browser.openTab(runId, application.url);
      signal.throwIfAborted();
      this.repository.update(runId, { tabId: tab.tabId });
      const mcpServer = await this.browser.mcpServerConfig();
      signal.throwIfAborted();
      const agentRun = this.agent.run({
        runId,
        prompt: 'Fill the application for owner review. Never submit.',
        mcpServers: { browser: mcpServer },
        outputSchema: RunResultSchema,
        signal,
        timeoutMs: 110_000,
      });
      // Attach the result handler immediately: providers may reject while events are still streaming.
      const [raw] = await Promise.all([
        agentRun.result,
        (async () => {
          for await (const rawEvent of agentRun.events) {
            const event = RunEventSchema.parse(rawEvent);
            RunTraceService.append({ runId, type: event.type, payload: z.json().parse(event) });
          }
        })(),
      ]);
      const result = RunResultSchema.parse(raw);
      if (this.repository.get(runId).status !== 'running') return;
      signal.throwIfAborted();
      // The run contract uses needs_you for both answer and intervention requests (architecture.md).
      const status =
        result.status === 'filled'
          ? 'awaiting_approval'
          : result.status === 'needs_answers' || result.status === 'blocked'
            ? 'needs_you'
            : 'failed';
      this.transition(runId, status, {
        result,
        ...(result.status === 'submitted' ? { error: 'Submission is not authorized' } : {}),
      });
    } catch {
      const current = this.repository.get(runId);
      if (current.status === 'running' || current.status === 'queued') {
        this.transition(runId, 'failed', {
          error: signal.aborted ? 'Run aborted' : 'Provider failed or returned an invalid result',
        });
      }
    } finally {
      if (this.repository.get(runId).status !== 'awaiting_approval') await this.browser?.closeTab(runId);
    }
  }
}
