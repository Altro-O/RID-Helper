// Слушаем установку или обновление расширения
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        handleFirstInstall();
    } else if (details.reason === 'update') {
        handleUpdate(details.previousVersion);
    }
});

// Обработка первой установки
function handleFirstInstall() {
    // Инициализация базы данных и других необходимых компонентов
    chrome.storage.local.set({
        isInitialized: true,
        lastUpdate: Date.now(),
        settings: {
            autoUpdate: true,
            notifications: true
        }
    });
}

// Обработка обновления
function handleUpdate(previousVersion) {
    // Проверяем необходимость миграции данных
    chrome.storage.local.get(['settings'], (result) => {
        if (!result.settings) {
            // Если настройки отсутствуют, создаем их
            chrome.storage.local.set({
                settings: {
                    autoUpdate: true,
                    notifications: true
                }
            });
        }
    });
}

// Слушаем сообщения от content scripts и popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'checkUpdate':
            checkForUpdates().then(sendResponse);
            return true; // Возвращаем true для асинхронного ответа
        case 'getSettings':
            getSettings().then(sendResponse);
            return true;
    }
});

// Проверка обновлений
async function checkForUpdates() {
    const settings = await getSettings();
    if (!settings.autoUpdate) return { hasUpdate: false };

    // Здесь можно добавить логику проверки обновлений
    // Например, запрос к серверу с версией расширения
    return { hasUpdate: false };
}

// Получение настроек
async function getSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['settings'], (result) => {
            resolve(result.settings || {
                autoUpdate: true,
                notifications: true
            });
        });
    });
} 