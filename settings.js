// Инициализация настроек
document.addEventListener('DOMContentLoaded', () => {
    initializeSettings();
    initializeTextStyles();
});

// Инициализация стилей текста
function initializeTextStyles() {
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const fontFamilySelect = document.getElementById('fontFamilySelect');
    const boldText = document.getElementById('boldText');
    const italicText = document.getElementById('italicText');

    // Функция обновления размера текста
    function updateFontSize(size) {
        const elements = document.querySelectorAll('*:not(html):not(script):not(style)');
        elements.forEach(element => {
            element.style.fontSize = `${size}px`;
        });
        fontSizeValue.textContent = `${size}px`;
        chrome.storage.local.set({ fontSize: size });
    }

    // Функция обновления стиля текста
    function updateTextStyle() {
        const elements = document.querySelectorAll('*:not(html):not(script):not(style)');
        const styles = [];
        
        if (boldText.checked) styles.push('bold');
        if (italicText.checked) styles.push('italic');

        elements.forEach(element => {
            element.style.fontWeight = boldText.checked ? 'bold' : 'normal';
            element.style.fontStyle = italicText.checked ? 'italic' : 'normal';
        });

        chrome.storage.local.set({ textStyle: styles });
    }

    // Обработчик изменения шрифта
    fontFamilySelect.addEventListener('change', (e) => {
        const fontFamily = e.target.value;
        const elements = document.querySelectorAll('*:not(html):not(script):not(style)');
        elements.forEach(element => {
            element.style.fontFamily = fontFamily;
        });
        chrome.storage.local.set({ fontFamily });
    });

    // Обработчик изменения размера текста
    fontSizeSlider.addEventListener('input', (e) => {
        const size = e.target.value;
        updateFontSize(size);
    });

    // Обработчики стилей текста
    boldText.addEventListener('change', updateTextStyle);
    italicText.addEventListener('change', updateTextStyle);

    // Загрузка сохраненных настроек текста
    chrome.storage.local.get(['fontSize', 'fontFamily', 'textStyle'], function(result) {
        if (result.fontSize) {
            updateFontSize(result.fontSize);
            fontSizeSlider.value = result.fontSize;
        }
        
        if (result.fontFamily) {
            fontFamilySelect.value = result.fontFamily;
            const elements = document.querySelectorAll('*:not(html):not(script):not(style)');
            elements.forEach(element => {
                element.style.fontFamily = result.fontFamily;
            });
        }

        if (result.textStyle) {
            boldText.checked = result.textStyle.includes('bold');
            italicText.checked = result.textStyle.includes('italic');
            updateTextStyle();
        }
    });
}

