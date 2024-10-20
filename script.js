const ipcRenderer = require('electron').ipcRenderer;

let minutes = 0;
let seconds = 0;
let previewTimeElement = document.querySelector('.preview-time');
let liveTimeElement = document.querySelector('.live-time');

updatePreviewTime();
updateLiveTime();

function decreaseMinutes(amount) {
  minutes -= amount;
  updatePreviewTime();
}

function increaseMinutes(amount) {
  minutes += amount;
  updatePreviewTime();
}

function updatePreviewTime() {
  const formattedTime = `${pad(minutes)}:${pad(seconds)}`;
  previewTimeElement.textContent = formattedTime;
}

function updateLiveTime() {
  liveTimeElement.textContent = previewTimeElement.textContent;
}

function saveTimer() {
  const time = `${pad(minutes)}:${pad(seconds)}`;
  ipcRenderer.send('save-timer', { time });
}

function selectDisplay() {
  ipcRenderer.send('get-displays');
}

ipcRenderer.on('display-list', (event, displays) => {
  const displayDropdown = document.getElementById('displayDropdown');

  displayDropdown.innerHTML = '<option value="">Select a display</option>';

  displays.forEach(display => {
    const option = document.createElement('option');
    option.value = display.id;
    option.text = `Display ${display.id} - ${display.bounds.width}x${display.bounds.height}`;
    displayDropdown.add(option);
  });
});

ipcRenderer.on('refresh-display-list', () => {
  ipcRenderer.send('get-displays'); 
});

ipcRenderer.on('timer-saved', () => {
  alert('Time template saved!');
});

ipcRenderer.on('timer-exists', () => {
  alert('Time template already exists!');
});

function startTimer() {
  const time = `${pad(minutes)}:${pad(seconds)}`;
  ipcRenderer.send('start-timer', time);
  updateLiveTime(); 
}

function resetTimer() {
  ipcRenderer.send('reset-timer');
}

ipcRenderer.on('update-timer', (event, remainingTime) => {
  liveTimeElement.textContent = remainingTime; 
});

ipcRenderer.on('timer-ended', () => {
  alert("Time's Up!"); 
});

ipcRenderer.on('flash-background', (event, color) => {
  document.querySelector('.live-screen').style.backgroundColor = color; 
});

ipcRenderer.on('display-message', (event, message) => {
  const messageContainer = document.querySelector('.message-container');
  messageContainer.textContent = message;
  messageContainer.style.display = 'block'; 
});

ipcRenderer.on('flash-message', () => {
  const messageContainer = document.querySelector('.message-container');
  let flashCount = 0;
  const flashInterval = setInterval(() => {
    messageContainer.style.opacity = flashCount % 5 === 0 ? '1' : '0.3'; 
    flashCount++;
    if (flashCount >= 8) clearInterval(flashInterval);
  }, 500);
});

ipcRenderer.on('reset-live', () => {
  document.querySelector('.live-time').textContent = '00:00';
  document.querySelector('.message-container').style.display = 'none';
});

function pad(num) {
  return num.toString().padStart(2, '0');
}

function flashBackground() {
  ipcRenderer.invoke('check-secondary-display').then(isSecondaryConnected => {
    if (isSecondaryConnected) {
      ipcRenderer.send('flash-background');
    } else {
      alert('No secondary monitor connected.');
    }
  });
}

function stopTimer() {
const time = `0:0`;
  ipcRenderer.send('start-timer', time);
  updateLiveTime(); 
  
  minutes = 0;
  seconds = 0;
  updateLiveTime();
}


function sendMessage() {
  const message = document.getElementById('messageInput').value;
  ipcRenderer.send('send-message', message);
}

function flashMessage() {
  ipcRenderer.send('flash-message');
}

function resetProgram() {
  minutes = 0;
  seconds = 0;
  updatePreviewTime(); 
}

function resetLive() {
  ipcRenderer.send('reset-live');
}