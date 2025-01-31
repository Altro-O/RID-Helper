// Добавим логирование при загрузке скрипта
console.log('RID Helper content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Получено сообщение:', request);
  
  if (request.action === 'insertRids') {
    try {
      // Сразу отправляем ответ
      sendResponse({received: true});
      
      chrome.storage.local.get('rids', ({ rids }) => {
        console.log('Полученные RID значения:', rids);
        
        if (!rids || rids.length === 0) {
          alert('Нет сохраненных RID значений');
          return;
        }

        // Ищем поле ввода несколькими способами, учитывая Angular
        const input = document.querySelector('input[ng-model*="rid"]') || 
                     document.querySelector('input[formcontrolname*="rid"]') ||
                     document.querySelector('input[name*="rid"]') ||
                     Array.from(document.querySelectorAll('input')).find(input => {
                       const attrs = Array.from(input.attributes);
                       return attrs.some(attr => 
                         attr.name.toLowerCase().includes('rid') || 
                         attr.value.toLowerCase().includes('rid')
                       );
                     });

        console.log('Все input поля на странице:', document.querySelectorAll('input'));
        console.log('Найденное поле ввода:', input);
        
        if (!input) {
          alert('Не найдено поле для вставки RID значений');
          return;
        }

        // Вставляем значения и эмулируем события Angular
        input.value = rids.join(',');
        
        // Создаем и диспатчим все возможные события
        const events = ['input', 'change', 'blur', 'ngModelChange'];
        events.forEach(eventName => {
          const event = new Event(eventName, { bubbles: true, cancelable: true });
          input.dispatchEvent(event);
        });

        // Пытаемся обновить значение через Angular
        const angularElement = input.closest('[ng-model], [formControl], [formControlName]');
        if (angularElement) {
          const ngModel = angularElement.getAttribute('ng-model');
          const scope = angular.element(angularElement).scope();
          if (scope && ngModel) {
            scope.$apply(() => {
              scope.$eval(`${ngModel} = '${rids.join(',')}'`);
            });
          }
        }

        console.log('RID значения успешно вставлены');
      });
    } catch (error) {
      console.error('Ошибка при вставке RID значений:', error);
      alert('Произошла ошибка при вставке RID значений');
    }
  }

  if (request.action === 'extractRidsFromPage') {
    try {
      console.log('Ищем RID для transaction_id:', request.intId);
      
      // Получаем весь текст страницы
      const pageText = document.body.innerText;
      const lines = pageText.split('\n');
      
      // Ищем строку с нужным transaction_id
      const line = lines.find(line => line.includes(request.intId));
      console.log('Найдена строка:', line);
      
      if (!line) {
        console.log('Строка с transaction_id не найдена');
        sendResponse({ success: false, message: 'Transaction ID не найден' });
        return;
      }
      
      // Ищем все RID в строке
      const ridPattern = /"rid":"([^"]+)"/g;
      const rids = [];
      let match;
      
      while ((match = ridPattern.exec(line)) !== null) {
        rids.push(match[1]);
      }
      
      console.log('Найдены RID:', rids);
      
      // Сохраняем RID в storage и отправляем ответ
      chrome.storage.local.set({ rids }, () => {
        console.log('RID сохранены в storage');
        sendResponse({ 
          success: true, 
          message: `Найдено ${rids.length} RID значений`,
          rids: rids 
        });
      });
    } catch (error) {
      console.error('Ошибка при поиске RID:', error);
      sendResponse({ success: false, message: error.message });
    }
    return true;
  }

  return true;
}); 