(function () {
    'use strict';

    // Конфигурация API (взято из o.js)
    var SKAZ_HOSTS = [
        'http://online3.skaz.tv/',
        'http://online4.skaz.tv/',
        'http://online5.skaz.tv/'
    ];
    
    // Выбираем случайный хост, как в оригинале
    var API_URL = SKAZ_HOSTS[Math.floor(Math.random() * SKAZ_HOSTS.length)];
    
    // Параметры для сверки длительности (чтобы не подсунуть таймкоды от другой версии фильма)
    var DURATION_TOLERANCE_PERCENT = 1.5; // Допустимая погрешность 1.5%

    var SegmentsInjector = {
        init: function () {
            this.rewritePlayer();
            console.log('SegmentsInjector: Plugin initiated via ' + API_URL);
        },

        // Генерация ссылки с авторизацией (копия логики account() из o.js)
        account: function (url) {
            if (url.indexOf('account_email=') == -1) {
                var email = Lampa.Storage.get('account_email');
                if (email) url = Lampa.Utils.addUrlComponent(url, 'account_email=' + encodeURIComponent(email));
            }
            if (url.indexOf('uid=') == -1) {
                var uid = Lampa.Storage.get('lampac_unic_id', '');
                if (!uid) {
                    uid = Lampa.Utils.uid(8).toLowerCase();
                    Lampa.Storage.set('lampac_unic_id', uid);
                }
                if (uid) url = Lampa.Utils.addUrlComponent(url, 'uid=' + encodeURIComponent(uid));
            }
            if (url.indexOf('token=') == -1) {
                url = Lampa.Utils.addUrlComponent(url, 'token=');
            }
            return url;
        },

        // Перехват функции воспроизведения
        rewritePlayer: function () {
            var _this = this;
            var originalPlay = Lampa.Player.play;

            Lampa.Player.play = function (object) {
                // Запускаем оригинальное видео
                var result = originalPlay.apply(this, arguments);

                // Если сегментов нет, пытаемся найти их
                if (!object.segments) {
                    // Даем плееру инициализироваться
                    setTimeout(function () {
                        // Проверяем, что играет именно то, что мы запустили
                        var playing = Lampa.Player.playing();
                        
                        // Получаем карточку (метаданные)
                        var card = object.movie || Lampa.Activity.active().card;
                        
                        if (card && (card.kinopoisk_id || card.imdb_id)) {
                            // Если это сериал, нам нужны сезон и серия
                            var season = object.season || (playing && playing.season);
                            var episode = object.episode || (playing && playing.episode);
                            
                            // Запускаем поиск
                            _this.findSegments(card, season, episode, object.duration);
                        }
                    }, 2000);
                }
                return result;
            };
        },

        // Поиск контента на серверах Skaz
        findSegments: function (card, season, episode, currentDuration) {
            var _this = this;
            
            // Формируем запрос поиска (копия requestParams из o.js)
            var query = [];
            query.push('id=' + card.id);
            if (card.imdb_id) query.push('imdb_id=' + card.imdb_id);
            if (card.kinopoisk_id) query.push('kinopoisk_id=' + card.kinopoisk_id);
            query.push('title=' + encodeURIComponent(card.title || card.name));
            query.push('original_title=' + encodeURIComponent(card.original_title || card.original_name));
            query.push('serial=' + (card.name ? 1 : 0)); // Простая эвристика сериала
            query.push('year=' + ((card.release_date || card.first_air_date || '0000') + '').slice(0, 4));
            query.push('source=tmdb'); 

            var url = this.account(API_URL + 'lite/events?' + query.join('&'));

            var network = new Lampa.Reguest();
            network.silent(url, function (json) {
                if (json) {
                    _this.parseSearchResponse(json, season, episode, currentDuration);
                }
            }, function () {
                console.log('SegmentsInjector: Search failed');
            });
        },

        // Парсинг ответа (HTML внутри JSON)
        parseSearchResponse: function (response, season, episode, currentDuration) {
            var _this = this;
            
            // o.js возвращает HTML в поле content или просто как текст, 
            // но эндпоинт lite/events может вернуть структуру балансеров.
            // Нам нужно найти хоть какой-то валидный источник.
            
            // Эмуляция парсинга jQuery, как в o.js
            // Нам нужно найти элементы .videos__item
            
            // Примечание: ответ может быть сложным, упрощаем до поиска ссылок
            // Если response - это объект с балансерами, берем первый попавшийся или ищем 'cdnmovies'/'videocdn' и т.д.
            // Для упрощения, предположим, что сервер вернул готовый список (как часто бывает в lite/events)
            
            var strHtml = '';
            if(typeof response === 'string') strHtml = response;
            else if(response.content) strHtml = response.content;
            
            // Если ответ пустой или не строка, пробуем запросить конкретный балансер, 
            // так как API может вернуть список вкладок.
            // Но в o.js запрос идет к lite/events, который обычно отдает "default" балансер сразу.
            
            if(!strHtml && response.online && response.online.length) {
                 // Если вернулся список балансеров, берем первый доступный URL
                 // и делаем еще один запрос, чтобы получить HTML список видео
                 var firstBalancer = response.online[0];
                 var network = new Lampa.Reguest();
                 network.silent(_this.account(firstBalancer.url), function(html){
                     _this.extractVideoLink(html, season, episode, currentDuration);
                 });
                 return;
            }

            if(strHtml) {
                _this.extractVideoLink(strHtml, season, episode, currentDuration);
            }
        },

        extractVideoLink: function(htmlStr, season, episode, currentDuration) {
            var _this = this;
            var html = $('<div>' + htmlStr + '</div>');
            var items = [];

            // Парсинг, аналогичный o.js: parseJsonDate
            html.find('.videos__item').each(function() {
                var item = $(this);
                var dataStr = item.attr('data-json');
                if(dataStr) {
                    try {
                        var data = JSON.parse(dataStr);
                        var s = item.attr('s') || data.season;
                        var e = item.attr('e') || data.episode;
                        
                        if(s) data.season = parseInt(s);
                        if(e) data.episode = parseInt(e);
                        
                        items.push(data);
                    } catch(e){}
                }
            });

            // Логика выбора:
            // Если это фильм - берем первый попавшийся (обычно лучшее качество наверху)
            // Если сериал - ищем совпадение по S и E
            
            var targetItem = null;

            if (season && episode) {
                targetItem = items.find(function(i) {
                    return i.season == season && i.episode == episode;
                });
            } else {
                // Фильм - берем первый
                targetItem = items[0];
            }

            if (targetItem && targetItem.url) {
                // Запрашиваем JSON самого видео, где лежат segments
                var network = new Lampa.Reguest();
                network.silent(_this.account(targetItem.url), function(videoJson) {
                    if (videoJson.segments && videoJson.segments.length) {
                        _this.injectSegments(videoJson.segments, currentDuration, videoJson);
                    } else {
                        console.log('SegmentsInjector: Video found, but no segments.');
                    }
                });
            } else {
                console.log('SegmentsInjector: Matching video not found in response.');
            }
        },

        injectSegments: function (segments, currentDuration, jsonDebug) {
            var playing = Lampa.Player.playing();
            
            if (!playing) return;

            // Проверка длительности, если она известна
            // В ответе Skaz длительность может не приходить явно в корне, 
            // но если бы приходила, тут стоило бы сравнить.
            // Часто duration есть в videoJson.duration (в секундах)
            
            var remoteDuration = jsonDebug.duration || 0;
            
            // Если длительность плеера известна (Lampa обычно знает её через пару секунд)
            var playerDuration = Lampa.Player.info ? Lampa.Player.info.duration : 0;
            if(!playerDuration && currentDuration) playerDuration = currentDuration;

            // Если удалось получить длительность обоих файлов - сравниваем
            if (remoteDuration && playerDuration) {
                var diff = Math.abs(remoteDuration - playerDuration);
                var allowedDiff = (playerDuration * DURATION_TOLERANCE_PERCENT) / 100;
                
                // Если разница больше допустимой (например, Director's Cut vs Theatrical), не применяем
                if (diff > allowedDiff && diff > 10) { // Игнорим разницу менее 10 сек
                    console.log('SegmentsInjector: Duration mismatch. Local: ' + playerDuration + ', Remote: ' + remoteDuration);
                    Lampa.Noty.show('Skaz: Сегменты найдены, но длительность не совпадает.');
                    return;
                }
            }

            // ВНЕДРЕНИЕ
            playing.segments = segments;
            
            // Уведомление пользователя
            Lampa.Noty.show('Загружено пропусков: ' + segments.length + ' (Skaz)');
            console.log('SegmentsInjector: Injected!', segments);
            
            // Хак для принудительного обновления UI плеера, чтобы кнопка появилась
            // Lampa проверяет segments при обновлении времени, 
            // но иногда полезно пнуть Timeline
            if(Lampa.Player.listener) {
                 // Это не обязательно, Lampa сама подхватит при следующем событии timeupdate
            }
        }
    };

    // Запуск плагина
    if (window.appready) SegmentsInjector.init();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') SegmentsInjector.init();
        });
    }

})();
