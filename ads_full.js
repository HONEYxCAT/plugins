(function () {
    console.log("Расширенная блокировка рекламы (Lampa + DOM Proxy) активирована");

    // ----------------------------------------------------------------
    // ЧАСТЬ 1: Логика для Lampa (Убирает всплывающее окно полностью)
    // ----------------------------------------------------------------
    
    function initLampaHook() {
        if (window.Lampa && Lampa.Player && Lampa.Player.play) {
            // Сохраняем оригинальную функцию воспроизведения
            var originalPlay = Lampa.Player.play;

            // Переопределяем функцию воспроизведения
            Lampa.Player.play = function (object) {
                console.log("Lampa Player: попытка воспроизведения, применяем патч...");

                // 1. Ставим флаг IPTV.
                // Внутренняя логика Лампы проверяет: if (object.iptv) { не показывать рекламу }
                object.iptv = true;

                // 2. На всякий случай удаляем параметры рекламы (VAST), если они есть
                if (object.vast_url) delete object.vast_url;
                if (object.vast_msg) delete object.vast_msg;
                
                // Вызываем оригинальный плеер с модифицированным объектом
                return originalPlay.apply(this, arguments);
            };
            console.log("Lampa Player успешно пропатчен: режим 'Fake IPTV' включен.");
        } else {
            // Если Лампа еще не загрузилась, пробуем через 500мс
            setTimeout(initLampaHook, 500);
        }
    }

    initLampaHook();

    // ----------------------------------------------------------------
    // ЧАСТЬ 2: Твой код (Брутфорс для Web-плееров)
    // Работает для встроенных плееров, которые не используют Lampa.Player
    // ----------------------------------------------------------------

    if (typeof document !== 'undefined') {
        document.createElement = new Proxy(document.createElement, {
            apply(target, thisArg, args) {
                // Перехватываем создание тега <video>
                if (args[0] === "video") {
                    // console.log("Перехватываем создание <video> (возможно реклама)");
                    
                    let fakeVideo = target.apply(thisArg, args);

                    // Перехватываем метод play
                    let originalVideoPlay = fakeVideo.play;
                    fakeVideo.play = function () {
                        // Простая эвристика: если видео короткое или имеет признаки рекламы
                        // (В данном жестком варианте блокируется всё, что создается динамически, 
                        // но основной плеер Лампы обычно уже создан в DOM, так что это безопасно для UI)
                        
                        // console.log("Блокировка воспроизведения в Proxy");
                        
                        // Эмулируем, что видео мгновенно закончилось
                        setTimeout(() => {
                            Object.defineProperty(fakeVideo, 'ended', { get: () => true });
                            fakeVideo.dispatchEvent(new Event("ended"));
                        }, 100);

                        // Можно вернуть промис, чтобы вызывающий код не падал с ошибкой
                        return Promise.resolve(); 
                    };

                    return fakeVideo;
                }
                return target.apply(thisArg, args);
            }
        });
    }

    // Функция полной очистки таймеров закомментирована, так как она ломает интерфейс Lampa
    // (часы, обновление контента, пинги сервера).
    /*
    function clearAdTimers() {
        let highestTimeout = setTimeout(() => {}, 0);
        for (let i = 0; i <= highestTimeout; i++) {
            clearTimeout(i);
            clearInterval(i);
        }
    }
    document.addEventListener("DOMContentLoaded", clearAdTimers);
    */

})();