function initializeSettings() {
    const settingsButton = document.getElementById('settingsButton');
    const settingsPanel = document.querySelector('.settings-panel');
    const settingsClose = document.querySelector('.settings-close');
    const windowSizeValue = document.getElementById('windowSizeValue');
    const resizeHandle = document.querySelector('.resize-handle');

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

    // Инициализация настроек размера окна
    const presetButtons = document.querySelectorAll('.preset-button');
    const windowWidth = document.getElementById('windowWidth');
    const windowHeight = document.getElementById('windowHeight');
    const applyCustomSize = document.getElementById('applyCustomSize');

    // Функция для изменения размера окна
    function setWindowSize(width, height) {
        const newWidth = Math.min(Math.max(width, 400), 1200);
        const newHeight = Math.min(Math.max(height, 300), 2000);

        // Если высота больше 500px, открываем в отдельном окне
        if (newHeight > 500) {
            // Сохраняем размер перед открытием нового окна
            chrome.storage.local.set({
                windowSize: {
                    width: newWidth,
                    height: newHeight,
                    isDetached: true // Флаг для определения типа окна
                }
            }, () => {
                chrome.windows.create({
                    url: 'popup.html',
                    type: 'popup',
                    width: newWidth,
                    height: newHeight
                });
                window.close();
            });
            return;
        }

        // Для небольших размеров меняем размер popup
        document.documentElement.style.width = `${newWidth}px`;
        document.documentElement.style.height = `${newHeight}px`;
        document.body.style.width = `${newWidth}px`;
        document.body.style.height = `${newHeight}px`;

        // Сохраняем размер
        chrome.storage.local.set({
            windowSize: {
                width: newWidth,
                height: newHeight,
                isDetached: false
            }
        });

        adjustStyles(newWidth, newHeight);
    }

    // Функция для адаптации стилей под размер окна
    function adjustStyles(width, height) {
        // Увеличиваем базовый размер шрифта для больших окон
        const baseFontSize = height > 500 ? 16 : 14;
        document.documentElement.style.fontSize = `${baseFontSize}px`;

        // Настраиваем размеры контейнеров
        const contentWrapper = document.querySelector('.content-wrapper');
        if (contentWrapper) {
            contentWrapper.style.minHeight = `${height - 60}px`;
        }

        const resultsContainer = document.getElementById('resultsContainer');
        if (resultsContainer) {
            // Максимально увеличиваем размер контейнера для результатов
            resultsContainer.style.maxHeight = height > 500 ? 
                `${height - 140}px` : `${height - 160}px`;
            resultsContainer.style.overflowY = 'auto';
        }

        // Адаптируем размеры элементов интерфейса
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.style.fontSize = `${baseFontSize}px`;
            searchInput.style.padding = height > 500 ? 
                '12px 16px 12px 45px' : '8px 12px 8px 40px';
        }

        // Адаптируем размеры категорий и чипов
        const categoryChips = document.querySelectorAll('.category-chip');
        categoryChips.forEach(chip => {
            chip.style.fontSize = '12px';
            chip.style.padding = '3px 8px';
        });

        const tagChips = document.querySelectorAll('.tag-chip');
        tagChips.forEach(chip => {
            chip.style.fontSize = '12px';
            chip.style.padding = '2px 8px';
        });

        // Адаптируем размеры результатов поиска
        const problemTitles = document.querySelectorAll('.problem-title');
        problemTitles.forEach(title => {
            title.style.fontSize = `${baseFontSize + 1}px`;
            title.style.marginBottom = '6px';
            title.style.padding = '0 12px';
        });

        const problemContents = document.querySelectorAll('.problem-content');
        problemContents.forEach(content => {
            content.style.fontSize = `${baseFontSize}px`;
            content.style.lineHeight = '1.4';
            content.style.padding = '0 12px 12px';
        });

        // Обновляем размеры кнопок
        const buttons = document.querySelectorAll('button:not(.notification-button)');
        buttons.forEach(button => {
            button.style.fontSize = `${baseFontSize}px`;
            button.style.padding = height > 500 ? '10px 20px' : '6px 12px';
        });

        // Обновляем активную кнопку предустановки
        presetButtons.forEach(button => {
            const isActive = parseInt(button.dataset.width) === width && 
                           parseInt(button.dataset.height) === height;
            button.classList.toggle('active', isActive);
        });

        // Обновляем поля ввода размера
        if (windowWidth && windowHeight) {
            windowWidth.value = width;
            windowHeight.value = height;
        }

        // Обновляем отображение текущего размера
        if (windowSizeValue) {
            windowSizeValue.textContent = `${width} × ${height}`;
        }
    }

    // Обработчики для предустановленных размеров
    presetButtons.forEach(button => {
        button.addEventListener('click', () => {
            const width = parseInt(button.dataset.width);
            const height = parseInt(button.dataset.height);
            setWindowSize(width, height);
        });
    });

    // Обработчик для пользовательского размера
    if (applyCustomSize) {
        applyCustomSize.addEventListener('click', () => {
            const width = parseInt(windowWidth.value);
            const height = parseInt(windowHeight.value);

            if (isNaN(width) || isNaN(height)) {
                showNotification('Ошибка', 'Пожалуйста, введите корректные значения для ширины и высоты');
                return;
            }

            setWindowSize(width, height);
            showNotification('Успешно', 'Размер окна изменен');
        });
    }

    // Загружаем сохраненный размер
    chrome.storage.local.get('windowSize', function(result) {
        if (result.windowSize) {
            const { width, height, isDetached } = result.windowSize;
            if (!isNaN(width) && !isNaN(height)) {
                if (isDetached) {
                    // Если это отдельное окно, только адаптируем стили
                    adjustStyles(width, height);
                } else {
                    // Если это popup, применяем размер и стили
                    setWindowSize(width, height);
                }
            }
        } else {
            // Устанавливаем размер по умолчанию
            setWindowSize(450, 300);
        }
    });
}

// Функция для отображения уведомлений
function showNotification(title, message) {
    const notification = document.createElement('div');
    notification.className = 'notification-dialog';
    notification.innerHTML = `
        <div class="notification-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            ${title}
        </div>
        <div class="notification-content">
            ${message}
        </div>
        <div class="notification-actions">
            <button class="notification-button">OK</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    const okButton = notification.querySelector('.notification-button');
    okButton.addEventListener('click', () => {
        notification.remove();
    });
    
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.remove();
        }
    }, 3000);
} 