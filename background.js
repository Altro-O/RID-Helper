chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ rids: [] });
});

// Проверка обновлений каждый час
chrome.alarms.create('checkUpdate', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkUpdate') {
    checkForUpdates();
  }
});

// Проверка при запуске
chrome.runtime.onStartup.addListener(() => {
  checkForUpdates();
});

async function checkForUpdates() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/Altro-O/RID-Helper/main/manifest.json');
    const remoteManifest = await response.json();
    const currentVersion = chrome.runtime.getManifest().version;
    
    if (remoteManifest.version > currentVersion) {
      // Отправляем сообщение в popup о доступном обновлении
      chrome.runtime.sendMessage({
        type: 'updateAvailable',
        version: remoteManifest.version
      });
      
      // Показываем уведомление
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Доступно обновление RID Helper',
        message: `Доступна новая версия ${remoteManifest.version}. Нажмите, чтобы обновить.`
      });
    }
  } catch (error) {
    console.error('Ошибка проверки обновлений:', error);
  }
}

// Обработка клика по уведомлению
chrome.notifications.onClicked.addListener(() => {
  chrome.runtime.requestUpdateCheck();
}); 