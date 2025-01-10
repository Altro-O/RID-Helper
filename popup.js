let db;
let currentFilter = '';
let isInserting = false;
let shouldCancelInsertion = false;

// Инициализация настроек
document.addEventListener('DOMContentLoaded', () => {
    const settingsButton = document.getElementById('settingsButton');
    const settingsPanel = document.querySelector('.settings-panel');
    const settingsClose = document.querySelector('.settings-close');

    if (settingsButton && settingsPanel && settingsClose) {
        settingsButton.addEventListener('click', () => {
            settingsPanel.classList.add('active');
        });

        settingsClose.addEventListener('click', () => {
            settingsPanel.classList.remove('active');
        });

        // Закрытие при клике вне панели
        document.addEventListener('click', (e) => {
            if (settingsPanel.classList.contains('active') && 
                !settingsPanel.contains(e.target) && 
                !settingsButton.contains(e.target)) {
                settingsPanel.classList.remove('active');
            }
        });
    }
});

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
            // Убираем активный класс со всех вкладок
            tabs.forEach(t => t.classList.remove('active'));
            // Добавляем активный класс текущей вкладке
            tab.classList.add('active');
            
            // Скрываем все контенты вкладок
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            // Показываем контент активной вкладки
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
        <strong>Сохраненные RID значения (${rids.length}):</strong><br>
        ${rids.join('<br>')}
      `;
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
    alert(`Найдено ${rids.length} RID значений`);
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

// Функции для работы с настройками
function initializeSettings() {
    const settingsButton = document.getElementById('settingsButton');
    const settingsPanel = document.querySelector('.settings-panel');
    const settingsClose = document.querySelector('.settings-close');
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const fontFamilySelect = document.getElementById('fontFamilySelect');
    const boldText = document.getElementById('boldText');
    const italicText = document.getElementById('italicText');
    const windowSizeValue = document.getElementById('windowSizeValue');
    const resizeHandle = document.querySelector('.resize-handle');

    // Загружаем сохраненные настройки
    chrome.storage.local.get(['fontSize', 'fontFamily', 'textStyle', 'windowSize'], function(result) {
        // Размер текста
        if (result.fontSize) {
            updateFontSize(result.fontSize);
            fontSizeSlider.value = result.fontSize;
            fontSizeValue.textContent = `${result.fontSize}px`;
        }
        
        // Шрифт
        if (result.fontFamily) {
            fontFamilySelect.value = result.fontFamily;
            document.body.style.fontFamily = result.fontFamily;
        }

        // Стили текста
        if (result.textStyle) {
            boldText.checked = result.textStyle.includes('bold');
            italicText.checked = result.textStyle.includes('italic');
            updateTextStyle();
        }
        
        // Размер окна
        if (result.windowSize) {
            document.body.style.width = result.windowSize.width;
            document.body.style.height = result.windowSize.height;
            updateWindowSizeDisplay();
        }
    });

    // Обработчики для панели настроек
    settingsButton.addEventListener('click', () => {
        settingsPanel.classList.add('active');
    });

    settingsClose.addEventListener('click', () => {
        settingsPanel.classList.remove('active');
    });

    // Обработчик клика вне панели настроек
    document.addEventListener('click', (e) => {
        if (settingsPanel.classList.contains('active') && 
            !settingsPanel.contains(e.target) && 
            !settingsButton.contains(e.target)) {
            settingsPanel.classList.remove('active');
        }
    });

    // Обработчик изменения размера текста
    fontSizeSlider.addEventListener('input', (e) => {
        const size = e.target.value;
        updateFontSize(size);
        fontSizeValue.textContent = `${size}px`;
        chrome.storage.local.set({ fontSize: size });
    });

    // Обработчики стилей текста
    fontFamilySelect.addEventListener('change', (e) => {
        const fontFamily = e.target.value;
        document.body.style.fontFamily = fontFamily;
        chrome.storage.local.set({ fontFamily });
    });

    boldText.addEventListener('change', updateTextStyle);
    italicText.addEventListener('change', updateTextStyle);

    // Обработчик изменения размера окна
    let isResizing = false;
    let originalWidth;
    let originalHeight;
    let originalMouseX;
    let originalMouseY;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        originalWidth = document.body.offsetWidth;
        originalHeight = document.body.offsetHeight;
        originalMouseX = e.pageX;
        originalMouseY = e.pageY;
        
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
    });

    function handleResize(e) {
        if (!isResizing) return;

        const width = originalWidth + (e.pageX - originalMouseX);
        const height = originalHeight + (e.pageY - originalMouseY);

        const newWidth = Math.min(Math.max(width, 400), 800);
        const newHeight = Math.min(Math.max(height, 300), 800);

        document.body.style.width = `${newWidth}px`;
        document.body.style.height = `${newHeight}px`;

        updateWindowSizeDisplay();

        chrome.storage.local.set({
            windowSize: {
                width: `${newWidth}px`,
                height: `${newHeight}px`
            }
        });
    }

    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
    }

    function updateWindowSizeDisplay() {
        const width = document.body.offsetWidth;
        const height = document.body.offsetHeight;
        windowSizeValue.textContent = `${width} x ${height}`;
    }
}

// Функция обновления размера текста
function updateFontSize(size) {
    const elements = document.querySelectorAll('.problem-title, .problem-content, .problem-requirements, #ridInput');
    elements.forEach(element => {
        element.style.fontSize = `${size}px`;
    });
}

// Функция обновления стиля текста
function updateTextStyle() {
    const boldText = document.getElementById('boldText');
    const italicText = document.getElementById('italicText');
    const elements = document.querySelectorAll('.problem-title, .problem-content, .problem-requirements');
    
    const styles = [];
    if (boldText.checked) styles.push('bold');
    if (italicText.checked) styles.push('italic');

    elements.forEach(element => {
        element.style.fontWeight = boldText.checked ? 'bold' : 'normal';
        element.style.fontStyle = italicText.checked ? 'italic' : 'normal';
    });

    chrome.storage.local.set({ textStyle: styles });
}

// Инициализируем настройки при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initializeSettings();
});
})
