(function () {
    'use strict';

    // === НАСТРОЙКИ ===
    var DEBUG_MODE = true;
    var DURATION_TOLERANCE_PERCENT = 5;

    // Список серверов Skaz
    var SKAZ_HOSTS = [
        'http://online3.skaz.tv/',
        'http://online4.skaz.tv/',
        'http://online5.skaz.tv/'
    ];

    var API_URL = SKAZ_HOSTS[Math.floor(Math.random() * SKAZ_HOSTS.length)];

    // Прокси для обхода CORS в браузере (используется как запасной вариант)
    var CORS_PROXY = 'https://api.allorigins.win/raw?url=';

    function logError(context, error) {
        var msg = typeof error === 'object' ? (error.message || error.statusText || 'Unknown error') : error;
        console.error('[Injector] ' + context + ':', error);
        if (DEBUG_MODE) {
            Lampa.Noty.show('[Injector] ' + context + ': ' + msg);
        }
    }

    function log(msg) {
        console.log('[Injector] ' + msg);
    }

    var SegmentsInjector = {
        init: function () {
            try {
                this.rewritePlayer();
                log('Initialized via ' + API_URL);
                Lampa.Noty.show('Injector v3: Ready');
            } catch (e) {
                logError('Init Failed', e);
            }
        },

        // Умный запрос: Сначала пробует напрямую, если ошибка CORS - через прокси
        smartRequest: function(url, callback) {
            var _this = this;
            var network = new Lampa.Reguest();
            
            log('Requesting: ' + url);

            // Попытка 1: Прямой запрос
            network.silent(url, function(json) {
                callback(json);
            }, function(a, c) {
                // Если ошибка, пробуем через прокси
                log('Direct request failed (CORS/Net). Trying proxy...');
                var proxyUrl = CORS_PROXY + encodeURIComponent(url);
                
                var networkProxy = new Lampa.Reguest();
                networkProxy.silent(proxyUrl, function(json) {
                    log('Proxy request successful');
                    callback(json);
                }, function(b, d) {
                    logError('All requests failed', 'Check console/network');
                });
            });
        },

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
                return url;
            }
        },

        rewritePlayer: function () {
            var _this = this;

            if (!Lampa.Player || !Lampa.Player.play) {
                throw new Error('Lampa.Player not found');
            }

            var originalPlay = Lampa.Player.play;

            Lampa.Player.play = function (object) {
                var result = originalPlay.apply(this, arguments);

                try {
                    // Логируем сам факт запуска
                    log('Player hook triggered. Checking segments...');

                    if (!object.segments) {
                        setTimeout(function () {
                            try {
                                // Прямое использование объекта, который был передан в play()
                                var currentObject = object;

                                // Попытка достать карточку
                                var card = currentObject.movie || Lampa.Activity.active().card;
                                
                                // Если карточки нет в стандартном месте, ищем глубже
                                if (!card && currentObject.card) card = currentObject.card;
                                
                                if (!card) {
                                    log('Skip: No card info found inside player object');
                                    return;
                                }

                                if (card.kinopoisk_id || card.imdb_id) {
                                    // Очистка данных
                                    var season = parseInt(currentObject.season || 0);
                                    var episode = parseInt(currentObject.episode || 0);
                                    var duration = currentObject.duration || 0;

                                    // Сообщение о начале поиска
                                    Lampa.Noty.show('Injector: Ищу пропуски...');
                                    log('Search Params -> Title: ' + (card.title) + ' | S:' + season + ' E:' + episode);
                                    
                                    _this.findSegments(card, season, episode, duration, currentObject);
                                } else {
                                    log('Skip: No ID (KP/IMDB)');
                                }
                            } catch (innerE) {
                                logError('Hook Logic Error', innerE);
                            }
                        }, 2000); // Задержка 2 сек, чтобы плеер успел прогрузить данные
                    } else {
                        log('Segments already exist. Skipping.');
                    }
                } catch (e) {
                    logError('Player Global Error', e);
                }

                return result;
            };
        },

        findSegments: function (card, season, episode, currentDuration, targetObject) {
            var _this = this;
            
            try {
                var query = [];
                query.push('id=' + (card.id || ''));
                if (card.imdb_id) query.push('imdb_id=' + card.imdb_id);
                if (card.kinopoisk_id) query.push('kinopoisk_id=' + card.kinopoisk_id);
                query.push('title=' + encodeURIComponent(card.title || card.name));
                query.push('original_title=' + encodeURIComponent(card.original_title || card.original_name));
                query.push('serial=' + (card.name || season > 0 ? 1 : 0));
                query.push('year=' + ((card.release_date || card.first_air_date || '0000') + '').slice(0, 4));
                query.push('source=tmdb'); 

                var url = this.account(API_URL + 'lite/events?' + query.join('&'));

                // Используем умный запрос (Direct -> Proxy)
                this.smartRequest(url, function (json) {
                    try {
                        _this.parseSearchResponse(json, season, episode, currentDuration, targetObject);
                    } catch (e) {
                        logError('Response Parse Error', e);
                    }
                });

            } catch (e) {
                logError('FindSegments Error', e);
            }
        },

        parseSearchResponse: function (response, season, episode, currentDuration, targetObject) {
            var _this = this;
            var strHtml = '';

            if (!response) {
                log('Empty response');
                return;
            }

            if (typeof response === 'string') strHtml = response;
            else if (response.content) strHtml = response.content;
            
            // Если вернулся список балансеров (массив online), берем первый
            if (!strHtml && response.online && Array.isArray(response.online) && response.online.length > 0) {
                 var firstBalancer = response.online[0];
                 log('Found balancer list, entering: ' + firstBalancer.url);
                 
                 this.smartRequest(_this.account(firstBalancer.url), function(html){
                     _this.extractVideoLink(html, season, episode, currentDuration, targetObject);
                 });
                 return;
            }

            if (strHtml) {
                _this.extractVideoLink(strHtml, season, episode, currentDuration, targetObject);
            } else {
                log('Unknown response structure');
            }
        },

        extractVideoLink: function(htmlStr, season, episode, currentDuration, targetObject) {
            var _this = this;
            
            if (typeof $ === 'undefined') {
                logError('Error', 'No jQuery');
                return; 
            }

            var html = $('<div>' + htmlStr + '</div>');
            var items = [];

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
                    } catch (e) {}
                }
            });

            var targetItem = null;

            if (season > 0 && episode > 0) {
                targetItem = items.find(function(i) {
                    return i.season == season && i.episode == episode;
                });
            } else {
                // Если фильм или сезон не найден, берем первый (обычно лучший)
                targetItem = items[0];
            }

            if (targetItem && targetItem.url) {
                log('Video match found. Getting segments...');
                
                this.smartRequest(_this.account(targetItem.url), function(videoJson) {
                    if (videoJson.segments && videoJson.segments.length) {
                        _this.injectSegments(videoJson.segments, currentDuration, videoJson, targetObject);
                    } else {
                        log('No segments in video data');
                    }
                });
            } else {
                log('Video not found in search results');
            }
        },

        injectSegments: function (segments, currentDuration, jsonDebug, targetObject) {
            if (!targetObject) return;

            var remoteDuration = parseFloat(jsonDebug.duration || 0);
            var playerDuration = currentDuration || (Lampa.Player.info ? Lampa.Player.info.duration : 0);
            
            // Сверка длительности (защита от неверной версии)
            if (remoteDuration > 0 && playerDuration > 0) {
                var diff = Math.abs(remoteDuration - playerDuration);
                var allowedDiff = (playerDuration * DURATION_TOLERANCE_PERCENT) / 100;
                
                if (diff > allowedDiff && diff > 20) {
                    log('Duration mismatch. L: ' + playerDuration + ' R: ' + remoteDuration);
                    Lampa.Noty.show('Skaz: Таймкоды не подходят (разная длительность)');
                    return;
                }
            }

            // Внедрение
            targetObject.segments = segments;
            
            // Уведомление
            Lampa.Noty.show('Skaz: Пропуски добавлены (' + segments.length + ')');
            log('INJECTED SUCCESS: ' + JSON.stringify(segments));
            
            // Обновляем таймлайн плеера, чтобы кнопки появились
            if (Lampa.Player.video && Lampa.Player.panel) {
               // Форсируем обновление UI
               Lampa.Player.panel.update(); 
            }
        }
    };

    // Запуск
    function start() {
        if (window.appready) SegmentsInjector.init();
        else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') SegmentsInjector.init();
            });
        }
    }

    if (typeof Lampa === 'undefined') {
        var wait = setInterval(function(){
            if(typeof Lampa !== 'undefined') {
                clearInterval(wait);
                start();
            }
        }, 100);
    } else {
        start();
    }

})();
