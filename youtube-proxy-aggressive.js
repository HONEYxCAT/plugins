(function () {
    'use strict';

    var Utils = Lampa.Utils;
    var Player = Lampa.Player;
    var Storage = Lampa.Storage;

    // Список зеркал Invidious
    var mirrors = [
        'inv.tux.pizza',          // США
        'yewtu.be',               // Нидерланды
        'invidious.flokinet.to',  // Румыния
        'vid.puffyan.us',         // США
        'invidious.projectsegfau.lt' // Литва
    ];

    function getCurrentMirror() {
        var index = Storage.get('yt_proxy_mirror_index', 0);
        if (index >= mirrors.length) index = 0;
        return mirrors[index];
    }

    function init() {
        // 1. Перехватываем основной запуск плеера
        var original_play = Player.play;

        Player.play = function(object) {
            // Проверяем, есть ли ссылка и ведет ли она на YouTube
            if (object.url && (object.url.indexOf('youtube.com') !== -1 || object.url.indexOf('youtu.be') !== -1)) {
                
                var mirror = getCurrentMirror();
                var new_url = object.url;

                // Извлекаем ID видео
                var video_id = '';
                
                // Вариант 1: youtube.com/watch?v=ID
                var match_v = object.url.match(/[?&]v=([^&]+)/);
                if (match_v) {
                    video_id = match_v[1];
                } 
                // Вариант 2: youtu.be/ID
                else if (object.url.indexOf('youtu.be/') !== -1) {
                    video_id = object.url.split('youtu.be/')[1].split('?')[0];
                }
                // Вариант 3: embed/ID
                else if (object.url.indexOf('embed/') !== -1) {
                    video_id = object.url.split('embed/')[1].split('?')[0];
                }

                if (video_id) {
                    // Формируем ссылку на embed-плеер зеркала
                    // Добавляем autoplay=1, чтобы видео стартовало сразу
                    new_url = Utils.protocol() + mirror + '/embed/' + video_id + '?autoplay=1';
                    
                    console.log('YouTube-Proxy', 'Intercepted Player.play. Original:', object.url);
                    console.log('YouTube-Proxy', 'Redirected to:', new_url);

                    // Подменяем URL в объекте, который идет в плеер
                    object.url = new_url;
                    
                    // ВАЖНО: Если Lampa успела пометить это как YouTube, убираем метку,
                    // чтобы она открыла это как обычный Iframe
                    if(object.source === 'youtube') delete object.source;
                }
            }

            // Запускаем оригинальный плеер с уже подмененной ссылкой
            return original_play(object);
        };

        // 2. На всякий случай оставляем перехват Utils.iframe для других мест
        var original_iframe = Utils.iframe;
        Utils.iframe = function (url) {
            if (url && (url.indexOf('youtube.com') !== -1 || url.indexOf('youtu.be') !== -1)) {
                var mirror = getCurrentMirror();
                // Простая замена домена для iframe
                var new_url = url.replace(/https?:\/\/(www\.|m\.)?youtube\.com/, Utils.protocol() + mirror);
                new_url = new_url.replace(/https?:\/\/youtu\.be/, Utils.protocol() + mirror);
                
                console.log('YouTube-Proxy', 'Intercepted Utils.iframe:', new_url);
                return original_iframe(new_url);
            }
            return original_iframe(url);
        };

        console.log('YouTube-Proxy', 'Aggressive mode enabled');
    }

    if(!window.plugin_youtube_proxy_ready) {
        window.plugin_youtube_proxy_ready = true;
        init();
    }

})();
