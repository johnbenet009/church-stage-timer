const ipcRenderer = require('electron').ipcRenderer;

let projectionTimeElement = document.querySelector('.projection-time');

ipcRenderer.on('update-timer', (event, remainingTime) => {
  projectionTimeElement.textContent = remainingTime;
});

ipcRenderer.on('reset-timer', () => {
  projectionTimeElement.textContent = '00:00:00';
});

ipcRenderer.on('flash-background', (event, color) => {
  document.body.style.backgroundColor = color;
});