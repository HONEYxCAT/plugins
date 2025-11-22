(function () {
    'use strict';

    var Storage = Lampa.Storage;
    var Utils = Lampa.Utils;
    var Settings = Lampa.Settings;
    var Arrays = Lampa.Arrays;

    // Список зеркал Invidious (можно добавлять свои рабочие инстансы)
    var mirrors = [
        'yewtu.be',               // Нидерланды
        'invidious.flokinet.to',  // Румыния
        'inv.tux.pizza',          // США
        'invidious.projectsegfau.lt', // Литва
        'vid.puffyan.us'          // США
    ];

    function YouTubeMirror() {
        this.current = function () {
            // Берем сохраненное зеркало или первое из списка
            var last = Storage.get('youtube_proxy_mirror', mirrors[0]);
            
            // Если сохраненное зеркало есть в списке, используем его, иначе сбрасываем на первое
            if (mirrors.indexOf(last) > -1) {
                return last;
            } else {
                Storage.set('youtube_proxy_mirror', mirrors[0]);
                return mirrors[0];
            }
        };
        
        // Функция переключения на следующее зеркало (если текущее не грузит)
        this.next = function() {
            var current = this.current();
            var index = mirrors.indexOf(current);
            var nextIndex = (index + 1) % mirrors.length;
            var newMirror = mirrors[nextIndex];
            
            Storage.set('youtube_proxy_mirror', newMirror);
            console.log('YouTube-Proxy', 'Switched mirror to:', newMirror);
            Lampa.Noty.show('Зеркало YouTube изменено на: ' + newMirror);
        };
    }

    function init() {
        var YT = new YouTubeMirror();

        // Сохраняем оригинальную функцию создания iframe
        var original_iframe = Utils.iframe;

        // Переопределяем функцию iframe
        Utils.iframe = function (url) {
            // Проверяем, включен ли прокси в настройках
            if (Storage.field('proxy_youtube')) {
                // Проверяем, является ли ссылка ютубовской
                if (url && (url.indexOf('youtube.com') !== -1 || url.indexOf('youtu.be') !== -1)) {
                    
                    var mirror = YT.current();
                    
                    // Логика замены домена
                    // Обычно ссылка выглядит как https://www.youtube.com/embed/ID
                    var new_url = url.replace(/https?:\/\/(www\.)?youtube\.com/, Utils.protocol() + mirror);
                    new_url = new_url.replace(/https?:\/\/youtu\.be/, Utils.protocol() + mirror);
                    
                    console.log('YouTube-Proxy', 'Proxied:', new_url);
                    return original_iframe(new_url);
                }
            }
            // Если не YouTube или прокси выключен, возвращаем оригинал
            return original_iframe(url);
        };

        // Добавляем настройки
        Settings.listener.follow('open', function (e) {
            if (e.name == 'video') {
                var body = e.body;
                
                // Добавляем переключатель
                var item = Lampa.Template.get('settings_param', {
                    name: 'Проксирование YouTube',
                    component: 'proxy_youtube',
                    status: Storage.field('proxy_youtube') ? 'Включено' : 'Выключено',
                    description: 'Использовать Invidious зеркала для просмотра трейлеров'
                });

                // Добавляем выбор зеркала
                var item_mirror = Lampa.Template.get('settings_param', {
                    name: 'Зеркало YouTube',
                    status: YT.current(),
                    description: 'Нажмите для смены зеркала вручную',
                    component: 'youtube_mirror_select'
                });

                item.on('hover:enter', function () {
                    Storage.set('proxy_youtube', !Storage.field('proxy_youtube'));
                    item.find('.settings-param__status').text(Storage.field('proxy_youtube') ? 'Включено' : 'Выключено');
                    Lampa.Settings.update();
                });

                item_mirror.on('hover:enter', function () {
                   YT.next();
                   item_mirror.find('.settings-param__status').text(YT.current());
                });

                body.find('[data-parent="player"]').append(item);
                if(Storage.field('proxy_youtube')) body.find('[data-parent="player"]').append(item_mirror);
            }
        });

        // Инициализация дефолтного значения настройки
        if (Storage.get('proxy_youtube') === '') Storage.set('proxy_youtube', true);

        console.log('YouTube-Proxy', 'init');
        console.log('YouTube-Proxy', Storage.field('proxy_youtube') ? 'enabled' : 'disabled');
    }

    if(!window.plugin_youtube_proxy_ready) {
        window.plugin_youtube_proxy_ready = true;
        init();
    }

})();
