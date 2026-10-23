import { Channels } from '../../../shared/ipc';
import { SaveDocumentInputSchema } from '../../../shared/dto';
import { defineHandler } from '../../platform/ipc/registry';
import { saveCopy } from './documents.service';

export const documentsHandlers = [
  defineHandler(Channels.saveDocument, SaveDocumentInputSchema, ({ name, bytes }, { window }) => {
    if (!window) throw new Error('Document window is unavailable');
    return saveCopy(window, name, bytes);
  }),
];
