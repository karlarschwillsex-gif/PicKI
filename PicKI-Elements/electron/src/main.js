// ============================================================
//  PicKI-Elements – Main Process (Electron)
// ============================================================
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { spawn, exec } = require('child_process');
const os = require('os');

// ── Pfade ──
const BASE_DIR   = '/media/fynn/Intel-1TB-Intern/.PicKI-Elements';
const OUTPUT_DIR = path.join(BASE_DIR, 'backend/ComfyUI/output');
const SCRIPTS_DIR = path.join(BASE_DIR, 'scripts');
const PROJECTS_DIR = path.join(BASE_DIR, 'projects');
const VENV_PYTHON = path.join(BASE_DIR, 'backend/venv/bin/python3');
const COMFY_URL  = 'http://127.0.0.1:8188';

// Ordner erstellen falls nicht vorhanden
[OUTPUT_DIR, PROJECTS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── Fenster ──
let mainWindow = null;
let nsfwMode = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 400,
    minHeight: 600,
    frame: true,
    backgroundColor: '#06080f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../app/assets/logo.png'),
  });

  mainWindow.loadFile(path.join(__dirname, '../app/index.html'));
  mainWindow.webContents.openDevTools();

  // Kein Menü
  Menu.setApplicationMenu(null);

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!mainWindow) createWindow(); });

// ── IPC: Fenster Controls ──
ipcMain.handle('win-minimize',  () => mainWindow?.minimize());
ipcMain.handle('win-maximize',  () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
ipcMain.handle('win-close',     () => mainWindow?.close());

// ── IPC: NSFW Mode ──
ipcMain.handle('set-nsfw-mode', async (_, on) => {
  nsfwMode = on;
  if (mainWindow) mainWindow.webContents.send('nsfw-mode-changed', on);
  return true;
});

// ── IPC: Navigation zwischen Schritten ──
ipcMain.handle('navigate', async (_, step) => {
  const pages = {
    'step0': '../app/step0.html',
    'step1': '../app/index.html',  // TODO: step1.html noch nicht gebaut
    'step2': '../app/index.html',
    'step3': '../app/index.html',
    'step4': '../app/index.html',
    'step5': '../app/index.html',
    'step6': '../app/index.html',
    'home':  '../app/index.html',
    'load':  '../app/index.html',
  };
  const page = pages[step];
  if (page && mainWindow) {
    mainWindow.loadFile(path.join(__dirname, page));
  }
  return true;
});

// ── IPC: System Stats ──
ipcMain.handle('get-system-stats', async () => {
  const totalMem = os.totalmem() / 1024 / 1024 / 1024;
  const freeMem  = os.freemem()  / 1024 / 1024 / 1024;
  const usedMem  = totalMem - freeMem;

  let cpuPercent = 0;
  try {
    const cpuResult = await new Promise((resolve) => {
      exec("top -bn1 | grep 'Cpu(s)' | awk '{print $2}'", (_, stdout) => resolve(stdout.trim()));
    });
    cpuPercent = parseFloat(cpuResult) || 0;
  } catch(e) {}

  let swapUsed = 0;
  try {
    const swapResult = await new Promise((resolve) => {
      exec("free -g | grep Swap | awk '{print $3}'", (_, stdout) => resolve(stdout.trim()));
    });
    swapUsed = parseFloat(swapResult) || 0;
  } catch(e) {}

  return {
    cpu: Math.round(cpuPercent),
    ram_used: parseFloat(usedMem.toFixed(1)),
    ram_total: parseFloat(totalMem.toFixed(1)),
    swap_used: swapUsed,
  };
});

// ── IPC: Bild auswählen ──
ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Bilder', extensions: ['png','jpg','jpeg','webp'] }],
  });
  if (result.canceled || !result.filePaths.length) return null;
  const filePath = result.filePaths[0];
  const data = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  return {
    path: filePath,
    base64: `data:image/${mime};base64,${data.toString('base64')}`,
  };
});

// ── IPC: Output Ordner öffnen ──
ipcMain.handle('open-output-folder', () => shell.openPath(OUTPUT_DIR));

// ── IPC: Projekte laden ──
ipcMain.handle('get-projects', async () => {
  try {
    const files = fs.readdirSync(PROJECTS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const data = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, f), 'utf8'));
        return {
          id: f.replace('.json', ''),
          name: data.name || f,
          date: data.date || '',
          thumb: data.thumb || '🎨',
          step: data.currentStep || 0,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 12);
    return files;
  } catch(e) { return []; }
});

