(function () {
    'use strict';

    // Функция для внедрения сегментов в любой объект видео
    function injectSegments(item) {
        if (!item || typeof item !== 'object') return;

        // Наш тестовый сегмент: с 10 по 60 секунду
        var segment = {
            start: 10, 
            end: 60,   
            name: 'TEST SKIP' // Надпись на кнопке
        };

        // Если массив segments уже есть, проверяем, нет ли там уже такого
        if (item.segments && Array.isArray(item.segments)) {
            var exists = item.segments.some(function(s) { return s.name === segment.name; });
            if (!exists) item.segments.push(segment);
        } 
        // Если нет - создаем
        else {
            item.segments = [segment];
        }
        
        // На всякий случай добавим markers (для отображения на таймлайне в некоторых скинах)
        if(!item.markers) item.markers = [];
        item.markers.push(segment);
    }

    function startPlugin() {
        if (window.lampa_test_skip_native) return;
        window.lampa_test_skip_native = true;

        console.log('TestSkip: Запущен нативный режим (Hook Play + Playlist)');

        // 1. Перехватываем Lampa.Player.play
        // Это срабатывает, когда o.js вызывает play(element)
        var originalPlay = Lampa.Player.play;
        Lampa.Player.play = function (data) {
            console.log('TestSkip: Hook PLAY', data);
            
            // Внедряем в основной объект
            injectSegments(data);

            // Если внутри уже лежит плейлист, внедряем и туда
            if (data.playlist && Array.isArray(data.playlist)) {
                data.playlist.forEach(injectSegments);
            }

            return originalPlay.apply(this, arguments);
        };

        // 2. Перехватываем Lampa.Player.playlist
        // Это КРИТИЧНО, так как o.js вызывает это сразу после play(), обновляя данные
        var originalPlaylist = Lampa.Player.playlist;
        Lampa.Player.playlist = function (data) {
            console.log('TestSkip: Hook PLAYLIST', data);
            
            if (Array.isArray(data)) {
                // Проходимся по всем элементам плейлиста и добавляем сегменты
                data.forEach(injectSegments);
            }
            
            return originalPlaylist.apply(this, arguments);
        };

        Lampa.Noty.show('TestSkip: Сегменты (10-60с) внедрены');
    }

    if (window.Lampa && window.Lampa.Player) {
        startPlugin();
    } else {
        window.document.addEventListener('app_ready', startPlugin);
    }
})();
