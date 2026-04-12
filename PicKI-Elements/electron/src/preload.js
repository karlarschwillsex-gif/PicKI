// ============================================================
//  PicKI-Elements – Preload (IPC Bridge)
// ============================================================
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Fenster
  minimize:       ()        => ipcRenderer.invoke('win-minimize'),
  maximize:       ()        => ipcRenderer.invoke('win-maximize'),
  close:          ()        => ipcRenderer.invoke('win-close'),

  // Navigation
  navigate:       (step)    => ipcRenderer.invoke('navigate', step),

  // NSFW
  setNsfwMode:    (on)      => ipcRenderer.invoke('set-nsfw-mode', on),
  onNsfwMode:     (cb)      => ipcRenderer.on('nsfw-mode-changed', (_, on) => cb(on)),

  // System
  getSystemStats: ()        => ipcRenderer.invoke('get-system-stats'),

  // Bilder
  selectImage:    ()        => ipcRenderer.invoke('select-image'),
  openOutputFolder: ()      => ipcRenderer.invoke('open-output-folder'),

  // Generierung
  generateImage:  (settings) => ipcRenderer.invoke('generate-image', settings),

  // Projekte
  getProjects:    ()        => ipcRenderer.invoke('get-projects'),
  saveProject:    (project) => ipcRenderer.invoke('save-project', project),
  loadProject:    (id)      => ipcRenderer.invoke('load-project', id),
});
