import { z } from 'zod';
import { Channels } from '../../../shared/ipc';
import { CreateApplicationSchema, SetApplicationStatusSchema } from '../../../shared/dto';
import { db } from '../../platform/db/database';
import { defineHandler } from '../../platform/ipc/registry';
import { ApplicationsService } from './applications.service';

export const applicationsHandlers = [
  defineHandler(Channels.listApplications, z.void(), () => new ApplicationsService(db).list()),
  defineHandler(Channels.createApplication, CreateApplicationSchema, ({ postingId }) =>
    new ApplicationsService(db).create(postingId),
  ),
  defineHandler(Channels.setApplicationStatus, SetApplicationStatusSchema, ({ id, status }) =>
    new ApplicationsService(db).setStatus(id, status),
  ),
];
