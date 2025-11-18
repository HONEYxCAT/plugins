(function () {
    'use strict';

    // Метаданные плагина для менеджера плагинов
    function startPlugin() {
        var manifest = {
            type: 'video',
            version: '1.0.0',
            name: 'Rutube Trailers',
            description: 'Добавляет кнопку поиска трейлеров на Rutube в карточке фильма',
            component: 'rutube_trailers',
            author: 'Lampa Community'
        };

        // SVG иконка Rutube
        var icon = '<svg width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#fff"><path d="M20.6 12.7c0 4.6-3.8 8.4-8.4 8.4-4.7 0-8.4-3.8-8.4-8.4 0-4.7 3.8-8.4 8.4-8.4 4.7 0 8.4 3.8 8.4 8.4m-6.6-5c-.4-.2-.9.1-.9.6v8.9c0 .5.5.8.9.6l6.7-4.5c.4-.3.4-.9 0-1.2L14 7.7z"/></svg>';

        // Добавляем CSS стили
        Lampa.Utils.addStyle(
            '.rutube-trailer-btn { color: #fff; }' +
            '.rutube-player-frame { width: 100%; height: 100%; border: none; }' +
            '.rutube-modal { background: #000; }'
        );

        // Основной слушатель событий
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                var render = e.object.activity.render();
                var buttons_bar = render.find('.view--full__buttons');
                
                // Проверяем, есть ли блок кнопок
                if (buttons_bar.length) {
                    // Создаем кнопку
                    var btn = $('<div class="view--full__button selector rutube-trailer-btn layer--visible">' + icon + ' <span>Rutube трейлер</span></div>');
                    
                    // Добавляем анимацию нажатия
                    btn.on('hover:enter', function () {
                        // Логика при наведении (стандартная обрабатывается Lampa)
                    });

                    btn.on('hover:click', function () {
                        searchRutube(e.object.activity.card);
                    });

                    // Пытаемся вставить после кнопки "Трейлер" (YouTube), если она есть, иначе в конец
                    var original_trailer = buttons_bar.find('.view--full__button').filter(function() {
                        return $(this).text().toLowerCase().indexOf('трейлер') !== -1;
                    });

                    if (original_trailer.length) {
                        original_trailer.after(btn);
                    } else {
                        buttons_bar.append(btn);
                    }
                }
            }
        });

        // Функция поиска на Rutube
        function searchRutube(card) {
            Lampa.Loading.start(function () {
                Lampa.Loading.stop();
            });

            // Формируем запрос: Название + Год + слово "трейлер"
            var query = encodeURIComponent((card.title || card.name) + ' ' + ((card.release_date || card.first_air_date || '').substr(0, 4)) + ' трейлер');
            var url = 'https://rutube.ru/api/search/video/?query=' + query;

            Lampa.Network.silent(url, function (response) {
                Lampa.Loading.stop();

                if (response && response.results && response.results.length > 0) {
                    showResults(response.results);
                } else {
                    Lampa.Noty.show('На Rutube ничего не найдено');
                }
            }, function (a, c) {
                Lampa.Loading.stop();
                Lampa.Noty.show('Ошибка сети при запросе к Rutube');
            });
        }

        // Показ списка результатов
        function showResults(items) {
            var menu = [];

            items.forEach(function (item) {
                // Фильтруем, чтобы не попадал совсем мусор, проверяем наличие картинки и названия
                if(item.title && item.video_url){
                    menu.push({
                        title: item.title,
                        subtitle: item.author ? item.author.name : '',
                        url: item.video_url, // Ссылка на страницу видео
                        id: item.id, // ID видео
                        thumbnail: item.thumbnail_url,
                        duration: item.duration
                    });
                }
            });

            Lampa.Select.show({
                title: 'Трейлеры Rutube',
                items: menu,
                onSelect: function (a) {
                    playRutube(a.id);
                },
                onBack: function () {
                    Lampa.Controller.toggle('full');
                }
            });
        }

        // Воспроизведение (через Iframe в модальном окне)
        function playRutube(videoId) {
            // Используем embed ссылку
            var embedUrl = 'https://rutube.ru/play/embed/' + videoId;
            
            var html = $('<div class="rutube-modal"><iframe class="rutube-player-frame" src="' + embedUrl + '" allow="autoplay; encrypted-media; fullscreen; picture-in-picture;" allowfullscreen></iframe></div>');
            
            Lampa.Modal.open({
                title: '',
                html: html,
                size: 'full',
                mask: true,
                onBack: function() {
                    Lampa.Modal.close();
                    Lampa.Controller.toggle('full');
                }
            });
            
            // Хак для фокуса на модальном окне, чтобы работала кнопка Назад
            // В Lampa управление перехватывается Controller
            // Мы временно переключаем управление на модалку
        }
    }

    if (window.Lampa) {
        startPlugin();
    } else {
        // Если Lampa еще не загружена, ждем
        var checkLampa = setInterval(function () {
            if (window.Lampa) {
                clearInterval(checkLampa);
                startPlugin();
            }
        }, 200);
    }

})();
