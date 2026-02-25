const { app, Tray, Menu, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;
let mainWindow = null;
let trayRendererWindow = null;
let trayTimer = null;

const DATA_PATH = path.join(app.getPath('userData'), 'schedules.json');
const MAX_SCHEDULES = 10;

// 确保数据目录存在
function ensureDataDir() {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 读取时间表数据
function loadSchedules() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const data = fs.readFileSync(DATA_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Load schedules error:', e);
  }
  return { schedules: [], activeId: null, runningId: null, lastModifiedId: null };
}

// 保存时间表数据
function saveSchedules(data) {
  ensureDataDir();
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// 解析时间表格式 "7:30-7:35 任务内容"，返回 { items, error }
function parseScheduleText(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  const items = [];
  const regex = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})\s+(.+)$/;

  for (const line of lines) {
    const m = line.match(regex);
    if (!m) return { items: null, error: '格式错误，每行应为：HH:MM-HH:MM 任务内容' };
    const startMin = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    const endMin = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
    if (endMin <= startMin) return { items: null, error: '结束时间必须大于开始时间' };
    items.push({
      startMin,
      endMin,
      start: m[1] + ':' + m[2],
      end: m[3] + ':' + m[4],
      title: m[5].trim(),
      durationMin: endMin - startMin
    });
  }
  if (items.length === 0) return { items: null, error: '至少需要一行有效任务' };

  // 检查时间重叠
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startMin < sorted[i - 1].endMin) {
      return { items: null, error: `时间重叠：${sorted[i - 1].title} 与 ${sorted[i].title}` };
    }
  }
  return { items, error: null };
}

function createTrayRendererWindow() {
  trayRendererWindow = new BrowserWindow({
    width: 200,
    height: 50,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'tray-preload.js')
    }
  });
  trayRendererWindow.loadFile(path.join(__dirname, 'tray-renderer.html'));
  trayRendererWindow.setMenuBarVisibility(false);
  trayRendererWindow.on('closed', () => { trayRendererWindow = null; });
  trayRendererWindow.webContents.once('did-finish-load', () => {
    updateTrayImage('无任务', '', true);
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let icon = nativeImage.createEmpty();
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  }
  tray = new Tray(icon.resize({ width: 22, height: 22 }));
  tray.setToolTip('TaskFlow');
  updateTrayMenu();
  tray.on('click', () => {
    tray.popUpContextMenu();
  });
}

function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示 TaskFlow', click: () => showMainWindow() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getCurrentTask(runningId, schedules) {
  if (!runningId) return null;
  const s = schedules.find((x) => x.id === runningId);
  if (!s || !s.items || s.items.length === 0) return null;
  const now = new Date();
  const nowSec = (now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds();
  for (const it of s.items) {
    const startSec = it.startMin * 60;
    const endSec = it.endMin * 60;
    if (nowSec >= startSec && nowSec < endSec) {
      const totalSec = (it.endMin - it.startMin) * 60;
      const remaining = totalSec - (nowSec - startSec);
      return { title: '『' + it.title + '』', remaining, total: totalSec };
    }
  }
  return null;
}

function startTrayTimer() {
  stopTrayTimer();
  let scrollIdx = 0;
  const tick = () => {
    const data = loadSchedules();
    const task = getCurrentTask(data.runningId, data.schedules);
    if (task) {
      const timeStr = `${formatTime(task.remaining)} / ${formatTime(task.total)}`;
      let namePart = task.title;
      if (task.title.length > 20) {
        scrollIdx = (scrollIdx + 1) % (task.title.length + 3);
        const pad = '   ';
        const padded = task.title + pad;
        const start = scrollIdx % padded.length;
        namePart = (padded.slice(start) + padded).slice(0, 20);
      }
      updateTrayImage(namePart, timeStr, true);
    } else {
      updateTrayImage('无任务', '', true);
    }
  };
  tick();
  trayTimer = setInterval(tick, 400);
}

function stopTrayTimer() {
  if (trayTimer) {
    clearInterval(trayTimer);
    trayTimer = null;
  }
}

function updateTrayImage(taskNamePart, timePart) {
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
      tray.setImage(img.resize({ width: 340, height: 44 }));
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

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 700,
    minHeight: 400,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  ensureDataDir();
  createTrayRendererWindow();
  createTray();
  createMainWindow();
  mainWindow.hide();

  // IPC handlers
  ipcMain.handle('get-schedules', () => loadSchedules());
  ipcMain.handle('save-schedules', (e, data) => {
    saveSchedules(data);
    return true;
  });
  ipcMain.handle('parse-schedule', (e, text) => parseScheduleText(text));
  ipcMain.handle('set-running', (e, runningId) => {
    if (runningId) {
      startTrayTimer();
    } else {
      stopTrayTimer();
      updateTrayImage('无任务', '', true);
    }
    return true;
  });

  const initial = loadSchedules();
  if (initial.runningId) startTrayTimer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
