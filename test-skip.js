(function () {
    'use strict';

    function startPlugin() {
        // Проверяем, загружена ли Lampa
        if (window.lampa_test_skip_inited) return;
        window.lampa_test_skip_inited = true;

        console.log('TestSkip: Плагин запущен');

        // Сохраняем оригинальную функцию запуска плеера
        var originalPlay = Lampa.Player.play;

        // Переопределяем функцию запуска
        Lampa.Player.play = function (data) {
            console.log('TestSkip: Попытка запуска видео', data);

            // Проверяем, что объект данных существует
            if (data) {
                // Создаем наш тестовый сегмент (с 0 по 60 секунду)
                var testSegment = {
                    start: 0,   // Начало в секундах
                    end: 60,    // Конец в секундах
                    name: '[ТЕСТ] Пропуск интро' // Текст на кнопке
                };

                // Если массив сегментов уже есть (от источника), добавляем туда
                if (data.segments && Array.isArray(data.segments)) {
                    data.segments.push(testSegment);
                } 
                // Если сегментов нет, создаем новый массив
                else {
                    data.segments = [testSegment];
                }
                
                console.log('TestSkip: Сегмент добавлен', data.segments);
            }

            // Вызываем оригинальную функцию плеера с модифицированными данными
            return originalPlay.apply(Lampa.Player, arguments);
        };
        
        // Опционально: Добавляем настройки или иконку, чтобы знать что плагин работает
        Lampa.Noty.show('TestSkip плагин активирован. Интро 60с будет добавлено ко всем видео.');
    }

    // Запуск плагина (если Lampa уже готова или ждем события)
    if (window.Lampa && window.Lampa.Player) {
        startPlugin();
    } else {
        window.document.addEventListener('app_ready', startPlugin);
    }

})();
