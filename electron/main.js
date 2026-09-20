/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

const { app, BrowserWindow, clipboard, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs/promises');

// The XDG portal emits a Chromium error-level message when a file dialog is
// cancelled. STGraphX is not sandboxed, so prefer the native GTK/KDE chooser
// on Linux and keep an explicit caller-provided portal requirement intact.
if (process.platform === 'linux' && !process.argv.some((arg) => String(arg).startsWith('--xdg-portal-required-version'))) {
  app.commandLine.appendSwitch('xdg-portal-required-version', '999');
}

function resolveSupportedLang(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) {
    return '';
  }
  const base = value.split('-')[0];
  if (base === 'it' || base === 'en') {
    return base;
  }
  return '';
}

function resolveStartupLang() {
  const cliArg = process.argv.find((arg) => /^--lang=/i.test(String(arg)));
  if (cliArg) {
    return resolveSupportedLang(cliArg.split('=').slice(1).join('='));
  }
  return resolveSupportedLang(app.getLocale());
}

function createWindow() {
  const win = new BrowserWindow({
    title: 'STGraphX',
    icon: path.join(__dirname, '..', 'icon.png'),
    show: false,
    width: 1600,
    height: 980,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const startupLang = resolveStartupLang();
  win.loadFile(path.join(__dirname, '..', 'index.html'), startupLang ? { query: { lang: startupLang } } : undefined);
  win.webContents.on('before-input-event', (event, input) => {
    const isCloseShortcut = input.type === 'keyDown'
      && !input.shift
      && (input.control || input.meta)
      && String(input.key || '').toLowerCase() === 'w';
    if (!isCloseShortcut) {
      return;
    }
    // Chromium handles Ctrl/Cmd+W before the renderer's key listener. Route
    // it to the active model so the unsaved-changes confirmation is preserved.
    event.preventDefault();
    void win.webContents.executeJavaScript(
      'window.__stgraphxCloseActiveModel ? window.__stgraphxCloseActiveModel() : false',
      true,
    ).catch(() => {});
  });
  win.once('ready-to-show', () => {
    win.show();
  });

  let allowClose = false;
  win.on('close', async (event) => {
    if (allowClose) {
      return;
    }
    event.preventDefault();
    let closeData = { hasUnsaved: false };
    try {
      closeData = await win.webContents.executeJavaScript(
        'window.__stgraphxGetClosePromptData ? window.__stgraphxGetClosePromptData() : ({ hasUnsaved: false })',
        true,
      );
    } catch (_err) {
      closeData = { hasUnsaved: false };
    }
    if (!closeData?.hasUnsaved) {
      allowClose = true;
      win.close();
      return;
    }
    const choice = await dialog.showMessageBox(win, {
      type: 'question',
      buttons: Array.isArray(closeData.buttons) && closeData.buttons.length >= 3
        ? closeData.buttons.slice(0, 3)
        : ['Save', 'Discard', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
      message: closeData.message || 'There are unsaved changes. Save before closing?',
      detail: closeData.detail || '',
    });
    if (choice.response === 0) {
      let saved = false;
      try {
        saved = await win.webContents.executeJavaScript(
          'window.__stgraphxSaveBeforeClose ? window.__stgraphxSaveBeforeClose() : false',
          true,
        );
      } catch (_err) {
        saved = false;
      }
      if (!saved) {
        return;
      }
      allowClose = true;
      win.close();
      return;
    }
    if (choice.response === 1) {
      allowClose = true;
      win.close();
    }
  });
}

app.whenReady().then(() => {
  app.setName('STGraphX');
  ipcMain.handle('stgraphx:read-clipboard-text', () => clipboard.readText());
  ipcMain.handle('stgraphx:write-clipboard-text', (_event, text) => {
    clipboard.writeText(String(text ?? ''));
    return true;
  });
  ipcMain.handle('stgraphx:show-confirm-dialog', async (event, options = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const buttons = Array.isArray(options.buttons) && options.buttons.length > 0
      ? options.buttons.slice(0, 3).map((label) => String(label || ''))
      : ['Yes', 'No'];
    const defaultId = Number.isInteger(options.defaultId) && options.defaultId >= 0 && options.defaultId < buttons.length
      ? options.defaultId
      : 0;
    const cancelId = Number.isInteger(options.cancelId) && options.cancelId >= 0 && options.cancelId < buttons.length
      ? options.cancelId
      : buttons.length - 1;
    const result = await dialog.showMessageBox(win, {
      type: 'question',
      title: String(options.title || 'STGraphX'),
      message: String(options.message || ''),
      buttons,
      defaultId,
      cancelId,
      noLink: true,
    });
    return { response: result.response };
  });
  ipcMain.handle('stgraphx:show-open-dialog', async (event, options = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return dialog.showOpenDialog(win, {
      title: options.title || 'Open JSON',
      properties: options.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
  });

  ipcMain.handle('stgraphx:read-text-file', async (_event, filePath) => {
    try {
      return { ok: true, text: await fs.readFile(String(filePath || ''), 'utf8') };
    } catch (err) {
      // IPC handlers must resolve expected filesystem failures. Throwing here
      // makes Electron report a handled missing recent file as a main-process
      // error in the terminal.
      return {
        ok: false,
        code: String(err?.code || 'READ_ERROR'),
        message: String(err?.message || 'Unable to read file'),
      };
    }
  });

  ipcMain.handle('stgraphx:write-text-file', async (_event, filePath, text) => {
    await fs.writeFile(String(filePath || ''), String(text ?? ''), 'utf8');
    return true;
  });

  ipcMain.handle('stgraphx:show-save-dialog', async (event, options = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return dialog.showSaveDialog(win, {
      title: options.title || 'Save JSON',
      defaultPath: options.suggestedName || 'model.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
  });

  ipcMain.handle('stgraphx:show-directory-dialog', async (event, options = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win, {
      title: options.title || 'Select model folder',
      properties: ['openDirectory'],
    });
    return {
      canceled: result.canceled,
      directoryPath: result.filePaths && result.filePaths[0] ? result.filePaths[0] : '',
    };
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
