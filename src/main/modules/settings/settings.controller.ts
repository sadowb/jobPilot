import { z } from 'zod';
import { Channels } from '../../../shared/ipc';
import { ThemeSourceSchema } from '../../../shared/dto';
import { defineHandler } from '../../platform/ipc/registry';
import { setTheme, themeState } from './settings.service';

export const settingsHandlers = [
  defineHandler(Channels.getTheme, z.void(), () => themeState()),
  defineHandler(Channels.setTheme, ThemeSourceSchema, (source) => setTheme(source)),
];