// ── IPC: Projekt speichern ──
ipcMain.handle('save-project', async (_, project) => {
  try {
    const id = project.id || `project_${Date.now()}`;
    const filePath = path.join(PROJECTS_DIR, `${id}.json`);
    project.date = new Date().toISOString();
    project.id = id;
    fs.writeFileSync(filePath, JSON.stringify(project, null, 2));
    return { success: true, id };
  } catch(e) {
    return { success: false, error: e.message };
  }
});

// ── IPC: Projekt laden ──
ipcMain.handle('load-project', async (_, id) => {
  try {
    const filePath = path.join(PROJECTS_DIR, `${id}.json`);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch(e) { return null; }
});

// ── IPC: Bild generieren ──
ipcMain.handle('generate-image', async (_, settings) => {
  try {
    const mode        = settings.mode || 't2i';
    const steps       = settings.steps || 30;
    const cfg         = settings.cfgScale || 7;
    const denoising   = settings.denoising || 0.65;
    const strength    = settings.strength || 0.85;
    const width       = settings.width || 512;
    const height      = settings.height || 768;
    const model       = settings.model || 'ponyDiffusionV6XL_v6StartWithThisOne.safetensors';
    const timestamp   = Date.now();
    const outputPrefix = `picki_${timestamp}`;

    // Prompt boosten
    function boostPrompt(prompt) {
      if (!prompt) return '';
      const clothingKW = ['wearing','shirt','dress','skirt','top','blouse','jacket','jeans','shorts','leggings','stockings','heels','shoes','uniform','costume','outfit','kimono','suit','hoodie','corset','lingerie','bikini','bra','panties','bodysuit'];
      const colorKW = ['hair','nipple','areola','eyes','skin','blonde','brunette','auburn','strawberry','copper','burgundy','pink','brown','blue','green','grey','amber','red','pale','fair','tan','dark','light'];
      return prompt.split(',').map(p => {
        const l = p.trim().toLowerCase();
        if (clothingKW.some(k => l.includes(k))) return `(${p.trim()}:1.7)`;
        if (colorKW.some(k => l.includes(k))) return `(${p.trim()}:1.5)`;
        return p.trim();
      }).join(', ');
    }

    // Quality tags für Pony
    const isPony = model.includes('pony') || model.includes('Pony');
    const qualityPos = isPony
      ? 'score_9, score_8_up, score_7_up, (photo-realistic:1.4), ultra realistic 8k photograph, RAW photo, DSLR, sharp focus, natural lighting, natural smile, realistic eyes, beautiful face'
      : '(photo-realistic:1.4), ultra realistic 8k photograph, RAW photo, DSLR, sharp focus, natural lighting';

    const qualityNeg = [
      ...(isPony ? ['score_1','score_2','score_3','score_4'] : []),
      'anime','cartoon','drawing','illustration','painting','sketch',
      'bad anatomy','deformed','blurry','low quality','watermark',
      'bad hands','bad feet','extra fingers','missing fingers','fused fingers',
      'poorly drawn hands','poorly drawn feet','mutated hands','ugly feet',
      'uncanny valley','creepy smile','joker smile','oversized eyes','alien eyes',
    ];

    // Positiver Prompt
    const userPrompt = boostPrompt(settings.prompt || '');
    const positivePrompt = qualityPos + (userPrompt ? ', ' + userPrompt : '');

    // Negativer Prompt
    const baseNeg = [...qualityNeg];
    if (!settings.nsfwMode) {
      baseNeg.push('nudity','naked','nude','topless','bottomless','exposed breasts','nipples visible','exposed genitals','nsfw','clothing removed','undressed');
    }
    if (settings.negPrompt) baseNeg.push(...settings.negPrompt.split(',').map(s => s.trim()));
    const negativePrompt = baseNeg.join(', ');

    // Workflow
    let workflow = {};

    if (mode === 't2i') {
      workflow = {
        "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: model } },
        "2": { class_type: "CLIPTextEncode", inputs: { text: positivePrompt, clip: ["1", 1] } },
        "3": { class_type: "CLIPTextEncode", inputs: { text: negativePrompt, clip: ["1", 1] } },
        "4": { class_type: "EmptyLatentImage", inputs: { width, height, batch_size: 1 } },
        "5": { class_type: "KSampler", inputs: {
          model: ["1", 0], positive: ["2", 0], negative: ["3", 0],
          latent_image: ["4", 0],
          seed: Math.floor(Math.random() * 999999999),
          steps, cfg, sampler_name: "dpmpp_2m", scheduler: "karras", denoise: 1.0
        }},
        "6": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["1", 2] } },
        "7": { class_type: "SaveImage", inputs: { images: ["6", 0], filename_prefix: outputPrefix } },
      };
    } else if (mode === 'i2i') {
      // Bild hochladen
      const imgForm = new FormData();
      imgForm.append('image', fs.createReadStream(settings.imagePath), path.basename(settings.imagePath));
      const imgUp = await axios.post(`${COMFY_URL}/upload/image`, imgForm, { headers: imgForm.getHeaders(), timeout: 30000 });

      workflow = {
        "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: model } },
        "2": { class_type: "CLIPTextEncode", inputs: { text: positivePrompt, clip: ["1", 1] } },
        "3": { class_type: "CLIPTextEncode", inputs: { text: negativePrompt, clip: ["1", 1] } },
        "4": { class_type: "LoadImage", inputs: { image: imgUp.data.name } },
        "5": { class_type: "CannyEdgePreprocessor", inputs: { image: ["4", 0], low_threshold: 100, high_threshold: 200, resolution: 512 } },
        "6": { class_type: "ControlNetLoader", inputs: { control_net_name: "control_v11p_sd15_canny.safetensors" } },
        "7": { class_type: "ControlNetApply", inputs: { conditioning: ["2", 0], control_net: ["6", 0], image: ["5", 0], strength } },
        "8": { class_type: "VAEEncode", inputs: { pixels: ["4", 0], vae: ["1", 2] } },
        "9": { class_type: "KSampler", inputs: {
          model: ["1", 0], positive: ["7", 0], negative: ["3", 0],
          latent_image: ["8", 0],
          seed: Math.floor(Math.random() * 999999999),
          steps, cfg, sampler_name: "dpmpp_2m", scheduler: "karras", denoise: denoising
        }},
        "10": { class_type: "VAEDecode", inputs: { samples: ["9", 0], vae: ["1", 2] } },
        "11": { class_type: "SaveImage", inputs: { images: ["10", 0], filename_prefix: outputPrefix } },
      };
    }

    // Job senden
    const queueResp = await axios.post(`${COMFY_URL}/prompt`, { prompt: workflow }, { timeout: 15000 });
    const promptId = queueResp.data.prompt_id;

    // Auf Ergebnis warten
    const imgInfo = await waitForJob(promptId);
    if (!imgInfo) throw new Error('Generierung fehlgeschlagen');

    // Bild lesen
    const comfyFile = path.join(OUTPUT_DIR, imgInfo.subfolder || '', imgInfo.filename);
    const outName   = `picki_${timestamp}.png`;
    const outPath   = path.join(OUTPUT_DIR, outName);
    fs.copyFileSync(comfyFile, outPath);

    // Wasserzeichen
    await addWatermark(outPath);

    const data = fs.readFileSync(outPath);
    return {
      success: true,
      base64: `data:image/png;base64,${data.toString('base64')}`,
      path: outPath,
    };

  } catch(e) {
    console.error('Generate error:', e);
    return { success: false, error: e.message };
  }
});

// ── Job warten ──
async function waitForJob(promptId, timeout = 300000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const hist = await axios.get(`${COMFY_URL}/history/${promptId}`, { timeout: 5000 });
      const job  = hist.data[promptId];
      if (job?.outputs) {
        for (const nodeOut of Object.values(job.outputs)) {
          if (nodeOut.images?.length) return nodeOut.images[0];
        }
      }
    } catch(e) {}
    await new Promise(r => setTimeout(r, 2000));
  }
  return null;
}

// ── Wasserzeichen ──
async function addWatermark(outPath) {
  return new Promise((resolve) => {
    const wmScript = path.join(SCRIPTS_DIR, 'add_watermark.py');
    const wmOut = outPath.replace('.png', '_wm.png');
    if (!fs.existsSync(wmScript)) { resolve(false); return; }
    const proc = spawn(VENV_PYTHON, [wmScript, outPath, wmOut]);
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(wmOut)) {
        fs.renameSync(wmOut, outPath);
        resolve(true);
      } else resolve(false);
    });
  });
}
