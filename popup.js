let db;
let currentFilter = '';
let isInserting = false;
let shouldCancelInsertion = false;

// Статистика использования
class UsageStats {
    constructor() {
        this.stats = {
            timeSaved: 0,
            problemsProcessed: 0,
            ridsUsed: 0,
            lastUpdate: Date.now()
        };
        this.loadStats();
    }

    async loadStats() {
        const { usageStats } = await chrome.storage.local.get('usageStats');
        if (usageStats) {
            this.stats = usageStats;
        }
    }

    async saveStats() {
        await chrome.storage.local.set({ usageStats: this.stats });
        this.updateDisplay();
    }

    updateDisplay() {
        document.getElementById('timeSaved').textContent = `${Math.round(this.stats.timeSaved)} мин`;
        document.getElementById('problemsProcessed').textContent = this.stats.problemsProcessed;
        document.getElementById('ridsUsed').textContent = this.stats.ridsUsed;
    }

    async addProblemProcessed() {
        this.stats.problemsProcessed++;
        this.stats.timeSaved += 2; // Предполагаем, что каждая проблема экономит 2 минуты
        await this.saveStats();
    }

    async addRidUsed() {
        this.stats.ridsUsed++;
        this.stats.timeSaved += 0.5; // Предполагаем, что каждый RID экономит 30 секунд
        await this.saveStats();
    }
}

// Подсказки и релевантность
class SearchSuggestions {
    constructor(problems) {
        this.problems = problems;
        this.commonQueries = new Map(); // Хранение частых запросов
    }

    getSuggestions(query) {
        if (!query || query.length < 2) return [];
        
        // Получаем похожие слова
        const words = query.toLowerCase().split(/\s+/);
        const suggestions = new Set();
        
        this.problems.forEach(problem => {
            const title = problem.title.toLowerCase();
            const content = problem.content.toLowerCase();
            
            words.forEach(word => {
                if (word.length < 3) return;
                
                // Ищем похожие слова в заголовке и контенте
                if (title.includes(word) || content.includes(word)) {
                    const matches = [...title.matchAll(/\b\w+\b/g), ...content.matchAll(/\b\w+\b/g)];
                    matches.forEach(match => {
                        const matchedWord = match[0];
                        if (this.isWordSimilar(word, matchedWord)) {
                            suggestions.add(matchedWord);
                        }
                    });
                }
            });
        });

        return Array.from(suggestions)
            .filter(s => !words.includes(s))
            .slice(0, 5);
    }

    isWordSimilar(word1, word2) {
        if (word1 === word2) return false;
        if (word1.length < 3 || word2.length < 3) return false;

        // Простой алгоритм схожести слов
        const shorter = word1.length < word2.length ? word1 : word2;
        const longer = word1.length < word2.length ? word2 : word1;

        if (longer.includes(shorter)) return true;
        if (shorter.length < 4) return false;

        let matches = 0;
        for (let i = 0; i < shorter.length - 2; i++) {
            if (longer.includes(shorter.substring(i, i + 3))) {
                matches++;
            }
        }

        return matches >= shorter.length - 3;
    }

    addToCommonQueries(query) {
        const count = this.commonQueries.get(query) || 0;
        this.commonQueries.set(query, count + 1);
    }
}

// Инициализация
const stats = new UsageStats();
let suggestions;

// Обновляем инициализацию базы проблем
fetch(chrome.runtime.getURL('problems.json'))
    .then(response => response.json())
    .then(async problems => {
        try {
            db = new ProblemsDatabase(problems);
            suggestions = new SearchSuggestions(problems);
            await initializeInterface();
        } catch (error) {
            console.error('Ошибка инициализации базы проблем:', error);
            document.getElementById('resultsContainer').innerHTML = 
                '<div class="error">Ошибка инициализации базы проблем</div>';
        }
    })
    .catch(error => {
        console.error('Ошибка загрузки базы проблем:', error);
        document.getElementById('resultsContainer').innerHTML = 
            '<div class="error">Ошибка загрузки базы проблем</div>';
    });

