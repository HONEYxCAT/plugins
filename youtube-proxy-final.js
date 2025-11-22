(function () {
    'use strict';

    var Utils = Lampa.Utils;
    var Player = Lampa.Player;
    var Storage = Lampa.Storage;

    // Список зеркал. 
    // Первым стоит inv.tux.pizza - он сейчас самый живой.
    var mirrors = [
        'inv.tux.pizza',
        'yewtu.be',
        'invidious.flokinet.to',
        'vid.puffyan.us',
        'invidious.projectsegfau.lt'
    ];

    function getMirror() {
        // Пытаемся получить индекс из хранилища
        var index = parseInt(Storage.get('yt_proxy_mirror_index', '0'));
        
        // Если индекс кривой или выходит за границы массива - сбрасываем на 0
        if (isNaN(index) || index < 0 || index >= mirrors.length) {
            index = 0;
            Storage.set('yt_proxy_mirror_index', 0);
        }
        
        // Возвращаем строго строку зеркала
        return mirrors[index];
    }

    function init() {
        var original_play = Player.play;

        Player.play = function(object) {
            // Проверяем URL на наличие youtube/youtu.be
            if (object.url && (object.url.indexOf('youtube.com') !== -1 || object.url.indexOf('youtu.be') !== -1)) {
                
                var mirror = getMirror();
                if(!mirror) mirror = mirrors[0]; // Защита от undefined

                var video_id = '';
                
                // Парсим ID видео
                try {
                    if (object.url.indexOf('v=') !== -1) {
                        video_id = object.url.split('v=')[1].split('&')[0];
                    } else if (object.url.indexOf('youtu.be/') !== -1) {
                        video_id = object.url.split('youtu.be/')[1].split('?')[0];
                    } else if (object.url.indexOf('embed/') !== -1) {
                        video_id = object.url.split('embed/')[1].split('?')[0];
                    }
                } catch(e) {
                    console.error('YouTube-Proxy', 'Error parsing ID', e);
                }

                if (video_id) {
                    // Формируем ссылку жестко через HTTPS
                    var new_url = 'https://' + mirror + '/embed/' + video_id + '?autoplay=1';
                    
                    console.log('YouTube-Proxy', 'FIXED Redirect:', new_url);

                    // Подменяем URL
                    object.url = new_url;
                    
                    // Очищаем маркеры, чтобы Lampa не думала, что это нативный YouTube
                    delete object.source;
                    delete object.player; 
                    // Ставим timeline null, чтобы не пытался синхронизировать позицию
                    object.timeline = null; 
                }
            }

            return original_play(object);
        };
        
        // На всякий случай перехват iframe для мест вне плеера
        var original_iframe = Utils.iframe;
        Utils.iframe = function(url) {
             if (url && (url.indexOf('youtube.com') !== -1 || url.indexOf('youtu.be') !== -1)) {
                 var mirror = getMirror();
                 var new_url = url.replace(/https?:\/\/(www\.|m\.)?youtube\.com/, 'https://' + mirror);
                 new_url = new_url.replace(/https?:\/\/youtu\.be/, 'https://' + mirror);
                 return original_iframe(new_url);
             }
             return original_iframe(url);
        }

        console.log('YouTube-Proxy', 'Final fix loaded');
    }

    if(!window.plugin_youtube_proxy_ready) {
        window.plugin_youtube_proxy_ready = true;
        init();
    }

})();
