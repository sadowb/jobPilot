import { z } from 'zod';
import { Channels } from '../../../shared/ipc';
import { ChatMessageSchema, JobChatSchema, SendCapChatSchema, SendJobChatSchema } from '../../../shared/dto';
import { defineHandler } from '../../platform/ipc/registry';
import type { CapChatService } from '../cap/cap.service';
import type { InboxChatService } from './inbox.service';

const Messages = z.array(ChatMessageSchema);

export function chatHandlers(jobs: InboxChatService, cap: CapChatService) {
  return [
    defineHandler(Channels.listJobChat, JobChatSchema, ({ applicationId }) =>
      Messages.parse(jobs.messages(applicationId)),
    ),
    defineHandler(Channels.sendJobChat, SendJobChatSchema, async ({ applicationId, text }) =>
      Messages.parse(await jobs.send(applicationId, text)),
    ),
    defineHandler(Channels.listCapChat, z.void(), () => Messages.parse(cap.messages())),
    defineHandler(Channels.sendCapChat, SendCapChatSchema, async ({ text }) => Messages.parse(await cap.send(text))),
  ];
}
