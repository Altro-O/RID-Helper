console.log('Background script loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  chrome.storage.local.set({ rids: [] });
  // Сразу проверяем обновления при установке
  checkForUpdates();
});

// Проверка обновлений каждую минуту (для тестирования)
chrome.alarms.create('checkUpdate', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name);
  if (alarm.name === 'checkUpdate') {
    checkForUpdates();
  }
});

// Проверка при запуске
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
  checkForUpdates();
});

async function checkForUpdates() {
  console.log('Checking for updates...');
  try {
    const response = await fetch('https://raw.githubusercontent.com/Altro-O/RID-Helper/main/version.json');
    const data = await response.json();
    const currentVersion = chrome.runtime.getManifest().version;
    console.log('Current version:', currentVersion);
    console.log('Latest version:', data.version);
    
    // Сравниваем версии как строки в формате x.y.z
    const currentParts = currentVersion.split('.').map(Number);
    const latestParts = data.version.split('.').map(Number);
    
    let hasUpdate = false;
    for (let i = 0; i < 3; i++) {
      if (latestParts[i] > currentParts[i]) {
        hasUpdate = true;
        break;
      } else if (latestParts[i] < currentParts[i]) {
        break;
      }
    }
    
    if (hasUpdate) {
      console.log('Update available!');
      // Сохраняем информацию об обновлении
      chrome.storage.local.set({ 
        updateInfo: {
          version: data.version,
          downloadUrl: data.download_url,
          changes: data.changes,
          showNotification: true
        }
      });
    } else {
      console.log('No updates available');
      chrome.storage.local.set({ 
        updateInfo: {
          showNotification: false
        }
      });
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
}

// Обработка клика по уведомлению
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log('Notification clicked:', notificationId);
  if (notificationId === 'update-notification') {
    // Открываем popup с информацией об обновлении
    chrome.storage.local.get('updateInfo', ({ updateInfo }) => {
      if (updateInfo && updateInfo.downloadUrl) {
        chrome.tabs.create({ url: updateInfo.downloadUrl });
      }
    });
  }
}); 