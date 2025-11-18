(function () {
    'use strict';

    function startPlugin() {
        // Манифест плагина
        var manifest = {
            type: 'video',
            version: '1.1.0',
            name: 'Rutube Trailers Fixed',
            description: 'Трейлеры с Rutube (CORS fix)',
            component: 'rutube_trailers_mod',
            author: 'Lampa Community'
        };

        // Иконка Rutube
        var svg_icon = '<svg width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#fff"><path d="M20.6 12.7c0 4.6-3.8 8.4-8.4 8.4-4.7 0-8.4-3.8-8.4-8.4 0-4.7 3.8-8.4 8.4-8.4 4.7 0 8.4 3.8 8.4 8.4m-6.6-5c-.4-.2-.9.1-.9.6v8.9c0 .5.5.8.9.6l6.7-4.5c.4-.3.4-.9 0-1.2L14 7.7z"/></svg>';

        // Добавляем CSS
        var style = document.createElement('style');
        style.innerHTML = '.rutube-modal-inner { width:100%; height:100%; background:#000; } .rutube-iframe { width:100%; height:100%; border:0; }';
        document.body.appendChild(style);

        // Основной слушатель
        Lampa.Listener.follow('full', function (e) {
            try {
                if (e.type == 'complite') {
                    var html = e.object.activity.render();
                    var buttons = html.find('.view--full__buttons');

                    if (buttons.length) {
                        // Создаем кнопку
                        var btn = $('<div class="view--full__button selector layer--visible">' + svg_icon + ' <span>Rutube</span></div>');
                        
                        btn.on('hover:enter', function () {});
                        btn.on('hover:click', function () {
                            searchAndShow(e.object.activity.card);
                        });

                        // Логика вставки кнопки
                        // Ищем оригинальную кнопку трейлера
                        var original = buttons.find('.view--full__button').filter(function() {
                            return $(this).text().toLowerCase().indexOf('трейлер') !== -1 || $(this).find('svg').length;
                        }).last();

                        if (original.length) {
                            original.after(btn);
                        } else {
                            buttons.append(btn);
                        }
                    }
                }
            } catch (err) {
                console.error('Rutube Plugin Error:', err);
            }
        });

        // Функция поиска с использованием прокси для обхода CORS
        function searchAndShow(card) {
            Lampa.Loading.start(function () {
                Lampa.Loading.stop();
            });

            // Формируем запрос
            var title = (card.title || card.name_original || card.name);
            var year = (card.release_date || card.first_air_date || '0000').substr(0, 4);
            var query = encodeURIComponent(title + ' ' + year + ' трейлер');
            
            // Используем API Rutube через прокси allorigins.win, чтобы избежать ошибки "Script error"
            var targetUrl = 'https://rutube.ru/api/search/video/?query=' + query;
            var proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(targetUrl);

            Lampa.Network.silent(proxyUrl, function (response) {
                Lampa.Loading.stop();
                try {
                    // allorigins возвращает JSON где контент лежит в поле contents
                    var data = JSON.parse(response.contents);
                    
                    if (data && data.results && data.results.length) {
                        showMenu(data.results);
                    } else {
                        Lampa.Noty.show('На Rutube ничего не найдено');
                    }
                } catch (e) {
                    Lampa.Noty.show('Ошибка обработки данных Rutube');
                }
            }, function (a, c) {
                Lampa.Loading.stop();
                Lampa.Noty.show('Ошибка сети (прокси)');
            });
        }

        // Отображение списка
        function showMenu(items) {
            var menu_items = [];

            items.forEach(function (item) {
                if (item.video_url) {
                    menu_items.push({
                        title: item.title,
                        subtitle: item.author ? item.author.name : 'Rutube',
                        url: item.video_url,
                        rutube_id: item.id,
                        img: item.thumbnail_url,
                        icon: svg_icon
                    });
                }
            });

            Lampa.Select.show({
                title: 'Найдено на Rutube',
                items: menu_items,
                onSelect: function (a) {
                    openPlayer(a.rutube_id);
                },
                onBack: function () {
                    Lampa.Controller.toggle('full');
                }
            });
        }

        // Открытие плеера
        function openPlayer(vidId) {
            var embedUrl = 'https://rutube.ru/play/embed/' + vidId;
            
            var modal_content = '<div class="rutube-modal-inner"><iframe class="rutube-iframe" src="' + embedUrl + '" allow="autoplay; encrypted-media; fullscreen; picture-in-picture;" allowfullscreen></iframe></div>';

            Lampa.Modal.open({
                title: '',
                html: $(modal_content),
                size: 'full',
                mask: true,
                onBack: function() {
                    Lampa.Modal.close();
                    Lampa.Controller.toggle('full');
                }
            });
        }
    }

    // Безопасный запуск
    if (window.Lampa) {
        startPlugin();
    } else {
        var timer = setInterval(function () {
            if (window.Lampa) {
                clearInterval(timer);
                startPlugin();
            }
        }, 200);
    }
})();
