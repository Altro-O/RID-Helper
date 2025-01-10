// Слушаем сообщения от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openRidHelper') {
        handleRidHelper();
    }
});

function handleRidHelper() {
    // Оригинальный функционал RID Helper
    // ... существующий код ...
} 