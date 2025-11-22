(function () {
    'use strict';

    // === НАСТРОЙКИ ===
    var DEBUG_MODE = true;
    var DURATION_TOLERANCE_PERCENT = 15;

    var SKAZ_HOSTS = [
        'http://online3.skaz.tv/',
        'http://online4.skaz.tv/',
        'http://online5.skaz.tv/'
    ];

    var API_URL = SKAZ_HOSTS[Math.floor(Math.random() * SKAZ_HOSTS.length)];
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
                log('Initialized v6 via ' + API_URL);
                Lampa.Noty.show('Injector v6: Ready');
            } catch (e) {
                logError('Init Failed', e);
            }
        },

        smartRequest: function(url, callback) {
            var _this = this;
            var network = new Lampa.Reguest();
            
            log('Requesting: ' + url);

            network.silent(url, function(json) {
                log('Direct success');
                callback(json);
            }, function(a, c) {
                log('Direct fail, trying proxy...');
                var proxyUrl = CORS_PROXY + encodeURIComponent(url);
                var networkProxy = new Lampa.Reguest();
                
                networkProxy.silent(proxyUrl, function(response) {
                    log('Proxy response received');
                    var result = response;
                    if (response && response.contents) {
                        result = response.contents;
                        try {
                            if (typeof result === 'string' && (result.trim().startsWith('{') || result.trim().startsWith('['))) {
                                result = JSON.parse(result);
                            }
                        } catch(e) {}
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
                    _this.parseSearchResponse(json, season, episode, currentDuration, targetObject);
                } catch (e) {
                    logError('Response Parse Error', e);
                }
            });
        },

        parseSearchResponse: function (response, season, episode, currentDuration, targetObject) {
            var _this = this;
            var strHtml = '';
            var balancerList = null;

            if (!response) {
                log('Empty response from search');
                return;
            }

            // Сценарий 1: Ответ - это массив балансеров (Прямой список)
            if (Array.isArray(response)) {
                log('Response is Array (Direct Balancer List)');
                balancerList = response;
            } 
            // Сценарий 2: Ответ - объект с полем online
            else if (response.online && Array.isArray(response.online)) {
                log('Response is Object with .online');
                balancerList = response.online;
            }
            // Сценарий 3: Ответ - HTML строка (сразу контент)
            else if (typeof response === 'string') {
                strHtml = response;
            }
            else if (response.content) {
                strHtml = response.content;
            }

            // Если найден список балансеров, переходим по ссылке первого/лучшего
            if (balancerList && balancerList.length > 0) {
                 var bestBalancer = balancerList.find(function(b){ return b.url && b.url.indexOf('skaz') > -1; }) || balancerList[0];
                 
                 if(bestBalancer && bestBalancer.url) {
                     log('Redirecting to balancer: ' + (bestBalancer.name || 'Unknown'));
                     this.smartRequest(_this.account(bestBalancer.url), function(html){
                         _this.extractVideoLink(html, season, episode, currentDuration, targetObject);
                     });
                 } else {
                     log('Balancer list empty or invalid');
                 }
                 return;
            }

            // Если это HTML, парсим его
            if (strHtml) {
                _this.extractVideoLink(strHtml, season, episode, currentDuration, targetObject);
            } else {
                log('Unknown response format. Dump:', response);
            }
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
                    // Проверка на прокси-обертку для видео JSON
                    if(typeof videoJson === 'string') {
                        try { videoJson = JSON.parse(videoJson); } catch(e){}
                    }

                    if (videoJson.segments && videoJson.segments.length) {
                        _this.injectSegments(videoJson.segments, currentDuration, videoJson, targetObject);
                    } else {
                        log('Video JSON loaded, but NO segments found.');
                    }
                });
            } else {
                log('Video NOT found for S' + season + ' E' + episode);
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
