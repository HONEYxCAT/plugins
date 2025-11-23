(function () {
    'use strict';

    function startPlugin() {
        // Проверка, что ядро Лампы загружено
        if (!window.Lampa || !Lampa.TimeTable || !Lampa.Storage) return;

        console.log('[SeasonFix] Плагин синхронизации сезонов запущен');

        // Сохраняем оригинальную функцию получения данных
        const originalGet = Lampa.TimeTable.get;

        // Переопределяем функцию получения эпизодов
        Lampa.TimeTable.get = function (card, callback) {
            // Нас интересуют только сериалы (у них есть original_name)
            if (card.original_name) {
                
                // 1. Ищем этот сериал в кеше "Расписания" (TimeTable)
                // Это то место, где Лампа хранит "текущий выбранный сезон"
                let timetableItem = Lampa.TimeTable.all().find(i => i.id == card.id);

                // 2. Ищем данные в "Истории последнего просмотра"
                // Это специальный кеш Лампы, который помнит: "В сериале Декстер юзер остановился на S1 E5"
                // Ключ генерируется из оригинального названия
                let titleHash = Lampa.Utils.hash(card.original_name);
                let lastWatched = Lampa.Storage.get('online_watched_last', {})[titleHash];

                // 3. Сравниваем и чиним
                if (timetableItem && lastWatched && lastWatched.season) {
                    let cachedSeason = parseInt(timetableItem.season);
                    let actualSeason = parseInt(lastWatched.season);

                    // Если в памяти висит 3-й сезон, а вы реально смотрели 1-й
                    if (cachedSeason !== actualSeason) {
                        console.log('[SeasonFix] Обнаружен рассинхрон сезонов!', 
                            `Сериал: ${card.title}`, 
                            `В памяти: ${cachedSeason}`, 
                            `Реально: ${actualSeason}`
                        );

                        // Принудительно меняем сезон на актуальный
                        timetableItem.season = actualSeason;
                        
                        // Очищаем список эпизодов в памяти, чтобы Лампа поняла, 
                        // что данные устарели, и скачала список для НУЖНОГО сезона заново
                        timetableItem.episodes = []; 

                        // Сохраняем исправленный объект обратно в LocalStorage, 
                        // чтобы при перезагрузке проблема не вернулась
                        Lampa.Storage.set('timetable', Lampa.TimeTable.all());
                        
                        console.log('[SeasonFix] Исправлено. Запрошен новый список серий.');
                    }
                }
            }

            // Вызываем оригинальную функцию Лампы, чтобы она продолжила работу
            return originalGet.apply(this, arguments);
        };
    }

    // Запуск плагина при старте Лампы
    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') startPlugin();
    });

})();
