import { Channels, RendererErrorInputSchema } from '../../../shared/ipc';
import { defineHandler } from '../../platform/ipc/registry';
import { loggerFor } from './log.service';

export const observabilityHandlers = [
  defineHandler(Channels.rendererError, RendererErrorInputSchema, ({ kind, message, stack }) => {
    loggerFor('renderer').error({ kind, message, stack }, 'Renderer error');
  }),
];
