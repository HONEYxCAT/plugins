(function () {
    'use strict';

    // === НАСТРОЙКИ ===
    var DEBUG_MODE = true;
    var DURATION_TOLERANCE_PERCENT = 15; // Еще больше толерантность

    var SKAZ_HOSTS = [
        'http://online3.skaz.tv/',
        'http://online4.skaz.tv/',
        'http://online5.skaz.tv/'
    ];

    var API_URL = SKAZ_HOSTS[Math.floor(Math.random() * SKAZ_HOSTS.length)];
    // Используем allorigins.win, так как он стабильнее для text/html
    var CORS_PROXY = 'https://api.allorigins.win/get?url=';

    function logError(context, error) {
        var msg = typeof error === 'object' ? (error.message || error.statusText || 'Unknown') : error;
        console.error('[Injector] ' + context + ':', error);
        if (DEBUG_MODE) Lampa.Noty.show('[Injector] ' + context + ': ' + msg);
    }

    function log(msg, data) {
        if(data) console.log('[Injector] ' + msg, data);
        else console.log('[Injector] ' + msg);
    }

    var SegmentsInjector = {
        init: function () {
            try {
                this.rewritePlayer();
                log('Initialized v5 via ' + API_URL);
                Lampa.Noty.show('Injector v5: Ready');
            } catch (e) {
                logError('Init Failed', e);
            }
        },

        // Умный сетевой запрос с правильной обработкой прокси
        smartRequest: function(url, callback) {
            var _this = this;
            var network = new Lampa.Reguest();
            
            log('Requesting (Smart): ' + url);

            // Попытка 1: Прямой запрос
            network.silent(url, function(json) {
                log('Direct success');
                callback(json);
            }, function(a, c) {
                log('Direct fail, trying proxy...');
                
                // Попытка 2: Прокси AllOrigins
                var proxyUrl = CORS_PROXY + encodeURIComponent(url);
                
                var networkProxy = new Lampa.Reguest();
                networkProxy.silent(proxyUrl, function(response) {
                    // Прокси allorigins возвращает JSON { contents: "<html>...", status: ... }
                    log('Proxy response received');
                    
                    var result = response;
                    
                    // Распаковка ответа от прокси
                    if (response && response.contents) {
                        result = response.contents;
                        
                        // Если внутри contents лежит JSON-строка, парсим её
                        try {
                            if (typeof result === 'string' && (result.startsWith('{') || result.startsWith('['))) {
                                result = JSON.parse(result);
                            }
                        } catch(e) {
                            // Это не JSON, а HTML, оставляем как есть
                        }
                    }
                    
                    callback(result);
                }, function(b, d) {
                    logError('Proxy Failed', url);
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
                if (url.indexOf('token=') == -1) url = Lampa.Utils.addUrlComponent(url, 'token=');
                return url;
            } catch (e) { return url; }
        },

        findCardInfo: function(playerObject) {
            if (playerObject.movie) return playerObject.movie;
            if (playerObject.card) return playerObject.card;
            var active = Lampa.Activity.active();
            if (active) {
                if (active.card) return active.card;
                if (active.movie) return active.movie;
                if (active.component) {
                    if (active.component.card) return active.component.card;
                    if (active.component.movie) return active.component.movie;
                    if (active.component.object && active.component.object.movie) return active.component.object.movie;
                }
            }
            return null;
        },

        rewritePlayer: function () {
            var _this = this;
            if (!Lampa.Player || !Lampa.Player.play) throw new Error('Lampa.Player missing');

            var originalPlay = Lampa.Player.play;

            Lampa.Player.play = function (object) {
                var result = originalPlay.apply(this, arguments);

                try {
                    if (!object.segments) {
                        var foundCard = _this.findCardInfo(object);

                        if (foundCard) {
                            log('Card found immediately: ' + foundCard.title);
                        } else {
                            log('Card NOT found immediately');
                        }

                        setTimeout(function () {
                            try {
                                var currentObject = object;
                                if (!foundCard) foundCard = _this.findCardInfo(currentObject);

                                if (!foundCard) {
                                    logError('SKIP', 'No card info');
                                    return;
                                }

                                if (foundCard.kinopoisk_id || foundCard.imdb_id) {
                                    var season = parseInt(currentObject.season || 0);
                                    var episode = parseInt(currentObject.episode || 0);
                                    
                                    if (season === 0 && currentObject.from_item) {
                                        season = parseInt(currentObject.from_item.season || 0);
                                        episode = parseInt(currentObject.from_item.episode || 0);
                                    }

                                    var duration = currentObject.duration || 0;

                                    Lampa.Noty.show('Injector: Поиск...');
                                    log('Start Search -> ' + foundCard.title + ' S' + season + 'E' + episode);
                                    
                                    _this.findSegments(foundCard, season, episode, duration, currentObject);
                                }
                            } catch (innerE) {
                                logError('Logic Error', innerE);
                            }
                        }, 2000);
                    }
                } catch (e) {
                    logError('Hook Error', e);
                }

                return result;
            };
        },

        findSegments: function (card, season, episode, currentDuration, targetObject) {
            var _this = this;
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

            this.smartRequest(url, function (json) {
                try {
                    // ДЕБАГ: Показываем, что пришло от поиска
                    if(typeof json === 'string') log('Search Response (HTML snippet): ' + json.substring(0, 100));
                    else log('Search Response (JSON keys):', Object.keys(json));

                    _this.parseSearchResponse(json, season, episode, currentDuration, targetObject);
                } catch (e) {
                    logError('Response Parse Error', e);
                }
            });
        },

        parseSearchResponse: function (response, season, episode, currentDuration, targetObject) {
            var _this = this;
            var strHtml = '';

            if (!response) {
                log('Empty response from search');
                return;
            }

            if (typeof response === 'string') strHtml = response;
            else if (response.content) strHtml = response.content;
            
            // Если вернулся список балансеров (массив online)
            if (!strHtml && response.online && Array.isArray(response.online) && response.online.length > 0) {
                 var bestBalancer = response.online.find(function(b){ return b.url.indexOf('skaz') > -1; }) || response.online[0];
                 log('Redirecting to balancer: ' + bestBalancer.name);
                 
                 this.smartRequest(_this.account(bestBalancer.url), function(html){
                     // ДЕБАГ: Лог ответа балансера
                     if(typeof html === 'string') log('Balancer HTML snippet: ' + html.substring(0, 100));
                     
                     _this.extractVideoLink(html, season, episode, currentDuration, targetObject);
                 });
                 return;
            }

            if (strHtml) _this.extractVideoLink(strHtml, season, episode, currentDuration, targetObject);
            else log('Unknown response format');
        },

        extractVideoLink: function(htmlStr, season, episode, currentDuration, targetObject) {
            var _this = this;
            if (typeof $ === 'undefined') return;

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

            // Лог найденных элементов
            log('Found items count: ' + items.length);

            var targetItem = null;

            if (season > 0 && episode > 0) {
                targetItem = items.find(function(i) {
                    return i.season == season && i.episode == episode;
                });
            } else {
                targetItem = items[0];
            }

            if (targetItem && targetItem.url) {
                log('Target video found! URL: ' + targetItem.url);
                
                this.smartRequest(_this.account(targetItem.url), function(videoJson) {
                    log('Video info loaded', videoJson);
                    
                    if (videoJson.segments && videoJson.segments.length) {
                        _this.injectSegments(videoJson.segments, currentDuration, videoJson, targetObject);
                    } else {
                        log('Video JSON has NO segments');
                    }
                });
            } else {
                log('Video NOT found for S' + season + ' E' + episode);
                // Если не нашли, пробуем вывести список доступных (для отладки)
                if(items.length > 0) {
                    log('Available items sample:', items.slice(0, 3));
                }
            }
        },

        injectSegments: function (segments, currentDuration, jsonDebug, targetObject) {
            if (!targetObject) return;

            var remoteDuration = parseFloat(jsonDebug.duration || 0);
            var playerDuration = currentDuration || (Lampa.Player.info ? Lampa.Player.info.duration : 0);
            
            if (remoteDuration > 0 && playerDuration > 0) {
                var diff = Math.abs(remoteDuration - playerDuration);
                var allowedDiff = (playerDuration * DURATION_TOLERANCE_PERCENT) / 100;
                
                if (diff > allowedDiff && diff > 20) {
                    log('Duration warning: L: ' + playerDuration + ' R: ' + remoteDuration);
                    // Не блокируем, просто предупреждаем в лог, так как толерантность 15%
                }
            }

            targetObject.segments = segments;
            
            Lampa.Noty.show('Skaz: Найдено ' + segments.length + ' пропусков!');
            log('INJECTED:', segments);
            
            if (Lampa.Player.panel) Lampa.Player.panel.update(); 
        }
    };

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
