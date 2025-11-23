(function () {
    'use strict';

    function startPlugin() {
        if (window.lampa_test_skip_inited) return;
        window.lampa_test_skip_inited = true;

        console.log('TestSkip: Плагин V2 запущен');

        var originalPlay = Lampa.Player.play;

        Lampa.Player.play = function (data) {
            console.log('TestSkip: Перехват запуска', data);

            if (data) {
                // Создаем тестовый сегмент: пропуск с 10 по 70 секунду
                var testSegment = {
                    start: 10,  
                    end: 70,    
                    name: '[ТЕСТ] Пропуск (10-70сек)' 
                };

                // Функция для добавления сегмента в конкретный объект
                var addSegment = function(item) {
                    if (!item) return;
                    
                    // Если сегментов нет - создаем, если есть - добавляем
                    if (!item.segments || !Array.isArray(item.segments)) {
                        item.segments = [testSegment];
                    } else {
                        // Проверяем, нет ли уже такого, чтобы не дублировать
                        var exists = item.segments.find(function(s){ return s.name === testSegment.name });
                        if(!exists) item.segments.push(testSegment);
                    }
                };

                // 1. Добавляем в корневой объект
                addSegment(data);

                // 2. ВАЖНО: Добавляем во все элементы плейлиста (если он есть)
                if (data.playlist && Array.isArray(data.playlist)) {
                    data.playlist.forEach(function(elem) {
                        addSegment(elem);
                    });
                    console.log('TestSkip: Добавлено в ' + data.playlist.length + ' элементов плейлиста');
                }
                
                console.log('TestSkip: Итоговые сегменты root:', data.segments);
            }

            return originalPlay.apply(Lampa.Player, arguments);
        };
        
        // Для отладки: слушаем событие обновления времени, чтобы понять, видит ли плеер сегменты
        Lampa.Player.listener.follow('timeupdate', function(e) {
            // Выведем в консоль только один раз при пересечении 10 секунд
            if(e.time > 10 && e.time < 11 && !window.test_skip_logged) {
                console.log('TestSkip: Время > 10с. Текущий объект плеера:', Lampa.Player.data());
                window.test_skip_logged = true;
            }
        });

        // Сброс флага логгера при новом запуске
        Lampa.Player.listener.follow('play', function() {
            window.test_skip_logged = false;
        });

        Lampa.Noty.show('TestSkip V2: Пропуск добавлен (10-70 сек)');
    }

    if (window.Lampa && window.Lampa.Player) {
        startPlugin();
    } else {
        window.document.addEventListener('app_ready', startPlugin);
    }

})();
