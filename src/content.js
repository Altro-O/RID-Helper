// Слушаем сообщения от расширения
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'findTransaction') {
        const transaction = findTransactionInTable(request.transactionId);
        sendResponse(transaction);
    }
    return true; // Важно для асинхронного ответа
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