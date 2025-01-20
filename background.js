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

// Функция для проверки обновлений
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
            // Устанавливаем красный бейдж с восклицательным знаком
            chrome.action.setBadgeText({ text: '!' });
            chrome.action.setBadgeBackgroundColor({ color: '#EA4335' });
            
            // Сохраняем информацию об обновлении
            chrome.storage.local.set({ 
                updateInfo: {
                    version: data.version,
                    downloadUrl: data.download_url,
                    changes: data.changes,
                    showNotification: true
                }
            });

            // Показываем уведомление
            chrome.notifications.create('update-notification', {
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'Доступно обновление',
                message: `Доступна новая версия ${data.version}. Нажмите, чтобы обновить.`,
                priority: 2
            });
        } else {
            console.log('No updates available');
            // Если обновлений нет, убираем бейдж
            chrome.action.setBadgeText({ text: '' });
            chrome.storage.local.set({ 
                updateInfo: {
                    showNotification: false
                }
            });
        }
    } catch (error) {
        console.error('Ошибка при проверке обновлений:', error);
    }
}

// Проверяем обновления при запуске
checkForUpdates();

// Проверяем обновления каждый час
chrome.alarms.create('updateCheck', { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'updateCheck') {
        checkForUpdates();
    }
});

// Обработчик клика по уведомлению
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

// Обработчик сообщений
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'checkUpdate':
            checkForUpdates().then(sendResponse);
            return true;
        case 'getSettings':
            getSettings().then(sendResponse);
            return true;
        case 'sendTelegramFeedback':
            sendTelegramFeedback(request.feedback).then(sendResponse);
            return true;
    }
});

// Отправка отзыва в Telegram
async function sendTelegramFeedback(feedback) {
    const BOT_TOKEN = '8166900887:AAGDiYGDLIHaonG85mdeg-RcyJY_ebSgzDI';
    const CHAT_ID = '-1002390424799';
    
    const message = `
📝 *Новый отзыв*

*Тип:* ${feedback.type}
*Версия:* ${feedback.version}
*Дата:* ${new Date(feedback.timestamp).toLocaleString('ru-RU')}

*Сообщение:*
${feedback.text}

*Техническая информация:*
\`${feedback.userAgent}\`
    `.trim();

    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        if (!response.ok) {
            throw new Error(`Telegram API error: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Feedback sent to Telegram:', result);
        
        // Отправляем уведомление об успешной отправке
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Отзыв отправлен',
            message: 'Спасибо за ваш отзыв! Мы обязательно его рассмотрим.'
        });

        return result;
    } catch (error) {
        console.error('Error sending feedback to Telegram:', error);
        throw error;
    }
} 