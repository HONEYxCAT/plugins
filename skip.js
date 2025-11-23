(function () {
    'use strict';

    // Функция для внедрения сегментов в правильном формате Lampa
    function injectSegments(item) {
        if (!item || typeof item !== 'object') return;

        // Наш тестовый сегмент: с 10 по 60 секунду
        var segment = {
            start: 10,
            end: 60,
            name: 'TEST SKIP' // Текст, который покажет Lampa
        };

        // 1. Проверяем, есть ли объект segments, если нет или он не объект - создаем
        if (!item.segments || typeof item.segments !== 'object' || Array.isArray(item.segments)) {
            item.segments = {};
        }

        // 2. Проверяем, есть ли массив 'skip' внутри объекта, если нет - создаем
        if (!item.segments.skip || !Array.isArray(item.segments.skip)) {
            item.segments.skip = [];
        }

        // 3. Добавляем сегмент, если такого еще нет
        var exists = item.segments.skip.some(function(s) { 
            return s.name === segment.name && s.start === segment.start; 
        });
        
        if (!exists) {
            item.segments.skip.push(segment);
        }
        
        // Для отладки: добавим маркеры (иногда скины используют это поле)
        if(!item.markers) item.markers = [];
        item.markers.push(segment);
    }

    function startPlugin() {
        if (window.lampa_test_skip_native_fixed) return;
        window.lampa_test_skip_native_fixed = true;

        console.log('TestSkip: Запущен V6 (Correct Object Structure)');

        // Перехватываем Lampa.Player.play
        var originalPlay = Lampa.Player.play;
        Lampa.Player.play = function (data) {
            console.log('TestSkip: Hook PLAY', data);
            
            if (data) {
                injectSegments(data);

                // Если внутри есть плейлист, прописываем и туда
                if (data.playlist && Array.isArray(data.playlist)) {
                    data.playlist.forEach(injectSegments);
                }
            }

            return originalPlay.apply(this, arguments);
        };

        // Перехватываем Lampa.Player.playlist
        var originalPlaylist = Lampa.Player.playlist;
        Lampa.Player.playlist = function (data) {
            console.log('TestSkip: Hook PLAYLIST', data);
            
            if (Array.isArray(data)) {
                data.forEach(injectSegments);
            }
            
            return originalPlaylist.apply(this, arguments);
        };

        Lampa.Noty.show('TestSkip V6: Native Skip Ready');
    }

    if (window.Lampa && window.Lampa.Player) {
        startPlugin();
    } else {
        window.document.addEventListener('app_ready', startPlugin);
    }
})();
