import { app, Tray, Menu, BrowserWindow, ipcMain, nativeImage } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
// 开发态注入 React DevTools（仅 dev 使用；打包后不引入，避免把扩展打包进生产）
import { installExtension, REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import type { ScheduleJson } from '../domain/types';
import { parseScheduleText } from '../domain/schedule/parser';
import { formatTime } from '../domain/schedule/format';
import { cnTimeRangeSpeak } from '../domain/schedule/speak';
import { getCurrentTask, getNextTask } from '../domain/schedule/runtime';

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let trayRendererWindow: BrowserWindow | null = null;
let trayTimer: NodeJS.Timeout | null = null;
let availableVoices: { zh: string[]; all: string[] } = { zh: [], all: [] };

// 开发环境(npm start)数据存项目内 dev-data/，生产环境(打包安装)数据存系统用户目录
const DATA_PATH = app.isPackaged
  ? path.join(app.getPath('userData'), 'schedules.json')
  : path.join(process.cwd(), 'dev-data', 'schedules.json')
const MAX_SCHEDULES = 10;

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

if (process.platform === 'darwin' && app.dock) {
  app.dock.hide();
}

// 确保数据目录存在
function ensureDataDir() {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 旧版 JSON 数据字段可能缺失，入参按任意结构处理，由本函数兜底为完整 Schedule 结构
function applyScheduleDefaults(s: any) {
  if (!s) return s;
  return {
    ...s,
    soundStart: s.soundStart || 'success',
    soundEnd: s.soundEnd || s.sound || 'chime',
    speakEnabled: s.speakEnabled === true,
    speakVoice: s.speakVoice || '',
    speakRate: typeof s.speakRate === 'number' ? s.speakRate : 1.0,
    speakVolume: typeof s.speakVolume === 'number' ? s.speakVolume : 1.0
  };
}

// 读取时间表数据
function loadSchedules(): ScheduleJson {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const data = fs.readFileSync(DATA_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      parsed.schedules = (parsed.schedules || []).map(applyScheduleDefaults);
      return parsed;
    }
  } catch (e) {
    console.error('Load schedules error:', e);
  }
  return { schedules: [], activeId: null, runningId: null, lastModifiedId: null };
}

// 保存时间表数据
function saveSchedules(data: ScheduleJson) {
  ensureDataDir();
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function createTrayRendererWindow() {
  trayRendererWindow = new BrowserWindow({
    width: 200,
    height: 50,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/tray.js')
    }
  });
  // 开发时，Electron 加载 Vite 的本地开发地址；生产时，加载构建后的 HTML 文件。这是 electron-vite 官方推荐的 HMR 接入方式。
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    trayRendererWindow.loadURL(
      `${process.env.ELECTRON_RENDERER_URL}/tray.html`
    )
  } else {
    trayRendererWindow.loadFile(path.join(__dirname, '../renderer/tray.html'))
  }
  trayRendererWindow.setMenuBarVisibility(false);
  trayRendererWindow.on('closed', () => { trayRendererWindow = null; });
  trayRendererWindow.webContents.once('did-finish-load', () => {
    updateTrayImage('无任务', '');
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  let icon = nativeImage.createEmpty();
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  }
  const t = new Tray(icon.resize({ width: 22, height: 22 }));
  tray = t;
  t.setToolTip('流时');
  updateTrayMenu();
  t.on('click', () => {
    t.popUpContextMenu();
  });
}

function updateTrayMenu(nextTaskName?: string | null) {
  if (!tray) return;
  const template: MenuItemConstructorOptions[] = [
    { label: '主面板', click: () => showMainWindow() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ];

  if (nextTaskName) {
    // Truncate next task name if too long to prevent tray menu from being too wide
    const MENU_TASK_MAX_LEN = 13; // Reduced from 30 to 15 to keep menu width compact
    let displayNext = nextTaskName;
    if (displayNext.length > MENU_TASK_MAX_LEN) {
      displayNext = displayNext.slice(0, MENU_TASK_MAX_LEN) + '...';
    }
    template.unshift({ label: `下一个任务：${displayNext}`, enabled: false });
  }

  // Removed padding logic as it was causing excessive width
  // Standard menu width is fine
  const mainPanelLabel = '主面板';

  // Replace the original "Main Panel" item
  const mainItemIndex = template.findIndex(i => i.label === '主面板');
  if (mainItemIndex !== -1) {
    template[mainItemIndex].label = mainPanelLabel;
  }

  const contextMenu = Menu.buildFromTemplate(template);
  tray.setContextMenu(contextMenu);
}

let lastTaskKey: string | null = null;
let lastTaskEndSec: number | null = null;

function startTrayTimer() {
  stopTrayTimer();
  let scrollIdx = 0;
  let lastNextTaskName: string | null = null;
  const tick = () => {
    const data = loadSchedules();
    const now = new Date();
    const nowSec = (now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds();
    const task = getCurrentTask(data.runningId, data.schedules, nowSec);
    const nextTask = getNextTask(data.runningId, data.schedules, nowSec);
    
    // Update Menu if next task changes
    const nextTaskName = nextTask ? nextTask.title : null;
    if (nextTaskName !== lastNextTaskName) {
      updateTrayMenu(nextTaskName);
      lastNextTaskName = nextTaskName;
    }

    const currentKey = task ? task.key : null;
    
    // Check if task started
    if (currentKey && currentKey !== lastTaskKey) {
       if (trayRendererWindow && task) {
         trayRendererWindow.webContents.send('play-sound', task.soundStart);
         const sched = data.schedules.find((x) => x.id === data.runningId);
         if (sched && sched.speakEnabled) {
           const timeStr = cnTimeRangeSpeak(task.startMin, task.endMin);
           const speakText = timeStr + '，' + (task.rawTitle || '') + '。';
           trayRendererWindow.webContents.send('speak-text', {
             text: speakText,
             voiceName: sched.speakVoice,
             rate: sched.speakRate,
             volume: sched.speakVolume,
             lang: 'zh-CN',
             afterSoundId: task.soundStart
           });
         }
       }
    }
    
    // Check if task ended
    if (lastTaskKey && lastTaskKey !== currentKey) {
       if (lastTaskEndSec !== null && nowSec >= lastTaskEndSec) {
         // 获取刚才结束的任务
         const s = data.schedules.find(x => x.id === data.runningId);
         // s.sound 为旧字段；加载时 applyScheduleDefaults 已兜底，此处 soundEnd 恒有值，等价于旧兼容写法
         const endedTaskSound = s ? s.soundEnd || 'chime' : 'chime';
         if (trayRendererWindow) trayRendererWindow.webContents.send('play-sound', endedTaskSound);
       }
    }

    if (task) {
      const timeStr = `${formatTime(task.remaining)} / ${formatTime(task.total)}`;
      let namePart = task.title;
      
      // Scrolling logic restored but limited to 10 chars window
      const SCROLL_WINDOW_SIZE = 10;
      if (task.title.length > SCROLL_WINDOW_SIZE) {
        // Use full-width spaces for padding to ensure consistent visual width
        // '\u3000' is the Ideographic Space (full-width space)
        const pad = '\u3000\u3000\u3000';
        const padded = task.title + pad;
        
        // Calculate total length needed to ensure we never run out of chars
        const repeatCount = Math.ceil((padded.length + SCROLL_WINDOW_SIZE) / padded.length) + 1;
        const longString = padded.repeat(repeatCount);
        
        scrollIdx = (scrollIdx + 1) % padded.length;
        namePart = longString.slice(scrollIdx, scrollIdx + SCROLL_WINDOW_SIZE);
      } else {
         // Pad with spaces to keep width consistent if short? Or just leave it.
         // namePart = task.title;
      }
      
      updateTrayImage(namePart, timeStr);
      lastTaskKey = task.key;
      lastTaskEndSec = task.endSec;
    } else {
      // Show next task if available
      if (nextTask) {
        let namePart = nextTask.title;
        const SCROLL_WINDOW_SIZE = 10;
        if (nextTask.title.length > SCROLL_WINDOW_SIZE) {
           namePart = nextTask.title.slice(0, SCROLL_WINDOW_SIZE) + '...'; // Static truncation for next task to avoid distracting scroll when idle
        }
        updateTrayImage(namePart, nextTask.start);
      } else {
        updateTrayImage('无任务', '');
      }
      lastTaskKey = null;
      lastTaskEndSec = null;
    }
  };
  tick();
  trayTimer = setInterval(tick, 400); // Restore to 400ms for smooth scrolling
}

function stopTrayTimer() {
  if (trayTimer) {
    clearInterval(trayTimer);
    trayTimer = null;
  }
}

function updateTrayImage(taskNamePart: string, timePart: string) {
  if (!tray || !trayRendererWindow) return;
  trayRendererWindow.webContents.send('render-tray-text', {
    taskNamePart: taskNamePart || '',
    timePart: timePart || '',
  });
}

ipcMain.on('tray-image-ready', (e, dataUrl) => {
  if (tray && dataUrl) {
    const img = nativeImage.createFromDataURL(dataUrl);
    if (img && !img.isEmpty()) {
      // Use the logical size we defined in tray-renderer.js
      // tray-renderer.js w=260, h=22
      // We resize to this logical size so it displays 1:1 on non-retina, and @2x on retina automatically handles it
      tray.setImage(img.resize({ width: 260, height: 22 }));
    }
  }
});

function showMainWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createMainWindow();
  }
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 700,
    minHeight: 400,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js')
    }
  });
  mainWindow = win;
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/index.html`)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { mainWindow = null; });
  // 开发态自动打开 DevTools，方便查看 React 组件树（不需要可删掉这段）
  if (!app.isPackaged) {
    win.webContents.openDevTools();
  }
  return win;
}

app.whenReady().then(async () => {
  // 仅在开发环境安装 React DevTools 扩展（默认会话 session，主窗口与托盘窗口共用）
  if (!app.isPackaged) {
    try {
      await installExtension(REACT_DEVELOPER_TOOLS);
      console.log('[devtools] React Developer Tools 已注入');
    } catch (err) {
      console.error('[devtools] React Developer Tools 安装失败:', err);
    }
  }

  ensureDataDir();
  createTrayRendererWindow();
  createTray();
  const mainWin = createMainWindow();
  mainWin.hide();

  // Tray renderer sends available voices list once
  ipcMain.on('voices-ready', (e, voices) => {
    if (voices) availableVoices = voices;
  });

  // IPC handlers
  ipcMain.handle('get-schedules', () => loadSchedules());
  ipcMain.handle('save-schedules', (e, data) => {
    saveSchedules(data);
    return true;
  });
  ipcMain.handle('parse-schedule', (e, text) => parseScheduleText(text));
  ipcMain.handle('get-voices', () => availableVoices);
  ipcMain.handle('set-running', (e, runningId) => {
    // Save state to disk immediately when changed
    const data = loadSchedules();
    data.runningId = runningId;
    saveSchedules(data);

    if (runningId) {
      startTrayTimer();
    } else {
      stopTrayTimer();
      updateTrayImage('无任务', '');
      // Clear menu when stopped
      updateTrayMenu(null);
      lastTaskKey = null;
      lastTaskEndSec = null;
      if (trayRendererWindow) trayRendererWindow.webContents.send('speak-text', { cancel: true });
    }
    return true;
  });
  ipcMain.handle('preview-sound', (e, soundId) => {
    if (trayRendererWindow) trayRendererWindow.webContents.send('play-sound', soundId);
    return true;
  });
  ipcMain.handle('preview-speak', (e, payload) => {
    if (trayRendererWindow && payload && payload.text) {
      trayRendererWindow.webContents.send('speak-text', {
        text: payload.text,
        voiceName: payload.voiceName || '',
        rate: typeof payload.rate === 'number' ? payload.rate : 1.0,
        volume: typeof payload.volume === 'number' ? payload.volume : 1.0,
        lang: 'zh-CN',
        preview: true
      });
    }
    return true;
  });

  const initial = loadSchedules();
  // Ensure we don't auto-start
  if (initial.runningId) {
     initial.runningId = null;
     saveSchedules(initial);
  }
  // if (initial.runningId) startTrayTimer(); // Disabled auto-start
});

app.on('before-quit', () => {
  // Clear running state on quit
  const data = loadSchedules();
  if (data.runningId) {
    data.runningId = null;
    saveSchedules(data);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