// Инициализация интерфейса
async function initializeInterface() {
    try {
        // Проверяем наличие обновления
        chrome.storage.local.get('updateInfo', ({ updateInfo }) => {
            if (updateInfo && updateInfo.showNotification) {
                const updateDialog = document.getElementById('updateDialog');
                const updateChanges = document.getElementById('updateChanges');
                if (updateDialog && updateChanges) {
                    updateChanges.textContent = updateInfo.changes;
                    updateDialog.classList.add('visible');
                }
            }
        });

        initializeCategories();
        initializeSearch();
        initializeQueryChips();
        
        // Показываем все проблемы при старте
        const results = db.search('');
        await displayResults(results);
    } catch (error) {
        console.error('Ошибка инициализации интерфейса:', error);
        document.getElementById('resultsContainer').innerHTML = 
            '<div class="error">Ошибка инициализации интерфейса</div>';
    }
}

function initializeCategories() {
    try {
        // Получаем категории из базы данных
        const categories = ['Все', ...db.getCategories()];
        
        const container = document.getElementById('categoriesContainer');
        if (!container) {
            console.error('Контейнер категорий не найден');
            return;
        }
        
        container.innerHTML = categories
            .map(category => `
                <div class="category-chip ${category === 'Все' ? 'active' : ''}" 
                     data-category="${category === 'Все' ? '' : category}">
                    ${category}
                </div>
            `)
            .join('');

        container.addEventListener('click', (e) => {
            const chip = e.target.closest('.category-chip');
            if (!chip) return;

            // Убираем активный класс со всех чипов
            document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            
            // Устанавливаем текущий фильтр
            currentFilter = chip.dataset.category;
            
            // Обновляем результаты с учетом фильтра
            updateResults();
        });
    } catch (error) {
        console.error('Ошибка инициализации категорий:', error);
    }
}

function initializeQueryChips() {
    document.querySelectorAll('.query-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const query = chip.dataset.query;
            const searchInput = document.getElementById('searchInput');
            searchInput.value = query;
            searchInput.dispatchEvent(new Event('input'));
        });
    });
}

// Инициализация поиска
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(updateResults, 300);
    });
}

async function updateResults() {
    const query = document.getElementById('searchInput').value.trim();
    
    // Получаем все результаты
    const results = db.search(query);
    
    // Группируем результаты по релевантности
    const groupedResults = groupResultsByRelevance(results);
    
    // Применяем фильтр категории
    let filteredResults = groupedResults;
    if (currentFilter) {
        filteredResults = db.filterByCategory(groupedResults, currentFilter);
    }

    // Отображаем результаты
    await displayResults(filteredResults);
}

function groupResultsByRelevance(results) {
    // Группируем результаты по релевантности
    const groups = {
        high: [],
        medium: [],
        low: []
    };

    results.forEach(result => {
        if (result.score > 20) {
            groups.high.push(result);
        } else if (result.score > 10) {
            groups.medium.push(result);
        } else {
            groups.low.push(result);
        }
    });

    return [...groups.high, ...groups.medium, ...groups.low];
}

