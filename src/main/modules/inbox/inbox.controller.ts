import { z } from 'zod';
import { Channels } from '../../../shared/ipc';
import {
  ChatKeyInputSchema,
  ChatMessageSchema,
  JobChatSchema,
  SendCapChatSchema,
  SendChatResultSchema,
  SendJobChatSchema,
} from '../../../shared/dto';
import { defineHandler } from '../../platform/ipc/registry';
import type { CapChatService } from '../cap/cap.service';
import type { ChatTurns } from './chat-turns';
import type { InboxChatService } from './inbox.service';

const Messages = z.array(ChatMessageSchema);

export function chatHandlers(jobs: InboxChatService, cap: CapChatService, turns: ChatTurns) {
  return [
    defineHandler(Channels.listJobChat, JobChatSchema, ({ applicationId }) =>
      Messages.parse(jobs.messages(applicationId)),
    ),
    defineHandler(Channels.sendJobChat, SendJobChatSchema, ({ applicationId, text }) => {
      const { owner, replyId } = jobs.send(applicationId, text);
      return SendChatResultSchema.parse({ owner, replyId });
    }),
    defineHandler(Channels.listCapChat, z.void(), () => Messages.parse(cap.messages())),
    defineHandler(Channels.sendCapChat, SendCapChatSchema, ({ text }) => {
      const { owner, replyId } = cap.send(text);
      return SendChatResultSchema.parse({ owner, replyId });
    }),
    defineHandler(Channels.cancelChat, ChatKeyInputSchema, ({ chatKey }) => void turns.cancel(chatKey)),
    defineHandler(Channels.warmChat, ChatKeyInputSchema, () => turns.warm()),
  ];
}
