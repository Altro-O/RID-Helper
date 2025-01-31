// Добавим логирование при загрузке скрипта
console.log('RID Helper content script loaded');

// Функция для ожидания появления элементов
async function waitForElement(selector, timeout = 5000) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            return elements;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Элементы ${selector} не найдены в течение ${timeout}мс`);
}

// Функция для определения индексов колонок
function findRidColumnIndexes() {
    const headers = Array.from(document.querySelectorAll('th[role="columnheader"]'));
    console.log('Найдены заголовки:', headers.map(h => h.textContent));
    
    let transactionIdIndex = -1;
    let metaRidsIndex = -1;
    
    // Ищем последнее вхождение нужных заголовков
    headers.forEach((header, index) => {
        const text = header.textContent.toLowerCase().replace(/\+$/, ''); // Убираем + в конце
        if (text === 'transaction_id') {
            transactionIdIndex = index;
        }
        if (text === 'meta_rids') {
            metaRidsIndex = index;
        }
    });
    
    console.log('Найдены финальные индексы:', { transactionIdIndex, metaRidsIndex });
    return {
        transactionId: transactionIdIndex,
        metaRids: metaRidsIndex
    };
}

// Слушаем сообщения от расширения
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Получено сообщение в content script:', request);

    if (request.action === 'findTransaction') {
        const transaction = findTransactionInTable(request.transactionId);
        sendResponse(transaction);
    }
    if (request.action === 'extractDataFromPage') {
        extractDataFromPage(request.url).then(sendResponse);
        return true;
    }
    if (request.action === 'extractRidsFromPage') {
        try {
            const transactionId = request.intId;
            console.log('Ищем RID для транзакции:', transactionId);
            
            // Ищем все строки на странице
            const pageText = document.body.innerText;
            
            // Ищем строку с нужным transaction_id
            const lines = pageText.split('\n');
            const targetLine = lines.find(line => line.includes(transactionId));
            
            if (!targetLine) {
                console.log('Строка с транзакцией не найдена');
                sendResponse({ 
                    success: true, 
                    rids: [],
                    message: 'RID значения не найдены'
                });
                return true;
            }
            
            console.log('Найдена строка:', targetLine);
            
            // Ищем все RID в строке
            const rids = new Set();
            const ridPattern = /"rid"\s*:\s*"([^"]+)"/g;
            let match;
            
            while ((match = ridPattern.exec(targetLine)) !== null) {
                const rid = match[1];
                console.log('Найден RID:', rid);
                rids.add(rid);
            }
            
            const uniqueRids = Array.from(rids);
            console.log('Найдены RID:', uniqueRids);
            
            // Сохраняем RID в storage перед отправкой ответа
            chrome.storage.local.set({ rids: uniqueRids }, () => {
                console.log('RID сохранены в storage');
                // Отправляем ответ
                sendResponse({ 
                    success: true, 
                    rids: uniqueRids,
                    message: uniqueRids.length > 0 ? 
                        `Найдено ${uniqueRids.length} RID значений` : 
                        'RID значения не найдены'
                });
            });
            
            return true; // Важно для асинхронного ответа
        } catch (error) {
            console.error('Ошибка при извлечении RID:', error);
            sendResponse({ 
                success: false, 
                error: error.message 
            });
            return true;
        }
    }
    return true;
});

function findTransactionInTable(transactionId) {
    try {
        console.log('Ищем транзакцию:', transactionId);
        
        // Получаем индексы колонок
        const columnIndexes = findColumnIndexes();
        
        // Ищем все строки в таблице
        const rows = document.querySelectorAll('[role="row"]');
        console.log('Найдено строк:', rows.length);

        for (const row of rows) {
            const cells = row.querySelectorAll('[role="cell"]');
            if (cells.length === 0) continue;

            const rowTransactionId = cells[columnIndexes.intTransaction]?.textContent.trim();

            if (rowTransactionId === transactionId) {
                console.log('Найдена транзакция в строке:', row);
                
                // Определяем тип операции
                const operationType = cells[columnIndexes.operationType]?.textContent.trim().toLowerCase() || '';
                // Проверяем точное совпадение с 'payback', а не includes
                const isPayback = operationType === 'payback';
                
                console.log('Значения ячеек:', {
                    'rrn': cells[columnIndexes.rrn]?.textContent.trim(),
                    'amount': cells[columnIndexes.amount]?.textContent.trim(),
                    'date': cells[columnIndexes.date]?.textContent.trim(),
                    'card_mask': cells[columnIndexes.cardMask]?.textContent.trim(),
                    'operation_type': operationType
                });
                
                // Получаем данные из нужных колонок
                const data = {
                    found: true,
                    isPayback,
                    data: {
                        rrn: cells[columnIndexes.rrn]?.textContent.trim() || '',
                        amount: cells[columnIndexes.amount]?.textContent.trim() || '',
                        date: cells[columnIndexes.date]?.textContent.trim() || '',
                        cardLast4: (cells[columnIndexes.cardMask]?.textContent.trim().match(/\d{4}$/) || [''])[0],
                        operationType: operationType
                    }
                };
                
                return data;
            }
        }
        
        return { found: false };
    } catch (error) {
        console.error('Ошибка при поиске транзакции:', error);
        return { found: false, error: error.message };
    }
}

function findColumnIndexes() {
    const headers = document.querySelectorAll('[role="columnheader"]');
    const indexes = {};
    
    headers.forEach((header, index) => {
        // Удаляем символ + и лишние пробелы
        const headerText = header.textContent.trim().toLowerCase().replace('+', '');
        console.log(`Заголовок [${index}]:`, headerText);
        
        switch(headerText) {
            case 'int_transaction':
                indexes.intTransaction = index;
                break;
            case 'rrn':
                indexes.rrn = index;
                break;
            case 'amount/100':
            case 'bill': // Добавляем альтернативное название для суммы
                indexes.amount = index;
                break;
            case 'date':
                indexes.date = index;
                break;
            case 'card_mask':
                indexes.cardMask = index;
                break;
            case 'operation_type':
            case 'type':
            case 'тип операции':
            case 'тип':
                indexes.operationType = index;
                break;
        }
    });

    console.log('Найденные индексы:', {
        'int_transaction': indexes.intTransaction,
        'rrn': indexes.rrn,
        'amount': indexes.amount,
        'date': indexes.date,
        'card_mask': indexes.cardMask,
        'operation_type': indexes.operationType
    });

    return indexes;
} 