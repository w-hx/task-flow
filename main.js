const { app, Tray, Menu, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;
let mainWindow = null;
let trayRendererWindow = null;
let trayTimer = null;

const DATA_PATH = path.join(app.getPath('userData'), 'schedules.json');
const MAX_SCHEDULES = 10;

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

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

function updateTrayMenu(nextTaskName) {
  const template = [
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

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getCurrentTask(runningId, schedules, nowSec) {
  if (!runningId) return null;
  const s = schedules.find((x) => x.id === runningId);
  if (!s || !s.items || s.items.length === 0) return null;
  for (const it of s.items) {
    const startSec = it.startMin * 60;
    const endSec = it.endMin * 60;
    if (nowSec >= startSec && nowSec < endSec) {
      const totalSec = (it.endMin - it.startMin) * 60;
      const remaining = totalSec - (nowSec - startSec);
      const key = `${it.startMin}-${it.endMin}-${it.title}`;
      return { 
        title: '『' + it.title + '』', 
        remaining, 
        total: totalSec, 
        key, 
        endSec, 
        soundStart: s.soundStart || 'success',
        soundEnd: s.soundEnd || s.sound || 'chime' 
      };
    }
  }
  return null;
}

function getNextTask(runningId, schedules, nowSec) {
  if (!runningId) return null;
  const s = schedules.find((x) => x.id === runningId);
  if (!s || !s.items || s.items.length === 0) return null;
  
  // Find tasks that start after nowSec
  const upcoming = s.items
    .filter(it => (it.startMin * 60) > nowSec)
    .sort((a, b) => a.startMin - b.startMin);
    
  if (upcoming.length > 0) {
    const next = upcoming[0];
    return { title: next.title, start: next.start };
  } else {
    // Loop back to the first task
    // Since items are usually sorted by start time, we take the one with min startMin
    const sortedAll = [...s.items].sort((a, b) => a.startMin - b.startMin);
    if (sortedAll.length > 0) {
      const first = sortedAll[0];
      return { title: first.title, start: first.start };
    }
  }
  return null;
}

let lastTaskKey = null;
let lastTaskEndSec = null;

function startTrayTimer() {
  stopTrayTimer();
  let scrollIdx = 0;
  let lastNextTaskName = null;
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
       // New task started
       // Only play if it's a "fresh" start (not resuming app in middle of task, though maybe we want that too?)
       // For now, let's play sound whenever the current task changes to a valid task.
       // However, we need to be careful not to double play if this is just the first tick.
       // But lastTaskKey starts as null.
       
       // Use schedule config for soundStart
       if (trayRendererWindow && task) trayRendererWindow.webContents.send('play-sound', task.soundStart);
    }
    
    // Check if task ended
    if (lastTaskKey && lastTaskKey !== currentKey) {
       if (lastTaskEndSec !== null && nowSec >= lastTaskEndSec) {
         // 获取刚才结束的任务
         const s = data.schedules.find(x => x.id === data.runningId);
         const endedTaskSound = s ? (s.soundEnd || s.sound || 'chime') : 'chime';
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
    // Save state to disk immediately when changed
    const data = loadSchedules();
    data.runningId = runningId;
    saveSchedules(data);

    if (runningId) {
      startTrayTimer();
    } else {
      stopTrayTimer();
      updateTrayImage('无任务', '', true);
      // Clear menu when stopped
      updateTrayMenu(null);
      lastTaskKey = null;
      lastTaskEndSec = null;
    }
    return true;
  });
  ipcMain.handle('preview-sound', (e, soundId) => {
    if (trayRendererWindow) trayRendererWindow.webContents.send('play-sound', soundId);
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
