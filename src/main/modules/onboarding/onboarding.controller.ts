import { dialog } from 'electron';
import { z } from 'zod';
import { Channels } from '../../../shared/ipc';
import {
  AllowConnectionsResultSchema,
  AllowConnectionsSchema,
  CapTurnInputSchema,
  CapTurnSchema,
  CvExtractionSchema,
  ExtractCvSchema,
  PreflightSchema,
} from '../../../shared/dto';
import { defineHandler } from '../../platform/ipc/registry';
import type { CapTurnService } from './cap-turn.service';
import type { CvService } from './cv.service';
import type { PreflightService } from './preflight.service';

export function onboardingHandlers(preflight: PreflightService, cv: CvService, cap: CapTurnService) {
  return [
    defineHandler(Channels.preflight, z.void(), async () => PreflightSchema.parse(await preflight.detect())),
    defineHandler(Channels.chooseCustomAgent, z.void(), async (_input, { window }) => {
      const options = { title: 'Choose the agent program', properties: ['openFile' as const] };
      const picked = await (window ? dialog.showOpenDialog(window, options) : dialog.showOpenDialog(options));
      return PreflightSchema.parse(
        picked.canceled || !picked.filePaths[0]
          ? await preflight.detect()
          : await preflight.chooseCustom(picked.filePaths[0]),
      );
    }),
    defineHandler(Channels.allowConnections, AllowConnectionsSchema, async (input) =>
      AllowConnectionsResultSchema.parse(await preflight.allow(input)),
    ),
    defineHandler(Channels.extractCv, ExtractCvSchema, async ({ bytes }) =>
      CvExtractionSchema.parse(await cv.extract(bytes)),
    ),
    defineHandler(Channels.capTurn, CapTurnInputSchema, async (input) => CapTurnSchema.parse(await cap.turn(input))),
  ];
}
