(function () {
    'use strict';

    function startPlugin() {
        // Проверяем, существует ли объект Timeline
        if (Lampa.Timeline && Lampa.Timeline.update) {
            
            // Сохраняем оригинальную функцию обновления
            var originalUpdate = Lampa.Timeline.update;

            // Переопределяем функцию update
            Lampa.Timeline.update = function (params) {
                
                // 1. Выполняем оригинальную логику (обновление UI, сохранение в localStorage и т.д.)
                originalUpdate(params);

                // 2. Добавляем логику принудительной отправки, если нет Премиума
                // Оригинальный код отправляет данные только если Account.hasPremium() == true.
                // Мы добавляем условие: если премиума нет, отправляем сами.
                
                // params.received означает, что данные пришли от другого устройства.
                // Мы не должны отправлять их обратно, иначе будет бесконечная петля.
                if (!params.received && !Lampa.Account.hasPremium()) {
                    // Принудительная отправка данных в сокет
                    Lampa.Socket.send('timeline', {
                        params: params
                    });
                    
                    console.log('Timeline Sync', 'Forced sync sent for: ' + params.hash);
                }
            };

            console.log('Timeline Sync', 'Plugin loaded successfully');
        } else {
            console.log('Timeline Sync', 'Lampa.Timeline not found');
        }
    }

    if (window.appready) startPlugin();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') startPlugin();
        });
    }
})();