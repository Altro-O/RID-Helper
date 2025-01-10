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
    const response = await fetch('https://raw.githubusercontent.com/Altro-O/RID-Helper/main/version.json');
    const data = await response.json();
    const currentVersion = chrome.runtime.getManifest().version;
    
    if (data.version > currentVersion) {
      // Сохраняем информацию об обновлении
      chrome.storage.local.set({ 
        updateInfo: {
          version: data.version,
          downloadUrl: data.download_url,
          changes: data.changes
        }
      });
      
      // Показываем уведомление
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Доступно обновление RID Helper',
        message: `Доступна версия ${data.version}. Нажмите, чтобы обновить.`
      });
    }
  } catch (error) {
    console.error('Ошибка проверки обновлений:', error);
  }
}

// Обработка клика по уведомлению
chrome.notifications.onClicked.addListener(() => {
  // Открываем popup с информацией об обновлении
  chrome.action.openPopup();
}); 