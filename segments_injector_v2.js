(function () {
    'use strict';

    // === НАСТРОЙКИ ===
    var DEBUG_MODE = true;
    var DURATION_TOLERANCE_PERCENT = 5; // Увеличил до 5% для надежности

    // Список серверов Skaz
    var SKAZ_HOSTS = [
        'http://online3.skaz.tv/',
        'http://online4.skaz.tv/',
        'http://online5.skaz.tv/'
    ];

    var API_URL = SKAZ_HOSTS[Math.floor(Math.random() * SKAZ_HOSTS.length)];

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
                Lampa.Noty.show('Injector: Ready');
            } catch (e) {
                logError('Init Failed', e);
            }
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
                logError('Account Gen Error', e);
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
                    // Если сегментов нет, ищем их
                    if (!object.segments) {
                        // Ждем инициализацию (на всякий случай, чтобы объект закрепился в памяти)
                        setTimeout(function () {
                            try {
                                // ПРОВЕРКА: Если плеер закрыли за эти 2 секунды, ничего не делаем
                                // Lampa.Player.video обычно содержит элемент видео
                                if (!Lampa.Player.video) return;

                                // ИСПОЛЬЗУЕМ object НАПРЯМУЮ, вместо Lampa.Player.playing()
                                var currentObject = object;

                                // Получаем карточку (метаданные)
                                var card = currentObject.movie || Lampa.Activity.active().card;
                                
                                if (!card) {
                                    // Иногда карточка может быть внутри самого объекта video
                                    if (currentObject.card) card = currentObject.card;
                                    else {
                                        log('No card info found');
                                        return;
                                    }
                                }

                                if (card.kinopoisk_id || card.imdb_id) {
                                    var season = currentObject.season || 0;
                                    var episode = currentObject.episode || 0;
                                    
                                    // Иногда сезон/серия лежат не в корне, а в from_item или подобных
                                    // Но для большинства балансеров они в корне
                                    
                                    // Если мы смотрим фильм, season/episode будут undefined или 0
                                    
                                    var duration = currentObject.duration || 0;

                                    log('Search: ' + (card.title || 'Unknown') + ' S:' + season + ' E:' + episode);
                                    
                                    // Передаем currentObject дальше, чтобы в него записать результат
                                    _this.findSegments(card, season, episode, duration, currentObject);
                                } else {
                                    log('No KP/IMDB ID');
                                }
                            } catch (innerE) {
                                logError('Logic Loop Error', innerE);
                            }
                        }, 2000);
                    }
                } catch (e) {
                    logError('Player Hook Error', e);
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

                var network = new Lampa.Reguest();
                network.silent(url, function (json) {
                    try {
                        _this.parseSearchResponse(json, season, episode, currentDuration, targetObject);
                    } catch (e) {
                        logError('Parse Response Error', e);
                    }
                }, function (a) {
                    // Игнорируем ошибки сети тихо, чтобы не спамить
                    console.warn('[Injector] Network search failed', a);
                });
            } catch (e) {
                logError('FindSegments Error', e);
            }
        },

        parseSearchResponse: function (response, season, episode, currentDuration, targetObject) {
            var _this = this;
            var strHtml = '';

            if (!response) return;

            if (typeof response === 'string') strHtml = response;
            else if (response.content) strHtml = response.content;
            
            // Если вернулся список балансеров
            if (!strHtml && response.online && Array.isArray(response.online) && response.online.length > 0) {
                 var firstBalancer = response.online[0];
                 var network = new Lampa.Reguest();
                 network.silent(_this.account(firstBalancer.url), function(html){
                     try {
                        _this.extractVideoLink(html, season, episode, currentDuration, targetObject);
                     } catch(e) {}
                 });
                 return;
            }

            if (strHtml) {
                _this.extractVideoLink(strHtml, season, episode, currentDuration, targetObject);
            }
        },

        extractVideoLink: function(htmlStr, season, episode, currentDuration, targetObject) {
            var _this = this;
            
            if (typeof $ === 'undefined') return; // Нет jQuery

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

            if (season && episode) {
                targetItem = items.find(function(i) {
                    return i.season == season && i.episode == episode;
                });
            } else {
                targetItem = items[0];
            }

            if (targetItem && targetItem.url) {
                var network = new Lampa.Reguest();
                network.silent(_this.account(targetItem.url), function(videoJson) {
                    try {
                        if (videoJson.segments && videoJson.segments.length) {
                            _this.injectSegments(videoJson.segments, currentDuration, videoJson, targetObject);
                        }
                    } catch (e) {
                        logError('Video JSON Parse', e);
                    }
                });
            }
        },

        injectSegments: function (segments, currentDuration, jsonDebug, targetObject) {
            // Проверяем, жив ли еще объект видео
            if (!targetObject) return;

            var remoteDuration = parseFloat(jsonDebug.duration || 0);
            
            // Пробуем получить длительность из объекта или плеера
            var playerDuration = currentDuration || (Lampa.Player.info ? Lampa.Player.info.duration : 0);
            
            // Сверка длительности
            if (remoteDuration > 0 && playerDuration > 0) {
                var diff = Math.abs(remoteDuration - playerDuration);
                var allowedDiff = (playerDuration * DURATION_TOLERANCE_PERCENT) / 100;
                
                // Если разница большая (больше 20 сек и больше 5%)
                if (diff > allowedDiff && diff > 20) {
                    log('Duration mismatch: Local ' + playerDuration + ' vs Remote ' + remoteDuration);
                    return;
                }
            }

            // === ВНЕДРЕНИЕ ===
            // Мы меняем объект, который использует плеер по ссылке
            targetObject.segments = segments;
            
            Lampa.Noty.show('Skaz: Добавлено ' + segments.length + ' меток пропуска');
            log('Injected segments: ' + segments.length);
        }
    };

    function start() {
        if (window.appready) {
            SegmentsInjector.init();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') SegmentsInjector.init();
            });
        }
    }

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
