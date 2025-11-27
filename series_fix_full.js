(function () {
    'use strict';

    var SUPER_FIX = {
        id: "fix_timetable_viewer",
        
        init: function() {
            // Ждем пока Лампа полностью загрузит модули, чтобы их перехватить
            if (window.appready) this.hook();
            else {
                Lampa.Listener.follow('app', (e) => {
                    if (e.type == 'ready') this.hook();
                });
            }
        },

        hook: function() {
            var _this = this;
            
            console.log('✅ [SeasonFix] Перехватчик установлен');

            // 1. Перехватчик главной базы данных в оперативной памяти.
            // Мы подменяем метод, который Лампа использует, чтобы "вспомнить" серию.
            if (Lampa.TimeTable) {
                var originalGet = Lampa.TimeTable.get;
                
                Lampa.TimeTable.get = function(card) {
                    // Получаем, что хочет отдать Лампа
                    var result = originalGet.apply(this, arguments);
                    
                    // Если Лампа отдает данные и сезон больше 1
                    if (result && result.season > 1) {
                         // Формируем ID для проверки
                         // Нам нужно понять, реально ли мы это смотрели
                         // Лампа считает процент просмотра по Хэшу. Проверим его.
                         
                         // Создаем хэш для ТЕКУЩЕГО (предлагаемого лампой) сезона и серии
                         var hash = Lampa.Utils.hash([
                             result.season, 
                             result.season > 10 ? ':' : '', 
                             result.episode, 
                             (card.original_title || card.name)
                         ].join(''));
                         
                         // Смотрим в таймлайн
                         var viewed = Lampa.Timeline.view(hash);
                         
                         // ЕСЛИ ПРОЦЕНТ ПРОСМОТРА 0 (или undefined) — ЗНАЧИТ ЭТО БАГ "ПОСЛЕДНЕЙ СЕРИИ"
                         if (!viewed || !viewed.percent) {
                             // На лету меняем данные, которые уйдут в интерфейс
                             // Клонируем объект, чтобы не менять базу, а только то, что увидит карточка
                             var fixed_result = JSON.parse(JSON.stringify(result));
                             
                             fixed_result.season = 1;
                             fixed_result.episode = 1;
                             fixed_result.episodes = []; // Очищаем эпизоды, чтобы не показывало 150-ю серию в 1 сезоне
                             
                             // Агрессивно удаляем из кэша IndexedDB (как в твоем рабочем скрипте)
                             if(Lampa.Cache && Lampa.Cache.deleteData) {
                                 Lampa.Cache.deleteData('timetable', card.id);
                             }
                             
                             // Также сбрасываем запись в оперативной памяти, чтобы при следующем клике 
                             // парсер опять не нагадил
                             result.season = 1; 
                             result.episode = 1;

                             return fixed_result;
                         }
                    }
                    
                    return result;
                };
            } else {
                setTimeout(function(){ _this.hook() }, 500);
            }
        }
    };

    if (!window.super_fix_loaded) {
        window.super_fix_loaded = true;
        SUPER_FIX.init();
    }

})();
