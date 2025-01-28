class TransactionSearchService {
    constructor() {
        this.initialize();
        this.searchTimeout = null;
    }

    initialize() {
        this.transactionInput = document.getElementById('transactionInput');
        this.transactionInfo = document.getElementById('transactionInfo');

        if (!this.transactionInput || !this.transactionInfo) {
            console.error('Не найдены необходимые элементы DOM');
            return;
        }

        this.transactionInput.addEventListener('input', () => {
            // Отменяем предыдущий таймаут
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
            
            // Устанавливаем новый таймаут
            this.searchTimeout = setTimeout(() => {
                this.handleSearch();
            }, 300); // Задержка 300мс
        });
    }

    async handleSearch() {
        const query = this.transactionInput.value.trim();
        
        if (!query) {
            this.transactionInfo.innerHTML = '';
            return;
        }

        try {
            // Получаем активную вкладку
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                throw new Error('Не удалось получить активную вкладку');
            }

            // Отправляем сообщение в content script
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'findTransaction',
                transactionId: query
            });

            if (response.found) {
                if (!response.isPayback) {
                    this.transactionInfo.innerHTML = `
                        <div class="transaction-error">
                            <div>⚠️ По данной транзакции возврат не создан</div>
                            <div class="error-details">
                                <div>Для начала проверьте:</div>
                                <ul>
                                    <li>Верный ли личный кабинет открыт в данный момент</li>
                                    <li>Корректная ли ссылка на оплату используется</li>
                                </ul>
                                <p>
                                    Если всё верно - значит возврат ещё не создан. 
                                    Вы знаете что делать дальше.
                                </p>
                            </div>
                        </div>
                    `;
                } else {
                    this.displayTransactionInfo(response);
                }
            } else {
                if (response.error) {
                    this.transactionInfo.innerHTML = `<div class="transaction-error">${response.error}</div>`;
                } else {
                    this.transactionInfo.innerHTML = `
                        <div class="transaction-error">
                            ⚠️ Транзакция не найдена. Проверьте:
                            <ul>
                                <li>Правильность введенного номера транзакции</li>
                                <li>Верный ли личный кабинет открыт</li>
                                <li>Загружена ли страница полностью</li>
                            </ul>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Ошибка поиска транзакции:', error);
            this.transactionInfo.innerHTML = `
                <div class="transaction-error">
                    Ошибка поиска транзакции: ${error.message}
                </div>
            `;
        }
    }

    displayTransactionInfo(transaction) {
        const allData = `RRN: ${transaction.data.rrn}
Сумма: ${transaction.data.amount}
Дата: ${transaction.data.date}
Карта: ** ${transaction.data.cardLast4}`;

        const html = `
            <div class="transaction-details">
                <div class="detail-row">
                    <span class="label">RRN:</span>
                    <span class="value">${transaction.data.rrn}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Сумма:</span>
                    <span class="value">${transaction.data.amount}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Дата:</span>
                    <span class="value">${transaction.data.date}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Карта:</span>
                    <span class="value">** ${transaction.data.cardLast4}</span>
                </div>
                <button class="copy-all-btn" data-copy="${allData}">
                    Скопировать все данные
                </button>
            </div>
        `;

        this.transactionInfo.innerHTML = html;
        this.initializeCopyAllButton();
    }

    initializeCopyAllButton() {
        const copyAllBtn = this.transactionInfo.querySelector('.copy-all-btn');
        if (copyAllBtn) {
            copyAllBtn.addEventListener('click', async () => {
                const textToCopy = copyAllBtn.getAttribute('data-copy');
                try {
                    await navigator.clipboard.writeText(textToCopy);
                    this.showCopySuccess(copyAllBtn);
                } catch (err) {
                    console.error('Ошибка при копировании:', err);
                }
            });
        }
    }

    showCopySuccess(element) {
        const originalText = element.textContent;
        element.textContent = 'Скопировано!';
        element.classList.add('copied');
        
        setTimeout(() => {
            element.textContent = originalText;
            element.classList.remove('copied');
        }, 2000);
    }
}

// Создаем и экспортируем экземпляр сервиса
export const transactionSearchService = new TransactionSearchService(); 