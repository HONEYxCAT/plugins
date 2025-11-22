(function () {
    'use strict';

    // === НАСТРОЙКИ ===
    var DEBUG_MODE = true; // Выводить ошибки на экран
    var DURATION_TOLERANCE_PERCENT = 3; // Допустимая разница в длительности (%)

    // Список серверов (взято из o.js)
    var SKAZ_HOSTS = [
        'http://online3.skaz.tv/',
        'http://online4.skaz.tv/',
        'http://online5.skaz.tv/'
    ];

    // Выбираем случайный хост
    var API_URL = SKAZ_HOSTS[Math.floor(Math.random() * SKAZ_HOSTS.length)];

    // Вспомогательная функция для логирования ошибок
    function logError(context, error) {
        var msg = typeof error === 'object' ? (error.message || error.statusText || 'Unknown error') : error;
        console.error('[Injector] ' + context + ':', error);
        if (DEBUG_MODE) {
            Lampa.Noty.show('[Injector] ' + context + ': ' + msg);
        }
    }

    // Вспомогательная функция для логов
    function log(msg) {
        console.log('[Injector] ' + msg);
    }

    var SegmentsInjector = {
        init: function () {
            try {
                this.rewritePlayer();
                log('Initialized via ' + API_URL);
                Lampa.Noty.show('Injector: Ready');
            } catch (e) {
                logError('Init Failed', e);
            }
        },

        // Генерация ссылки с авторизацией (копия логики account() из o.js)
        account: function (url) {
            try {
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
            } catch (e) {
                logError('Account URL gen failed', e);
                return url;
            }
        },

        // Перехват функции воспроизведения
        rewritePlayer: function () {
            var _this = this;
            
            if (!Lampa.Player || !Lampa.Player.play) {
                throw new Error('Lampa.Player not found');
            }

            var originalPlay = Lampa.Player.play;

            Lampa.Player.play = function (object) {
                // Запускаем оригинальное видео
                var result = originalPlay.apply(this, arguments);

                // Используем try-catch внутри хука, чтобы не сломать плеер
                try {
                    // Если сегментов нет, пытаемся найти их
                    if (!object.segments) {
                        log('Video started without segments. Trying to find...');
                        
                        setTimeout(function () {
                            try {
                                // Проверяем состояние плеера
                                var playing = Lampa.Player.playing();
                                if (!playing) return;

                                // Получаем карточку (метаданные)
                                var card = object.movie || Lampa.Activity.active().card;
                                
                                if (!card) {
                                    log('No card info found');
                                    return;
                                }

                                if (card.kinopoisk_id || card.imdb_id) {
                                    // Если это сериал, нам нужны сезон и серия
                                    var season = object.season || (playing && playing.season);
                                    var episode = object.episode || (playing && playing.episode);
                                    var duration = object.duration || (playing && playing.duration); // Может быть undefined

                                    log('Starting search for: ' + (card.title || 'Unknown') + ' S:' + season + ' E:' + episode);
                                    
                                    // Запускаем поиск
                                    _this.findSegments(card, season, episode, duration);
                                } else {
                                    log('No KP/IMDB ID, skipping');
                                }
                            } catch (innerE) {
                                logError('Timeout Loop Error', innerE);
                            }
                        }, 2000);
                    }
                } catch (e) {
                    logError('Player Hook Error', e);
                }

                return result;
            };
        },

        // Поиск контента на серверах Skaz
        findSegments: function (card, season, episode, currentDuration) {
            var _this = this;
            
            try {
                // Формируем запрос поиска
                var query = [];
                query.push('id=' + (card.id || ''));
                if (card.imdb_id) query.push('imdb_id=' + card.imdb_id);
                if (card.kinopoisk_id) query.push('kinopoisk_id=' + card.kinopoisk_id);
                query.push('title=' + encodeURIComponent(card.title || card.name));
                query.push('original_title=' + encodeURIComponent(card.original_title || card.original_name));
                query.push('serial=' + (card.name || season ? 1 : 0));
                query.push('year=' + ((card.release_date || card.first_air_date || '0000') + '').slice(0, 4));
                query.push('source=tmdb'); 

                var url = this.account(API_URL + 'lite/events?' + query.join('&'));

                var network = new Lampa.Reguest();
                network.silent(url, function (json) {
                    try {
                        _this.parseSearchResponse(json, season, episode, currentDuration);
                    } catch (e) {
                        logError('Response Parsing Error', e);
                    }
                }, function (a, c) {
                    // Ошибка сети. Часто бывает Mixed Content (HTTPS -> HTTP)
                    logError('Network Error (Search)', 'Status: ' + (a.status || 'Unknown') + '. Check HTTPS/HTTP mix.');
                });
            } catch (e) {
                logError('FindSegments Error', e);
            }
        },

        // Парсинг ответа
        parseSearchResponse: function (response, season, episode, currentDuration) {
            var _this = this;
            var strHtml = '';

            // Валидация ответа
            if (!response) {
                log('Empty response from API');
                return;
            }

            if (typeof response === 'string') strHtml = response;
            else if (response.content) strHtml = response.content;
            
            // Если сервер вернул список балансеров (массив online), берем первый
            if (!strHtml && response.online && Array.isArray(response.online) && response.online.length > 0) {
                 var firstBalancer = response.online[0];
                 log('Redirecting to balancer: ' + firstBalancer.name);
                 
                 var network = new Lampa.Reguest();
                 network.silent(_this.account(firstBalancer.url), function(html){
                     try {
                        _this.extractVideoLink(html, season, episode, currentDuration);
                     } catch(e) {
                        logError('Balancer HTML parse error', e);
                     }
                 }, function() {
                     logError('Balancer Network Error', firstBalancer.url);
                 });
                 return;
            }

            if (strHtml) {
                _this.extractVideoLink(strHtml, season, episode, currentDuration);
            } else {
                log('Unknown response format');
            }
        },

        extractVideoLink: function(htmlStr, season, episode, currentDuration) {
            var _this = this;
            
            if (typeof $ === 'undefined') {
                throw new Error('JQuery ($) is missing in Lampa');
            }

            var html = $('<div>' + htmlStr + '</div>');
            var items = [];

            // Парсинг элементов .videos__item
            html.find('.videos__item').each(function() {
                var item = $(this);
                var dataStr = item.attr('data-json');
                if (dataStr) {
                    try {
                        var data = JSON.parse(dataStr);
                        var s = item.attr('s') || data.season;
                        var e = item.attr('e') || data.episode;
                        
                        if (s) data.season = parseInt(s);
                        if (e) data.episode = parseInt(e);
                        
                        items.push(data);
                    } catch (e) {
                        // Игнорируем битые JSON в атрибутах
                    }
                }
            });

            var targetItem = null;

            if (season && episode) {
                // Ищем точное совпадение
                targetItem = items.find(function(i) {
                    return i.season == season && i.episode == episode;
                });
            } else {
                // Фильм - берем первый элемент (обычно лучшее качество)
                targetItem = items[0];
            }

            if (targetItem && targetItem.url) {
                log('Video found: ' + targetItem.title + '. Requesting stream info...');
                
                var network = new Lampa.Reguest();
                network.silent(_this.account(targetItem.url), function(videoJson) {
                    try {
                        if (videoJson.segments && videoJson.segments.length) {
                            _this.injectSegments(videoJson.segments, currentDuration, videoJson);
                        } else {
                            log('No segments in video JSON');
                        }
                    } catch (e) {
                        logError('Video JSON parse error', e);
                    }
                }, function() {
                    logError('Video Link Network Error', targetItem.url);
                });
            } else {
                log('Matching video not found in HTML list');
            }
        },

        injectSegments: function (segments, currentDuration, jsonDebug) {
            var playing = Lampa.Player.playing();
            if (!playing) return;

            var remoteDuration = parseFloat(jsonDebug.duration || 0);
            
            // Пытаемся получить длительность из плеера, если она не была передана
            var playerDuration = currentDuration || (Lampa.Player.info ? Lampa.Player.info.duration : 0);
            
            // Если есть данные для сравнения
            if (remoteDuration > 0 && playerDuration > 0) {
                var diff = Math.abs(remoteDuration - playerDuration);
                var allowedDiff = (playerDuration * DURATION_TOLERANCE_PERCENT) / 100;
                
                // Пропускаем проверку, если разница меньше 15 секунд (погрешности интро)
                if (diff > allowedDiff && diff > 15) {
                    logError('Duration Mismatch', 'Local: ' + playerDuration + 's, Remote: ' + remoteDuration + 's');
                    return;
                }
            }

            // ВНЕДРЕНИЕ
            playing.segments = segments;
            
            Lampa.Noty.show('Skaz: Injected ' + segments.length + ' segments');
            log('Success! Segments injected: ' + JSON.stringify(segments));
            
            // Принудительно вызываем обновление таймлайна, если возможно
            if (Lampa.Player.video) {
                // Триггер события для обновления UI
                // Не всегда нужно, но помогает
            }
        }
    };

    // Безопасный запуск
    function start() {
        if (window.appready) {
            SegmentsInjector.init();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') SegmentsInjector.init();
            });
        }
    }

    // Если Lampa не определена сразу (редко, но бывает при инъекциях)
    if (typeof Lampa === 'undefined') {
        var waitForLampa = setInterval(function(){
            if(typeof Lampa !== 'undefined') {
                clearInterval(waitForLampa);
                start();
            }
        }, 100);
    } else {
        start();
    }

})();
