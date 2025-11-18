(function () {
    'use strict';

    // Проверяем, загружена ли Lampa
    if (!window.Lampa) return;

    function RutubeTrailers() {
        var _this = this;

        // Инициализация плагина
        this.init = function () {
            // Слушаем событие открытия полного описания (карточки) фильма или сериала
            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite') {
                    // Ждем, пока элементы управления отрисуются
                    var check_buttons = setInterval(function() {
                        var buttons_container = e.view.find('.view--full-buttons'); // Контейнер кнопок
                        
                        if (buttons_container.length) {
                            clearInterval(check_buttons);
                            _this.appendButton(e, buttons_container);
                        }
                    }, 200);
                    
                    // Тайм-аут на случай, если кнопки не появятся (чтобы не висел интервал)
                    setTimeout(function() { clearInterval(check_buttons); }, 5000);
                }
            });
        };

        // Добавление кнопки
        this.appendButton = function (data, container) {
            // Проверяем, не добавлена ли уже кнопка, чтобы избежать дублей
            if (container.find('.button--rutube-trailer').length) return;

            var btn = $('<div class="view--full-button selector button--rutube-trailer">' +
                '<div class="view--full-button-icon">' +
                   // Простая иконка Play (можно заменить на SVG лого Rutube, если нужно)
                   '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5V19L19 12L8 5Z" fill="currentColor"/></svg>' +
                '</div>' +
                '<div class="view--full-button-text">Трейлер Rutube</div>' +
                '</div>');

            // Навешиваем событие клика
            btn.on('hover:enter', function () {
                _this.search(data.object);
            });

            // Пытаемся найти оригинальную кнопку трейлера, чтобы вставить под ней
            var youtube_btn = container.find('.button--trailer'); // Стандартный класс кнопки трейлера
            
            if (youtube_btn.length) {
                youtube_btn.after(btn);
            } else {
                // Если оригинальной кнопки нет, добавляем в конец списка
                container.append(btn);
            }
        };

        // Поиск видео на Rutube
        this.search = function (object) {
            Lampa.Loading.start(function () {
                Lampa.Loading.stop();
            });

            // Формируем запрос: Название фильма + год + слово "трейлер"
            // Очищаем название от лишних символов для лучшего поиска
            var query = encodeURIComponent((object.title_original || object.title) + ' ' + (object.year || '') + ' трейлер');
            var url = 'https://rutube.ru/api/search/video/?query=' + query;

            Lampa.Network.silent(url, function (json) {
                Lampa.Loading.stop();
                
                if (json && json.results && json.results.length) {
                    _this.showMenu(json.results);
                } else {
                    Lampa.Noty.show('Трейлеры на Rutube не найдены');
                }
            }, function () {
                Lampa.Loading.stop();
                Lampa.Noty.show('Ошибка поиска Rutube');
            });
        };

        // Отображение меню выбора
        this.showMenu = function (results) {
            var items = [];

            results.forEach(function (item) {
                // Фильтруем, чтобы не попадали совсем левые видео (опционально)
                items.push({
                    title: item.title,
                    subtitle: item.author ? item.author.name : '',
                    url: item.video_url,
                    thumbnail: item.thumbnail_url,
                    icon: item.thumbnail_url, // Используем превью видео как иконку
                    data: item
                });
            });

            Lampa.Select.show({
                title: 'Трейлеры Rutube',
                items: items,
                onSelect: function (a) {
                    _this.play(a);
                },
                onBack: function () {
                    Lampa.Controller.toggle('full');
                }
            });
        };

        // Запуск проигрывателя
        this.play = function (item) {
            // Rutube ссылки вида https://rutube.ru/video/ID/
            // Нам нужно вытащить ID, чтобы сделать embed ссылку
            var id_match = item.url.match(/\/video\/([a-zA-Z0-9]+)/);
            
            if (id_match && id_match[1]) {
                var embed_url = 'https://rutube.ru/play/embed/' + id_match[1];
                
                // Открываем во встроенном браузере Lampa (самый стабильный метод для всех ТВ)
                Lampa.Activity.push({
                    url: embed_url,
                    title: item.title,
                    component: 'browser_static', // Используем статический браузер для embed
                    page: 1
                });
            } else {
                Lampa.Noty.show('Не удалось получить ссылку на видео');
            }
        };
    }

    // Запускаем экземпляр плагина
    if(!window.plugin_rutube_trailers) {
        window.plugin_rutube_trailers = new RutubeTrailers();
        window.plugin_rutube_trailers.init();
        console.log('RutubeTrailers: Plugin loaded');
    }

})();
