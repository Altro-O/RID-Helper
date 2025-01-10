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
  return true;
}); 