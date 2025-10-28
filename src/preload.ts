// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { ipcRenderer, webUtils } from 'electron';

// Expose ipcRenderer to renderer process
// Note: contextIsolation is false, so this is available directly on window
(window as any).ipcRenderer = ipcRenderer;

// Expose webUtils for getting file paths from drag-and-drop File objects
(window as any).webUtils = webUtils;
