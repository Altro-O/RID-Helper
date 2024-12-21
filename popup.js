document.addEventListener('DOMContentLoaded', function() {
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

  insertButton.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        alert('Не удалось получить активную вкладку');
        return;
      }

      // Получаем сохраненные RID значения
      const { rids } = await chrome.storage.local.get('rids');
      
      if (!rids || rids.length === 0) {
        alert('Нет сохраненных RID значений');
        return;
      }
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async (ridsArray) => {
          // Ищем все input поля
          const inputs = document.querySelectorAll('input.input-element');
          console.log('Найденные input поля:', inputs);

          // Ищем поле для RID
          const input = Array.from(inputs).find(input => {
            const prevLabel = input.previousElementSibling;
            return prevLabel && prevLabel.textContent.toLowerCase().includes('rid');
          }) || inputs[2];

          console.log('Искомое поле:', input);

          if (!input) {
            alert('Не найдено поле для вставки RID значений');
            return;
          }

          // Вставляем значения по одному
          for (const rid of ridsArray) {
            // Очищаем поле
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Вставляем одно значение
            input.value = rid;
            
            // Генерируем события для Angular
            ['input', 'change'].forEach(eventName => {
              const event = new Event(eventName, { bubbles: true });
              input.dispatchEvent(event);
            });

            // Симулируем полное нажатие Enter
            const enterKeyEvents = [
              new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                composed: true,
                cancelable: true
              }),
              new KeyboardEvent('keypress', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                composed: true,
                cancelable: true
              }),
              new KeyboardEvent('keyup', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                composed: true,
                cancelable: true
              })
            ];

            // Отправляем все события Enter
            enterKeyEvents.forEach(event => {
              input.dispatchEvent(event);
            });

            // Ждем между вставками
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        },
        args: [rids]
      });

      // После успешной вставки очищаем поле
      ridInput.value = '';
      await chrome.storage.local.remove('inputText');
      
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Произошла ошибка: ' + error.message);
    }
  });
}); 