function updateSuggestionsDisplay(suggestions) {
    const container = document.getElementById('suggestionsContainer');
    if (suggestions.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="suggestions-label">Возможно, вы имели в виду:</div>
        ${suggestions.map(suggestion => 
            `<span class="suggestion-item">${suggestion}</span>`
        ).join('')}
    `;

    container.addEventListener('click', (e) => {
        const suggestionItem = e.target.closest('.suggestion-item');
        if (!suggestionItem) return;

        const searchInput = document.getElementById('searchInput');
        searchInput.value = suggestionItem.textContent;
        searchInput.dispatchEvent(new Event('input'));
    });
}

async function displayResults(results) {
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsCount = document.getElementById('resultsCount');
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">Ничего не найдено</div>';
        resultsCount.textContent = currentFilter ? 
            `Нет результатов в категории "${currentFilter}"` : 
            'Нет результатов';
        return;
    }
    
    resultsCount.textContent = currentFilter ? 
        `Найдено в категории "${currentFilter}": ${results.length}` : 
        `Найдено: ${results.length}`;
    
    resultsContainer.innerHTML = results
        .map(problem => {
            const content = problem.highlightedContent || problem.content;
            const isLongContent = content.length > 300 || content.split('\n').length > 3;
            return `
                <div class="problem-item" data-id="${problem.id}">
                    <div class="problem-title">${problem.highlightedTitle || problem.title}</div>
                    <div class="problem-category">${problem.category}</div>
                    <div class="problem-content ${isLongContent ? 'collapsed collapsible' : ''}">${content}</div>
                    <div class="problem-requirements">${problem.requirements}</div>
                    <div class="problem-actions">
                        ${isLongContent ? `
                            <button class="action-button toggle-content visible">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                                Показать полностью
                            </button>
                        ` : ''}
                        <button class="action-button copy-content">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            </svg>
                            Копировать
                        </button>
                    </div>
                </div>
            `;
        })
        .join('');

    // Обработчики действий
    resultsContainer.addEventListener('click', async (e) => {
        const problemItem = e.target.closest('.problem-item');
        if (!problemItem) return;

        // Обработка кнопки "Развернуть/Свернуть"
        if (e.target.closest('.toggle-content')) {
            const content = problemItem.querySelector('.problem-content');
            const button = e.target.closest('.toggle-content');
            
            if (content.classList.contains('collapsible')) {
                content.classList.toggle('collapsed');
                button.innerHTML = content.classList.contains('collapsed') ? 
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>Показать полностью' :
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>Свернуть';
            }
            return;
        }

        // Обработка кнопки "Копировать"
        if (e.target.closest('.copy-content')) {
            const title = problemItem.querySelector('.problem-title').textContent;
            const content = problemItem.querySelector('.problem-content').textContent;
            const requirements = problemItem.querySelector('.problem-requirements').textContent;
            
            const textToCopy = `${title}\n\n${content}\n\nТребования:\n${requirements}`;
            await navigator.clipboard.writeText(textToCopy);
            
            const button = e.target.closest('.copy-content');
            button.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Скопировано
            `;
            setTimeout(() => {
                button.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    </svg>
                    Копировать
                `;
            }, 2000);
        }
    });
}

// Инициализация работы с RID
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация вкладок
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
        });
    });

    // Инициализация работы с RID
    const ridInput = document.getElementById('ridInput');
    const extractButton = document.getElementById('extractRids');
    const insertButton = document.getElementById('insertRids');
    const savedRidsDiv = document.getElementById('savedRids');

    // Восстанавливаем сохраненный текст при открытии
    chrome.storage.local.get(['inputText', 'rids'], ({ inputText, rids }) => {
        if (inputText) {
            ridInput.value = inputText;
        }
        if (rids && rids.length > 0) {
            updateSavedRidsDisplay(rids);
        }
    });

    // Сохраняем текст при каждом изменении
    ridInput.addEventListener('input', async () => {
        await chrome.storage.local.set({ inputText: ridInput.value });
    });

    function updateSavedRidsDisplay(rids) {
        if (rids && rids.length > 0) {
            savedRidsDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong>Сохраненные RID значения (${rids.length}):</strong>
                    <button class="action-button copy-rids">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                        </svg>
                        Копировать
                    </button>
                </div>
                ${rids.join('<br>')}
            `;

            // Добавляем обработчик для кнопки копирования
            const copyButton = savedRidsDiv.querySelector('.copy-rids');
            copyButton.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(rids.join('\n'));
                    copyButton.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Скопировано
                    `;
                    setTimeout(() => {
                        copyButton.innerHTML = `
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            </svg>
                            Копировать
                        `;
                    }, 2000);
                } catch (error) {
                    console.error('Ошибка при копировании:', error);
                }
            });
        } else {
            savedRidsDiv.innerHTML = 'Нет сохраненных RID значений';
        }
    }

    extractButton.addEventListener('click', async () => {
        const text = ridInput.value;
        const ridPattern = /"rid"\s*:\s*"?([^,"}\s]+)"?/g;
        const rids = [];
        let match;

        while ((match = ridPattern.exec(text)) !== null) {
            rids.push(match[1]);
        }

        await chrome.storage.local.set({ rids });
        updateSavedRidsDisplay(rids);
        
        // Создаем и показываем уведомление
        const notification = document.createElement('div');
        notification.className = 'notification-dialog';
        notification.innerHTML = `
            <div class="notification-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Оповещение расширения «SupportMate»
            </div>
            <div class="notification-content">
                Найдено ${rids.length} RID ${rids.length === 1 ? 'значение' : rids.length < 5 ? 'значения' : 'значений'}
            </div>
            <div class="notification-actions">
                <button class="notification-button">OK</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Добавляем обработчик для кнопки
        const okButton = notification.querySelector('.notification-button');
        okButton.addEventListener('click', () => {
            notification.remove();
        });
        
        // Автоматически скрываем уведомление через 3 секунды
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.remove();
            }
        }, 3000);
    });

    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const cancelProgress = document.getElementById('cancelProgress');

    cancelProgress.addEventListener('click', () => {
        shouldCancelInsertion = true;
        progressText.textContent = 'Отмена...';
    });

    insertButton.addEventListener('click', async () => {
        try {
            if (isInserting) {
                alert('Процесс вставки уже запущен');
                return;
            }

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                alert('Не удалось получить активную вкладку');
                return;
            }

            const { rids } = await chrome.storage.local.get('rids');
            
            if (!rids || rids.length === 0) {
                alert('Нет сохраненных RID значений');
                return;
            }

            isInserting = true;
            shouldCancelInsertion = false;
            
            // Улучшенное отображение прогресса
            progressContainer.classList.add('visible');
            progressBar.style.width = '0%';
            progressText.innerHTML = `
                <div class="progress-info">
                    <span class="progress-status">Подготовка к вставке...</span>
                    <span class="progress-numbers">0/${rids.length}</span>
                </div>
            `;
            
            // Добавляем время начала
            const startTime = Date.now();
            
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: async (ridsArray) => {
                    const inputs = document.querySelectorAll('input.input-element');
                    const input = Array.from(inputs).find(input => {
                        const prevLabel = input.previousElementSibling;
                        return prevLabel && prevLabel.textContent.toLowerCase().includes('rid');
                    }) || inputs[2];

                    if (!input) {
                        throw new Error('Не найдено поле для вставки RID значений');
                    }

                    let insertedCount = 0;
                    let errorCount = 0;
                    
                    for (const rid of ridsArray) {
                        // Проверяем флаг отмены
                        const shouldCancel = await new Promise(resolve => {
                            chrome.runtime.sendMessage({ type: 'checkCancellation' }, response => {
                                resolve(response.shouldCancel);
                            });
                        });

                        if (shouldCancel) {
                            throw new Error('Операция отменена пользователем');
                        }

                        try {
                            input.value = '';
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.value = rid;
                            
                            ['input', 'change'].forEach(eventName => {
                                input.dispatchEvent(new Event(eventName, { bubbles: true }));
                            });

                            const enterKeyEvents = [
                                new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }),
                                new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }),
                                new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })
                            ];

                            enterKeyEvents.forEach(event => input.dispatchEvent(event));
                            insertedCount++;
                        } catch (error) {
                            errorCount++;
                            console.error(`Ошибка при вставке RID ${rid}:`, error);
                        }

                        // Отправляем расширенную информацию о прогрессе
                        chrome.runtime.sendMessage({ 
                            type: 'updateProgress', 
                            progress: (insertedCount / ridsArray.length) * 100,
                            current: insertedCount,
                            total: ridsArray.length,
                            errors: errorCount,
                            currentRid: rid
                        });

                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    return { insertedCount, errorCount };
                },
                args: [rids]
            }).then(results => {
                const { insertedCount: current, errorCount: errors } = results[0].result;
                const total = rids.length;
                
                // Показываем итоговую статистику и сообщение о завершении
                const endTime = Date.now();
                const duration = Math.round((endTime - startTime) / 1000);
                
                progressText.innerHTML = `
                    <div class="progress-info">
                        <span class="progress-status">✅ Готово! Вставлено за ${duration} сек</span>
                        <span class="progress-numbers">${current}/${total} ${errors > 0 ? `(${errors} ошибок)` : ''}</span>
                    </div>
                    <div class="completion-message">
                        <p>Все RID успешно обработаны! 🎉</p>
                        <p>Не забудьте добавить:</p>
                        <ul>
                            <li>✔️ Ссылку на оплату</li>
                            <li>✔️ И конечно же ЛК</li>
                        </ul>
                        <p class="thank-you">SupportMate всегда на страже! 🛡️</p>
                        <p class="support-text">Ваш надёжный помощник в работе 💪</p>
                    </div>
                `;
                
                // Очищаем поле ввода и сохраненные RID
                ridInput.value = '';
                chrome.storage.local.remove(['inputText', 'rids']);
                
                // Увеличиваем время отображения до 40 секунд
                setTimeout(() => {
                    progressContainer.classList.remove('visible');
                    progressBar.style.width = '0%';
                    savedRidsDiv.innerHTML = 'Нет сохраненных RID значений';
                }, 40000); // 40 секунд
            });
        } catch (error) {
            console.error('Ошибка:', error);
            progressText.innerHTML = `
                <div class="progress-info">
                    <span class="progress-status error">Ошибка: ${error.message}</span>
                </div>
            `;
        } finally {
            isInserting = false;
        }
    });

    // Обработка сообщений о прогрессе
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'checkCancellation') {
            sendResponse({ shouldCancel: shouldCancelInsertion });
        } else if (message.type === 'updateProgress') {
            progressBar.style.width = `${message.progress}%`;
            
            // Расширенное отображение прогресса
            progressText.innerHTML = `
                <div class="progress-info">
                    <span class="progress-status">
                        Обработка: ${message.currentRid}
                        ${message.errors > 0 ? `<span class="error">(Ошибок: ${message.errors})</span>` : ''}
                    </span>
                    <span class="progress-numbers">${message.current}/${message.total}</span>
                </div>
            `;
        }
        return true;
    });

    // Функция для обновления счетчика результатов
    function updateResultsCount() {
        const visibleProblems = document.querySelectorAll('.problem-item[style*="display: block"]').length;
        document.getElementById('resultsCount').textContent = `Найдено: ${visibleProblems}`;
    }

    // Обработка сообщений об обновлениях
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'updateAvailable') {
            showUpdateNotification(message.version);
        }
        // ... existing message handling code ...
    });

    function showUpdateNotification(version) {
        const header = document.querySelector('.header');
        if (!header.querySelector('.update-notification')) {
            const notification = document.createElement('div');
            notification.className = 'update-notification';
            notification.innerHTML = `
                <span>Доступна новая версия ${version}</span>
                <button class="update-button">Обновить</button>
            `;
            header.appendChild(notification);

            notification.querySelector('.update-button').addEventListener('click', () => {
                chrome.runtime.requestUpdateCheck();
            });
        }
    }

    // Добавляем стили для уведомления об обновлении
    const style = document.createElement('style');
    style.textContent = `
        .update-notification {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 8px;
            background: #fef3c7;
            border-radius: 4px;
            font-size: 12px;
            color: #92400e;
        }

        .update-button {
            padding: 2px 8px;
            background: #f59e0b;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
        }

        .update-button:hover {
            background: #d97706;
        }
    `;
    document.head.appendChild(style);

    // Проверяем наличие обновления при открытии
    chrome.storage.local.get('updateInfo', ({ updateInfo }) => {
        if (updateInfo && updateInfo.showNotification) {
            const notification = document.getElementById('updateNotification');
            notification.style.display = 'block';
            notification.addEventListener('click', () => {
                chrome.tabs.create({ url: updateInfo.downloadUrl });
            });
        }
    });

    function showUpdateDialog(updateInfo) {
        const dialog = document.getElementById('updateDialog');
        const changes = document.getElementById('updateChanges');
        
        changes.textContent = updateInfo.changes || 'Доступна новая версия расширения';
        dialog.classList.add('visible');

        // Обработка кнопок
        document.getElementById('updateNow').addEventListener('click', () => {
            // Открываем ссылку на скачивание
            chrome.tabs.create({ url: updateInfo.downloadUrl });
            // Открываем страницу расширений
            chrome.tabs.create({ url: 'chrome://extensions/' });
            // Скрываем диалог
            dialog.classList.remove('visible');
        });

        document.getElementById('updateLater').addEventListener('click', () => {
            dialog.classList.remove('visible');
        });
    }

    // Инициализация обработчиков категорий и тегов
    document.addEventListener('DOMContentLoaded', () => {
        // Обработчики для категорий
        const categoryChips = document.querySelectorAll('.category-chip');
        categoryChips.forEach(chip => {
            chip.addEventListener('click', () => {
                // Убираем активный класс у всех категорий
                categoryChips.forEach(c => c.classList.remove('active'));
                // Добавляем активный класс выбранной категории
                chip.classList.add('active');
                
                const category = chip.dataset.category;
                filterProblems();
            });
        });

        // Обработчики для тегов
        const tagChips = document.querySelectorAll('.tag-chip');
        tagChips.forEach(chip => {
            chip.addEventListener('click', () => {
                chip.classList.toggle('active');
                filterProblems();
            });
        });
    });

    // Функция фильтрации проблем
    function filterProblems() {
        const activeCategory = document.querySelector('.category-chip.active').dataset.category;
        const activeTags = Array.from(document.querySelectorAll('.tag-chip.active')).map(tag => tag.dataset.tag);
        const searchQuery = document.getElementById('searchInput').value.toLowerCase();

        const problems = document.querySelectorAll('.problem-item');
        let visibleCount = 0;

        problems.forEach(problem => {
            const problemCategory = problem.dataset.category;
            const problemTags = (problem.dataset.tags || '').split(',');
            const problemText = problem.textContent.toLowerCase();

            const matchesCategory = activeCategory === 'all' || problemCategory === activeCategory;
            const matchesTags = activeTags.length === 0 || activeTags.every(tag => problemTags.includes(tag));
            const matchesSearch = !searchQuery || problemText.includes(searchQuery);

            if (matchesCategory && matchesTags && matchesSearch) {
                problem.style.display = '';
                visibleCount++;
            } else {
                problem.style.display = 'none';
            }
        });

        // Обновляем счетчик найденных проблем
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            resultsCount.textContent = `Найдено: ${visibleCount}`;
        }
    }

    // Обработчики для кнопок обновления
    const updateNowButton = document.getElementById('updateNow');
    const updateLaterButton = document.getElementById('updateLater');
    const updateDialog = document.getElementById('updateDialog');

    if (updateNowButton) {
        updateNowButton.addEventListener('click', () => {
            chrome.storage.local.get('updateInfo', ({ updateInfo }) => {
                if (updateInfo && updateInfo.downloadUrl) {
                    chrome.tabs.create({ url: updateInfo.downloadUrl });
                }
            });
        });
    }

    if (updateLaterButton) {
        updateLaterButton.addEventListener('click', () => {
            if (updateDialog) {
                updateDialog.classList.remove('visible');
            }
        });
    }

    // Обработчик для кнопки очистки поля ввода
    const clearInputButton = document.querySelector('.clear-input');
    
    if (clearInputButton && ridInput) {
        // Функция для обновления видимости кнопки очистки
        const updateClearButtonVisibility = () => {
            const hasText = ridInput.value && ridInput.value.trim().length > 0;
            clearInputButton.style.display = hasText ? 'flex' : 'none';
        };

        clearInputButton.addEventListener('click', () => {
            ridInput.value = '';
            ridInput.focus();
            updateClearButtonVisibility();
        });
        
        // Показываем/скрываем кнопку очистки при вводе
        ridInput.addEventListener('input', updateClearButtonVisibility);
        
        // Проверяем наличие текста при загрузке страницы
        updateClearButtonVisibility();
        
        // Обновляем видимость кнопки при получении фокуса
        ridInput.addEventListener('focus', updateClearButtonVisibility);
    }
});

// Функция для открытия страницы расширений
function openExtensionsPage() {
    chrome.tabs.create({ url: 'chrome://extensions' });
}

// При клике на кнопку обновления
document.getElementById('updateNow').addEventListener('click', function() {
    // Скачиваем новую версию
    chrome.downloads.download({
        url: updateInfo.downloadUrl,
        filename: 'RID-Helper.zip'
    }, () => {
        // Показываем уведомление
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Обновление загружено',
            message: 'Перейдите в chrome://extensions/ для установки обновления',
            buttons: [{ title: 'Открыть страницу расширений' }]
        });
    });
});

// Обработчик клика по уведомлению
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (buttonIndex === 0) {
        openExtensionsPage();
    }
});
