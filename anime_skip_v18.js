(function () {
    'use strict';

    var CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';
    var PROXY = 'https://api.allorigins.win/raw?url=';
    
    // Кэш для ускорения (ID TMDB -> Таймкоды)
    var CACHE = {};

    var GQL_SEARCH = `
    query Search($search: String!) {
      searchShows(search: $search, limit: 5) {
        id
        name
        episodes {
          number
          timestamps {
            at
            type { name }
          }
        }
      }
    }`;

    function log(msg, data) {
        var prefix = '[AnimeSkip] ';
        if (typeof data === 'object') console.log(prefix + msg, data);
        else console.log(prefix + msg, data || '');
    }

    function notify(msg) {
        if(Lampa.Noty) Lampa.Noty.show('[AnimeSkip] ' + msg);
    }

    var AnimeSkip = {
        init: function () {
            this.rewritePlayer();
            this.initListener(); // Запасной вариант
            log('Loaded v18 (Hybrid).');
            notify('Плагин v18: Готов');
        },

        // 1. ПЕРЕХВАТ ФУНКЦИИ (Основной метод)
        rewritePlayer: function () {
            if (!Lampa.Player || !Lampa.Player.play) return;
            var originalPlay = Lampa.Player.play;

            Lampa.Player.play = function (object) {
                var result = originalPlay.apply(this, arguments);
                try {
                    // Запускаем процесс с небольшой задержкой, чтобы не блокировать UI
                    setTimeout(function() {
                        AnimeSkip.process(object, 'Hook');
                    }, 100);
                } catch (e) { console.error(e); }
                return result;
            };
        },

        // 2. СЛУШАТЕЛЬ (Запасной метод, если хук переписан другим плагином)
        initListener: function() {
            Lampa.Player.listener.follow('start', function(data) {
                if (data && data.object) {
                    setTimeout(function() {
                        AnimeSkip.process(data.object, 'Listener');
                    }, 500);
                }
            });
        },

        // 3. ГЛАВНАЯ ЛОГИКА
        process: function(object, source) {
            // Если уже обработано - выходим
            if (object.animeSkipProcessed) return;
            object.animeSkipProcessed = true;

            var card = object.movie || object.card || Lampa.Activity.active().card;
            if (!card) return;

            // Проверка на аниме
            if (!AnimeSkip.isAnime(card)) return;

            // Определение сезона/серии
            var episode = parseInt(object.episode || (object.from_item ? object.from_item.episode : 0) || 0);
            // Если это фильм или данные кривые
            if (episode === 0) episode = 1; 

            log('Start processing via ' + source + ': ' + card.title + ' Ep ' + episode);

            // Проверка кэша
            if (CACHE[card.id] && CACHE[card.id][episode]) {
                AnimeSkip.inject(CACHE[card.id][episode], object);
                return;
            }

            // Начало поиска
            notify('Поиск пропусков...');
            var originalTitle = card.original_name || card.original_title || card.title;

            AnimeSkip.resolveTitles(originalTitle, function(titles) {
                AnimeSkip.cascadeFetch(titles, 0, function(episodesMap) {
                    if (Object.keys(episodesMap).length > 0) {
                        // Сохраняем в кэш
                        CACHE[card.id] = episodesMap;
                        
                        // Пробуем найти наш эпизод
                        var segments = episodesMap[episode] || episodesMap["" + episode];
                        if (segments) {
                            AnimeSkip.inject(segments, object);
                        } else {
                            log('Show found, but episode ' + episode + ' missing in DB');
                            // notify('Для этой серии нет меток');
                        }
                    } else {
                        log('Search failed for all titles.');
                        // notify('Пропуски не найдены');
                    }
                });
            });
        },

        inject: function(segments, object) {
            object.segments = segments;
            
            log('INJECTED:', segments);
            notify('Метки добавлены (' + segments.length + ')');

            // Обновление UI
            if (Lampa.Player.timeline) Lampa.Player.timeline.update(segments);
            if (Lampa.Player.panel) Lampa.Player.panel.update();
            
            // Хак для появления кнопки
            if(Lampa.Player.video) {
                try { var event = new Event('timeupdate'); Lampa.Player.video.dispatchEvent(event); } catch(e) {}
            }
        },

        isAnime: function(card) {
            if (!card) return false;
            if (card.genres && card.genres.find(function(g){ return g.id === 16; })) return true;
            if (card.source === 'shikimori') return true;
            if (card.original_language === 'ja') return true;
            return false;
        },

        resolveTitles: function(originalTitle, callback) {
            var titlesToTry = [originalTitle];
            // Пробуем найти английское название через Kitsu
            var kitsuUrl = 'https://kitsu.io/api/edge/anime?filter[text]=' + encodeURIComponent(originalTitle);
            
            var network = new Lampa.Reguest();
            network.silent(kitsuUrl, function(res) {
                if (res && res.data && res.data.length > 0) {
                    var anime = res.data[0];
                    var attrs = anime.attributes;
                    if (attrs.titles && attrs.titles.en) titlesToTry.unshift(attrs.titles.en);
                    if (attrs.canonicalTitle) titlesToTry.push(attrs.canonicalTitle);
                    
                    // Добавляем "чистую" версию (без спецсимволов)
                    if (attrs.titles && attrs.titles.en) {
                        var clean = attrs.titles.en.replace(/[^a-zA-Z0-9 ]/g, " ");
                        titlesToTry.push(clean);
                        var firstWord = clean.split(' ')[0];
                        if(firstWord.length > 3) titlesToTry.push(firstWord);
                    }
                }
                // Уникальные значения
                titlesToTry = titlesToTry.filter(function(item, pos) { return titlesToTry.indexOf(item) == pos && item; });
                callback(titlesToTry);
            }, function() {
                callback(titlesToTry);
            });
        },

        cascadeFetch: function(titlesList, index, callback) {
            var _this = this;
            if (index >= titlesList.length) {
                callback({}); // Ничего не нашли
                return;
            }

            var currentQuery = titlesList[index];
            log('Searching: ' + currentQuery);

            this.gqlRequest(GQL_SEARCH, { search: currentQuery }, function(response) {
                if (response.data && response.data.searchShows && response.data.searchShows.length > 0) {
                    // Проверяем, есть ли эпизоды хоть в одном результате
                    for(var i=0; i < response.data.searchShows.length; i++) {
                        var show = response.data.searchShows[i];
                        if (show.episodes && show.episodes.length > 0) {
                            var map = _this.parseEpisodes(show.episodes);
                            if (Object.keys(map).length > 0) {
                                log('Match found: ' + show.name);
                                callback(map);
                                return;
                            }
                        }
                    }
                }
                // Если не нашли, пробуем следующий вариант названия
                _this.cascadeFetch(titlesList, index + 1, callback);
            });
        },

        parseEpisodes: function(episodesList) {
            var resultMap = {};
            episodesList.forEach(function(ep) {
                if (ep.timestamps && ep.timestamps.length > 0) {
                    var segments = [];
                    ep.timestamps.forEach(function(ts) {
                        var typeName = (ts.type && ts.type.name) ? ts.type.name.toLowerCase() : 'unknown';
                        var label = 'Пропустить ' + typeName;
                        if (typeName.indexOf('intro') > -1) label = 'Пропустить заставку';
                        else if (typeName.indexOf('outro') > -1) label = 'Пропустить титры';
                        else if (typeName.indexOf('preview') > -1) label = 'Пропустить превью';

                        segments.push({
                            start: ts.at,
                            end: ts.at + 85, // Фолбэк 85 сек
                            text: label
                        });
                    });
                    resultMap[ep.number] = segments;
                }
            });
            return resultMap;
        },

        gqlRequest: function (query, variables, callback) {
            var url = 'https://api.anime-skip.com/graphql';
            var body = JSON.stringify({ query: query, variables: variables });

            if(typeof $ !== 'undefined' && $.ajax) {
                $.ajax({
                    url: url, type: 'POST', data: body,
                    contentType: 'application/json',
                    headers: { 'X-Client-ID': CLIENT_ID, 'Content-Type': 'application/json' },
                    success: function(response) { callback(response); },
                    error: function(xhr) { 
                        log('Direct API Error. Trying Proxy...');
                        // Если прямой запрос не прошел, пробуем через прокси
                        // Внимание: Proxy через GET, поэтому GraphQL query нужно закодировать в URL
                        // Это сложно для POST, но для GET Anime-Skip может не работать.
                        // Поэтому просто логируем.
                        callback({}); 
                    }
                });
            }
        }
    };

    function start() {
        if (window.anime_skip_v18) return;
        window.anime_skip_v18 = true;
        AnimeSkip.init();
    }

    if (typeof Lampa !== 'undefined' && Lampa.Player) start();
    else {
        var check = setInterval(function() {
            if (typeof Lampa !== 'undefined' && Lampa.Player) { clearInterval(check); start(); }
        }, 200);
    }
})();
