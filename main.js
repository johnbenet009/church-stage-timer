const { app, BrowserWindow, screen, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow, projectionWindow, currentTimer = null, db = {}, currentMessage = '';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    resizable: false,
    icon: path.join(__dirname, 'logo.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadFile('index.html');



  const menu = Menu.buildFromTemplate([
    {
      label: 'Refresh',
      click: () => mainWindow.reload()
    },
    {
      label: 'About',
      click: () => dialog.showMessageBox(mainWindow, {
        title: 'About Positive Timer',
        message: `Positive Timer was lovingly created for churches and stages in need of a simple and user-friendly timer software. It's licensed as an open-source project, so feel free to modify and use it, but please remember to credit me. I'm Positive John (Positive Developer), and you can reach me at +2349014532386.`
      })
    },
    { label: 'Exit', click: () => app.quit() }
  ]);




  Menu.setApplicationMenu(menu);  // Set the menu here

  mainWindow.on('close', () => {
    if (projectionWindow) {
      projectionWindow.close();
      projectionWindow = null;
    }
  });
}

app.on('ready', () => {
  const splashScreen = new BrowserWindow({
    width: 640,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
  });
  splashScreen.loadFile('splash.html');

  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    splashScreen.close();
    mainWindow.show();
  });

  const displays = screen.getAllDisplays();
  const secondaryDisplay = displays.find(d => d.id !== displays[0].id);
  if (secondaryDisplay) createProjectionWindow(secondaryDisplay);

  screen.on('display-added', () => mainWindow.webContents.send('refresh-display-list'));
  screen.on('display-removed', () => mainWindow.webContents.send('refresh-display-list'));

  mainWindow.on('close', () => {
    if (projectionWindow) {
      projectionWindow.close();
      projectionWindow = null;
    }
  });
});

ipcMain.handle('check-secondary-display', () => {
  const displays = screen.getAllDisplays();
  return displays.length > 1; 
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('get-displays', (event) => {
  const displays = screen.getAllDisplays();
  event.reply('display-list', displays.slice(1));
});

ipcMain.on('select-display', (event, displayId) => {
  const displays = screen.getAllDisplays();
  const selectedDisplay = displays.find(d => d.id === displayId);

  if (selectedDisplay && selectedDisplay.id !== displays[0].id) {
    createProjectionWindow(selectedDisplay);
  } else {
    event.reply('invalid-display');
  }
});

ipcMain.on('save-timer', (event, timerData) => {
  if (!db[timerData.time]) {
    db[timerData.time] = timerData;
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
    event.reply('timer-saved');
  } else {
    event.reply('timer-exists');
  }
});

ipcMain.on('start-timer', (event, time) => {
  let remaining = timeToSeconds(time);
  clearInterval(currentTimer);
  currentTimer = null;

  if (projectionWindow) {
    currentTimer = setInterval(() => {
      if (remaining > 0) {
        remaining--;
        const formattedTime = secondsToTime(remaining);
        event.reply('update-timer', formattedTime);
        projectionWindow.webContents.send('update-timer', formattedTime);
      } else {
        clearInterval(currentTimer);
        currentTimer = null;
        event.reply('timer-ended');
        projectionWindow.webContents.send('timer-ended');
        flashProjectionScreen();
      }
    }, 1000);
  } else {
    mainWindow.webContents.send('no-secondary-display');
  }
});

ipcMain.on('reset-timer', () => {
  clearInterval(currentTimer);
  currentTimer = null;
  if (projectionWindow) projectionWindow.webContents.send('reset-timer');
});

ipcMain.on('flash-background', () => {
  flashProjectionScreen();
  mainWindow.webContents.send('flash-background', 'red');
});

ipcMain.on('send-message', (event, message) => {
  currentMessage = message;
  if (projectionWindow) {
    projectionWindow.webContents.send('display-message', message);
    mainWindow.webContents.send('display-message', message);
  }
});

ipcMain.on('flash-message', () => {
  if (projectionWindow) {
    projectionWindow.webContents.send('flash-message');
    mainWindow.webContents.send('flash-message');
  }
});

ipcMain.on('reset-live', () => {
  if (projectionWindow) projectionWindow.webContents.send('reset-live');
  mainWindow.webContents.send('reset-live');
});

function createProjectionWindow(display) {
  if (projectionWindow) projectionWindow.close();
  projectionWindow = new BrowserWindow({
    fullscreen: true,
    x: display.bounds.x,
    y: display.bounds.y,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  projectionWindow.webContents.send('update-timer', '00:00');
  projectionWindow.loadFile('projection.html');
}

function flashProjectionScreen() {
  let flashCount = 0, flashInterval = setInterval(() => {
    const color = flashCount % 2 === 0 ? 'red' : 'black';
    projectionWindow.webContents.send('flash-background', color);
    mainWindow.webContents.send('flash-background', color);
    flashCount++;
    if (flashCount >= 8) clearInterval(flashInterval);
  }, 250);
}

function timeToSeconds(time) {
  const [minutes, seconds] = time.split(':').map(Number);
  return minutes * 60 + seconds;
}

function secondsToTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${pad(minutes)}:${pad(secs)}`;
}

function pad(num) {
  return num.toString().padStart(2, '0');
}
