import { app, Menu, type MenuItemConstructorOptions } from 'electron';
import { join } from 'node:path';

// Replaces Electron's default menu and atom icon. The packaged app gets its icon from build/icon.icns.
// Must run after app is ready (app.dock and Menu are only usable then).
export function installAppMenu(): void {
  app.setAboutPanelOptions({ applicationName: 'JobPilot', applicationVersion: app.getVersion() });
  if (process.platform === 'darwin' && !app.isPackaged) app.dock?.setIcon(join(app.getAppPath(), 'build/icon.png'));

  const template: MenuItemConstructorOptions[] = [
    {
      label: 'JobPilot',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    ...(app.isPackaged
      ? []
      : [{ label: 'View', submenu: [{ role: 'reload' as const }, { role: 'toggleDevTools' as const }] }]),
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
