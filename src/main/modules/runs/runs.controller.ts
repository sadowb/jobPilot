import { z } from 'zod';
import { Channels } from '../../../shared/ipc';
import { CancelRunSchema, RunsStateSchema, RunSummarySchema, StartRunSchema } from '../../../shared/dto';
import { defineHandler } from '../../platform/ipc/registry';
import type { RunsService } from './runs.service';

export function runsHandlers(service: RunsService) {
  return [
    defineHandler(Channels.startRun, StartRunSchema, async ({ applicationId }) =>
      RunSummarySchema.parse(await service.start(applicationId)),
    ),
    defineHandler(Channels.cancelRun, CancelRunSchema, async ({ runId }) =>
      RunSummarySchema.parse(await service.cancel(runId)),
    ),
    defineHandler(Channels.pauseRuns, z.void(), () => z.boolean().parse(service.pause())),
    defineHandler(Channels.resumeRuns, z.void(), () => z.boolean().parse(service.resume())),
    defineHandler(Channels.getRunsState, z.void(), () => RunsStateSchema.parse(service.state())),
    defineHandler(Channels.listRuns, z.void(), () => z.array(RunSummarySchema).parse(service.list())),
  ];
}
