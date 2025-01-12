class FeedbackManager {
    constructor() {
        this.button = document.getElementById('feedbackButton');
        this.dialog = document.getElementById('feedbackDialog');
        this.form = document.getElementById('feedbackForm');
        this.cancelButton = document.getElementById('feedbackCancel');
        this.successMessage = document.getElementById('feedbackSuccess');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.button.addEventListener('click', () => this.openDialog());
        this.cancelButton.addEventListener('click', () => this.closeDialog());
        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) {
                this.closeDialog();
            }
        });
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    openDialog() {
        this.dialog.classList.add('visible');
        this.successMessage.classList.remove('visible');
        this.form.reset();
    }

    closeDialog() {
        this.dialog.classList.remove('visible');
    }

    async handleSubmit(e) {
        e.preventDefault();

        const feedbackType = this.form.querySelector('input[name="feedbackType"]:checked').value;
        const feedbackText = document.getElementById('feedbackText').value;

        const feedback = {
            type: feedbackType,
            text: feedbackText,
            timestamp: new Date().toISOString(),
            version: chrome.runtime.getManifest().version,
            userAgent: navigator.userAgent
        };

        try {
            await this.saveFeedback(feedback);
            await this.sendToTelegram(feedback);
            this.showSuccess();
        } catch (error) {
            console.error('Error handling feedback:', error);
            this.showError('Произошла ошибка при отправке отзыва. Пожалуйста, попробуйте позже.');
        }
    }

    async saveFeedback(feedback) {
        const { feedbacks = [] } = await chrome.storage.local.get('feedbacks');
        feedbacks.push(feedback);
        await chrome.storage.local.set({ feedbacks });
    }

    async sendToTelegram(feedback) {
        // Отправляем запрос в background script для отправки в Telegram
        chrome.runtime.sendMessage({
            action: 'sendTelegramFeedback',
            feedback
        });
    }

    showSuccess() {
        this.successMessage.classList.add('visible');
        this.form.reset();
        setTimeout(() => {
            this.closeDialog();
        }, 2000);
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'feedback-error';
        errorDiv.textContent = message;
        this.form.appendChild(errorDiv);
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new FeedbackManager();
}); 