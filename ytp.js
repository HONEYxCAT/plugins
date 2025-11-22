(function () {
    'use strict';

    var Utils = Lampa.Utils;
    var Storage = Lampa.Storage;

    // Список зеркал Invidious
    // Можно менять порядок или добавлять новые. Используется первое рабочее из списка (по индексу).
    var mirrors = [
        'inv.tux.pizza',          // США (обычно быстрый)
        'yewtu.be',               // Нидерланды (стабильный)
        'invidious.flokinet.to',  // Румыния
        'vid.puffyan.us',         // США
        'invidious.projectsegfau.lt' // Литва
    ];

    // Функция получения текущего зеркала
    // Сохраняет индекс зеркала, чтобы не прыгать по ним каждый раз, но если нужно сменить - можно через консоль или очистку кеша
    function getCurrentMirror() {
        var index = Storage.get('yt_proxy_mirror_index', 0);
        if (index >= mirrors.length) index = 0;
        return mirrors[index];
    }

    function init() {
        // Сохраняем оригинальную функцию
        var original_iframe = Utils.iframe;

        // Переопределяем функцию создания iframe
        Utils.iframe = function (url) {
            // Если это YouTube
            if (url && (url.indexOf('youtube.com') !== -1 || url.indexOf('youtu.be') !== -1)) {
                
                var mirror = getCurrentMirror();
                
                // Замена домена на зеркало
                // Регулярка ловит www.youtube.com, youtube.com, m.youtube.com и youtu.be
                var new_url = url.replace(
                    /https?:\/\/(www\.|m\.)?youtube\.com/, 
                    Utils.protocol() + mirror
                );
                
                // Отдельная замена для коротких ссылок youtu.be
                new_url = new_url.replace(
                    /https?:\/\/youtu\.be/, 
                    Utils.protocol() + mirror
                );

                console.log('YouTube-Proxy', 'Redirected to:', new_url);
                
                // Вызываем оригинальную функцию уже с новой ссылкой
                return original_iframe(new_url);
            }

            // Если не YouTube, ничего не трогаем
            return original_iframe(url);
        };

        console.log('YouTube-Proxy', 'Enabled automatically');
    }

    if(!window.plugin_youtube_proxy_ready) {
        window.plugin_youtube_proxy_ready = true;
        init();
    }

})();
