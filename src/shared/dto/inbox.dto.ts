/** Row shape of `v_inbox`. Keep in sync with the view SQL in drizzle/. */
import type { InboxThreadKind, InboxThreadStatus } from './enums';

export interface InboxItem {
  threadId: string;
  kind: InboxThreadKind;
  status: InboxThreadStatus;
  subject: string;
  lastMessageAt: number;
  messageCount: number;
  lastMessageBody: string | null;
  applicationId: string | null;
  title: string | null;
  companyName: string | null;
}
