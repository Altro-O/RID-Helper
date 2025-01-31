const paymentErrors = {
    "3DSAuthError": {
        message: "Ошибка при проверке кода подтверждения.",
        description: "Пользователь не ввел или неверно ввел 3ds код",
        action: "Просить пользователя внимательно проверить данные - обратиться в банк. Запрашивать скриншоты при повторении"
    },
    "3DSAuthTimeout": {
        message: "Время на ввод данных истекло. Повторите попытку оплаты.",
        description: "Пользователь не прошел 3ds авторизацию",
        action: "Просить пользователя внимательно проверить данные - обратиться в банк. Запрашивать скриншоты при повторении"
    },
    "3DSConnectError": {
        message: "Банк, выпустивший карту не доступен. Попробуйте позднее.",
        description: "Это значит что банк эквайер не смог сходить в банк выпустивший карту, чтобы проверить 3ds. В 90% случаев из-за проблем на стороне бака выпустившего карту",
        action: "Реккомендуем обратиться в банк"
    },
    "3DSDecodingFailByEmitent": {
        message: "Отказ. Обратитесь в поддержку магазина.",
        description: "",
        action: "Реккомендуем обратиться в банк"
    },
    "BankNotAvailable": {
        message: "Отказ платежной системы. Попробуйте позднее",
        description: "",
        action: "Реккомендуем обратиться в банк"
    },
    "BankRoutingError": {
        message: "Отказ. Обратитесь в поддержку магазина.",
        description: "",
        action: "Реккомендуем обратиться в банк"
    },
    "BankSystemError": {
        message: "Отказ платежной системы. Попробуйте позднее",
        description: "",
        action: "Реккомендуем обратиться в банк"
    },
    "CannotSendRequest": {
        message: "Не удалось отправить запрос. Повторите попытку оплаты.",
        description: "",
        action: "Реккомендуем обратиться в банк"
    },
    "CardExpired": {
        message: "Проверьте введенные данные карты.",
        description: "",
        action: "Просить пользователя внимательно проверить данные - обратиться в банк. Запрашивать скриншоты при повторении"
    },
    "CardLimitError": {
        message: "Сумма покупки превышает допустимый лимит трат по карте.",
        description: "Количество разрешенных для использования средств на счете меньше, чем нужно для полной оплаты покупки. Этой ошибке сопоставляем только клиентские лимиты на сумму, когда именно клиент ограничил свои траты.",
        action: "Реккомендуем обратиться в банк"
    },
    "NotEnoughMoneyError": {
        message: "Карта заблокирована банком, выпустившим карту и будет удалена из личного кабинета автоматически.",
        description: "Самая распространенная ошибка, означает что количество доступных клиенту на счёте средств недостаточно, чтобы полностью оплатить покупку на сумму из запроса.",
        action: "Пользователь сможет оплатить только на следующий день. Обратиться в банк"
    },
    "CardSystemNotAvailable": {
        message: "Отказ платежной системы. Попробуйте позднее",
        description: "",
        action: "Просить пользователя повторить оплату позднее"
    },
    "ConnectionWithEmitentError": {
        message: "Банк, выпустивший карту не доступен. Попробуйте позднее.",
        description: "Эквайер не смог получить ответ от эмитента. Проблемы процессинга или конкретного банка",
        action: "Пробовать оплату позднее."
    },
    "DataInputError": {
        message: "Проверьте введенные данные карты.",
        description: "",
        action: "Просить пользователя внимательно проверить данные - обратиться в банк. Запрашивать скриншоты при повторении"
    },
    "DeclinedByAcquiringBlocked": {
        message: "Банк заблокировал операции по этой карте на несколько дней. Оплатите другим способом.",
        description: "",
        action: "Реккомендовать оплатить другой картой и обратиться в банк"
    },
    "DeclinedByAcquiringFraud": {
        message: "Платеж отклонен. Банк магазина временно заблокировал карту.",
        description: "Банк посчитал, что данная операция является мошеннической и отклонил её. В случае с РСБ блокировка сутки. Также они автоматически блокируют операции на большие суммы (500+ тысяч)",
        action: "Пользователь сможет оплатить только на следующий день."
    },
    "DeclinedByEminentInternetPaysNotAccepted": {
        message: "Интернет-транзакции для карты запрещены. Измените настройки в приложении вашего банка",
        description: "Пользователь заблокировал возможность онлайн оплат с данной карты",
        action: "Реккомендуем обратиться в банк"
    },
    "DeclinedByEminentInternetPaysNotAcceptedSber": {
        message: "Интернет-транзакции для карты запрещены. Измените настройки для карты в Сбербанк Онлайн",
        description: "Пользователь заблокировал возможность онлайн оплат с данной карты",
        action: "Реккомендуем обратиться в банк"
    },
    "DeclinedByEmitentError": {
        message: "Отказ банка, выпустившего карту.",
        description: "",
        action: "Реккомендуем обратиться в банк"
    },
    "DeclinedByEmitentFraud": {
        message: "Отказ банка, выпустившего карту.",
        description: "Банк посчитал, что данная операция является мошеннической и отклонил её.",
        action: "Пользователь сможет оплатить только на следующий день. Обратиться в банк"
    },
    "DeclinedbyEmitentTmpBlockAccOrCard": {
        message: "Попытка выполнить операцию, не разрешенную для конкретного эмитента или держателя карты.",
        description: "",
        action: "Реккомендуем обратиться в банк"
    },
    "EmitentCardsTurnedOff": {
        message: "Оплата картами вашего банка временно не доступна.",
        description: "",
        action: "Реккомендуем использовать другую карту."
    },
    "ErrSBPSubcriptionDisabled": {
        message: "Подписка отключена",
        description: "",
        action: "Реккомендуем обратиться в банк"
    },
    "FormatMessageError": {
        message: "Отказ. Обратитесь в поддержку магазина.",
        description: "",
        action: "Реккомендуем обратиться в банк"
    },
    "InternalServerError": {
        message: "Внутренняя ошибка сервера. Попробуйте позднее.",
        description: "",
        action: "Реккомендации согласно ошибке"
    },
    "NotAcceptableCountryCard": {
        message: "Карта не принадлежит списку разрешенных для оплаты стран",
        description: "Иностранная карта, Оплата такой картой не пройдет",
        action: "Реккомендуем использовать другую карту."
    },
    "NotAcceptableDontAddWBCard": {
        message: "Карта Вайлдберриз Банка будет добавлена в кабинет клиента автоматически через 10–15 минут после сообщения об успешном выпуске",
        description: "",
        action: ""
    },
    "NotAcceptableNoRubMir": {
        message: "Картой МИР нельзя проводить транзакции в валюте",
        description: "",
        action: "Реккомендации согласно ошибке"
    },
    "NotAcceptableRubNoRusEmitent": {
        message: "Невозможно оплатить в рублях с карты нероссийского банка эмитента",
        description: "",
        action: ""
    },
    "NotAcceptableSberKaz": {
        message: "Невозможно оплатить картой эмитента СберРК",
        description: "",
        action: ""
    },
    "NotAcceptableWithout3DS": {
        message: "Для проведения платежа требуется прохождение 3DS",
        description: "",
        action: "Реккомендации согласно ошибке"
    },
    "NotAcceptableWithoutCVC": {
        message: "Для оплаты этой картой, удалите ее в ЛК и привяжите заново",
        description: "",
        action: "Реккомендации согласно ошибке"
    },
    "NotAcceptableWithoutCVCBelcard": {
        message: "Для оплаты Белкартой, удалите ее в ЛК и привяжите заново",
        description: "Много карт которые привязывались без CVC из-за особенностей некоторых белорусских эмитентов.",
        action: "Реккомендации согласно ошибке"
    },
    "NotEnoughMoneyCardBlock": {
        message: "Карта заблокирована за множественные попытки списания",
        description: "Срабатывания связаны с множественными попытками списать деньги с карты, на которой их нет. Применяется блокировка карты, если больше 2 попыток списания на процессинге РБС на сутки.",
        action: "Пользователь сможет оплатить только на следующий день. Обратиться в банк"
    },
    "PaymentNotAvailable": {
        message: "Оплата этой картой сегодня более не доступна.",
        description: "",
        action: "Пользователь сможет оплатить только на следующий день."
    },
    "PaymentNotAvailableByAcquirer": {
        message: "Не удалось провести оплату. Повторите попытку позже.",
        description: "",
        action: "Просить пользователя повторить оплату позднее"
    },
    "QRRequestDeclined": {
        message: "QR-запрос отклонен. Попробуйте позднее.",
        description: "",
        action: "Просить пользователя повторить оплату позднее"
    },
    "QRRequestExpired": {
        message: "Истек срок действия QR кода",
        description: "Или пользователь не подтвердил оплату по QR или банк эмитент не передал данные по подтверждении эквайеру",
        action: "Просить пользователя повторить оплату позднее"
    },
    "ResponseTimeoutError": {
        message: "Запрос на оплату не завершился за отведенное время. Повторите попытку позднее.",
        description: "",
        action: "Реккомендации согласно ошибке"
    },
    "SberPayTokenTurnedOFF": {
        message: "Платеж не прошел. Удалите способ оплаты Sberpay в личном кабинете и привяжите заново.",
        description: "",
        action: "Реккомендации согласно ошибке"
    },
    "TooHighAmount": {
        message: "Запрещены операции на сумму больше 1 млн. со стороны платежной системы",
        description: "",
        action: ""
    },
    "TransactionConnectError": {
        message: "Отказ платежной системы проводить платеж. Повторите позднее, или обратитесь в банк выпустивший карту.",
        description: "",
        action: "Просить пользователя повторить оплату позднее"
    },
    "UnknownBank": {
        message: "Неизвестный банк",
        description: "",
        action: ""
    },
    "UnknownBankError": {
        message: "Неизвестная ошибка",
        description: "",
        action: ""
    },
    "VerificationTimeout": {
        message: "Время на ввод данных истекло. Повторите попытку оплаты.",
        description: "Пользователь не прошел 3ds авторизацию",
        action: "Реккомендации согласно ошибке"
    },
    "WBMonthCardLimit": {
        message: "Месячный лимит превышен. Для оплаты используйте другую карту.",
        description: "",
        action: "Реккомендации согласно ошибке"
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const errorSearchInput = document.getElementById('errorSearchInput');
    const errorResults = document.getElementById('errorResults');

    function searchErrors(query) {
        query = query.toLowerCase();
        const results = [];

        for (const [code, data] of Object.entries(paymentErrors)) {
            if (code.toLowerCase().includes(query) || 
                data.message.toLowerCase().includes(query) || 
                data.description.toLowerCase().includes(query)) {
                results.push({ code, ...data });
            }
        }

        return results;
    }

    function displayErrorResults(results) {
        errorResults.style.opacity = '0';
        
        setTimeout(() => {
            if (results.length === 0) {
                errorResults.innerHTML = `
                    <div class="error-item" style="text-align: center; padding: 32px;">
                        <div style="color: #5f6368; font-size: 14px;">
                            По вашему запросу ничего не найдено
                        </div>
                    </div>`;
            } else {
                errorResults.innerHTML = results.map(error => `
                    <div class="error-item">
                        <div class="error-code">${error.code}</div>
                        <div class="error-message">${error.message}</div>
                        ${error.description ? `
                            <div class="error-description">
                                ${error.description}
                            </div>
                        ` : ''}
                        <div class="error-action">
                            <strong>Рекомендации</strong>
                            ${error.action}
                        </div>
                    </div>
                `).join('');
            }
            
            errorResults.style.opacity = '1';
        }, 150);
    }

    let searchTimeout;
    errorSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = e.target.value.trim();
            const results = searchErrors(query);
            displayErrorResults(results);
        }, 300);
    });

    // Показываем все ошибки при открытии вкладки
    displayErrorResults(Object.entries(paymentErrors).map(([code, data]) => ({ code, ...data })));

    // Добавляем плейсхолдер с подсказкой
    errorSearchInput.placeholder = "Поиск по коду ошибки или описанию...";
}); 