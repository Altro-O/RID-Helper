class PopupManager {
    constructor() {
        this.initializeButtons();
    }

    initializeButtons() {
        document.getElementById('ridHelper').addEventListener('click', () => {
            this.openRidHelper();
        });

        document.getElementById('knowledgeBase').addEventListener('click', () => {
            this.openKnowledgeBase();
        });
    }

    async openRidHelper() {
        // Открываем оригинальный функционал RID Helper
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "openRidHelper"});
        });
    }

    async openKnowledgeBase() {
        // Открываем страницу поиска по базе знаний в новой вкладке
        const url = chrome.runtime.getURL('src/pages/search.html');
        chrome.tabs.create({ url });
    }
}

// Инициализация при загрузке popup
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
}); 