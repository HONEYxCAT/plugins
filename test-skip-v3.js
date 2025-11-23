(function () {
    'use strict';

    // Функция, которая делает то же самое, что строки 753/774 в o.js
    // Добавляет массив segments в объект видео
    function addTestSegments(videoObject) {
        if (!videoObject || typeof videoObject !== 'object') return;

        // Определяем наш тестовый сегмент (пропуск с 10 по 60 секунду)
        var segment = {
            start: 10, // Начало кнопки (в секундах)
            end: 60,   // Конец пропуска (в секундах)
            name: 'TEST SKIP' // Текст на кнопке
        };

        // Если поле segments уже есть - оставляем его (чтобы не ломать реальные таймкоды, если они придут)
        // Если нет - создаем массив и кладем туда наш тест
        if (!videoObject.segments) {
            videoObject.segments = [segment];
        } else if (Array.isArray(videoObject.segments)) {
            // Проверяем, чтобы не добавлять дубликаты
            var hasTest = videoObject.segments.some(function(s) { return s.name === segment.name; });
            if (!hasTest) videoObject.segments.push(segment);
        }
    }

    function startPlugin() {
        if (window.lampa_test_skip_final) return;
        window.lampa_test_skip_final = true;

        console.log('TestSkip: Плагин запущен (Native Mode)');

        // 1. Перехватываем одиночный запуск (как строка 823 в o.js)
        var originalPlay = Lampa.Player.play;
        Lampa.Player.play = function (data) {
            // Добавляем сегменты в основной объект
            addTestSegments(data);

            // Если внутри объекта уже вложен плейлист (как в строке 792 o.js), обрабатываем и его
            if (data.playlist && Array.isArray(data.playlist)) {
                data.playlist.forEach(addTestSegments);
            }

            return originalPlay.apply(this, arguments);
        };

        // 2. Перехватываем загрузку плейлиста (как строка 824 в o.js)
        // Это критически важно, так как o.js вызывает это отдельно!
        var originalPlaylist = Lampa.Player.playlist;
        Lampa.Player.playlist = function (data) {
            if (Array.isArray(data)) {
                data.forEach(addTestSegments);
            }
            return originalPlaylist.apply(this, arguments);
        };

        Lampa.Noty.show('TestSkip: Сегменты [10-60с] внедрены');
    }

    if (window.Lampa && window.Lampa.Player) {
        startPlugin();
    } else {
        window.document.addEventListener('app_ready', startPlugin);
    }
})();
