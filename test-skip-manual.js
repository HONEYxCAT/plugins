(function () {
    'use strict';

    var skipButton = null;
    var skipSegment = { start: 10, end: 60 }; // Настройки времени (сек)

    function createButton() {
        // Создаем кнопку, используя стили Лампы, чтобы она выглядела "родной"
        var btn = $('<div class="skip-button selector" style="position: absolute; bottom: 6em; left: 3em; z-index: 9999; background: rgba(255, 255, 255, 0.15); border: 2px solid rgba(255, 255, 255, 0.3); padding: 0.6em 1.5em; border-radius: 3em; color: #fff; font-size: 1.3em; display: none; transition: transform 0.2s;">Пропустить (Тест V5)</div>');
        
        // Эффект наведения (фокус пультом)
        btn.on('hover:enter', function() {
            doSkip();
        });
        
        btn.on('hover:focus', function() {
            btn.css('background', 'rgba(255, 255, 255, 0.3)');
            btn.css('transform', 'scale(1.1)');
        });

        btn.on('hover:blur', function() {
            btn.css('background', 'rgba(255, 255, 255, 0.15)');
            btn.css('transform', 'scale(1)');
        });

        // Клик мышкой/тач
        btn.on('click', function() {
            doSkip();
        });

        return btn;
    }

    function doSkip() {
        Lampa.Player.seek(skipSegment.end); // Прыгаем в конец сегмента
        Lampa.Noty.show('Пропущено плагином V5');
    }

    function startPlugin() {
        if (window.lampa_test_skip_manual) return;
        window.lampa_test_skip_manual = true;

        console.log('TestSkip: Запущен ручной режим (V5)');

        // Слушаем события плеера
        Lampa.Player.listener.follow('play', function() {
            // При старте видео удаляем старую кнопку если была и создаем новую
            if (skipButton) skipButton.remove();
            skipButton = createButton();
            
            // Добавляем кнопку в слой плеера или в боди (самый надежный вариант)
            $('body').append(skipButton);
        });

        Lampa.Player.listener.follow('timeupdate', function(e) {
            if (!skipButton) return;

            // Проверяем время: если мы внутри диапазона
            if (e.time >= skipSegment.start && e.time < skipSegment.end) {
                if (skipButton.is(':hidden')) {
                    skipButton.show();
                    // Опционально: можно попробовать перевести фокус на кнопку, 
                    // но лучше не надоедать пользователю, если он не хочет.
                    console.log('TestSkip: Кнопка показана');
                }
            } else {
                if (skipButton.is(':visible')) {
                    skipButton.hide();
                }
            }
        });

        Lampa.Player.listener.follow('destroy', function() {
            // Удаляем кнопку при выходе из плеера
            if (skipButton) {
                skipButton.remove();
                skipButton = null;
            }
        });
        
        Lampa.Noty.show('TestSkip V5: Готов. Ждите 10-ю секунду.');
    }

    if (window.Lampa && window.Lampa.Player) {
        startPlugin();
    } else {
        window.document.addEventListener('app_ready', startPlugin);
    }
})();
