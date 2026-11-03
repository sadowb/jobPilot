import { z } from 'zod';
import { Channels } from '../../../shared/ipc';
import { GrantListSchema, GrantSchema, RevokeGrantSchema } from '../../../shared/dto';
import { defineHandler } from '../../platform/ipc/registry';
import type { GrantsService } from './grants.service';

export function grantsHandlers(service: GrantsService) {
  return [
    defineHandler(Channels.listGrants, z.void(), () => GrantListSchema.parse(service.list())),
    defineHandler(Channels.revokeGrant, RevokeGrantSchema, ({ id }) => GrantSchema.parse(service.revoke(id))),
  ];
}
