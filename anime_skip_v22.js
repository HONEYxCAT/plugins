(function () {
    'use strict';

    var CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE'; // Official Public ID

    // GraphQL запрос
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
            this.hookPlayer();
            log('Loaded v22 (Interceptor).');
            notify('Плагин v22: Готов');
        },

        // === ГЛАВНЫЙ ПЕРЕХВАТЧИК ===
        hookPlayer: function () {
            // Сохраняем оригинальную функцию запуска плеера
            var originalPlay = Lampa.Player.play;

            // Переписываем её
            Lampa.Player.play = function (object) {
                var _thisContext = this;
                var _arguments = arguments;

                // 1. Проверяем, нужно ли нам вмешиваться
                var card = object.movie || object.card || Lampa.Activity.active().card;
                
                // Если это не аниме или сегменты уже есть — запускаем сразу
                if (!card || !AnimeSkip.isAnime(card) || object.segments) {
                    return originalPlay.apply(_thisContext, _arguments);
                }

                // 2. Если это аниме — ТОРМОЗИМ ЗАПУСК
                notify('Поиск пропусков...');
                log('Interceptor paused playback for: ' + card.title);

                var episode = parseInt(object.episode || (object.from_item ? object.from_item.episode : 0) || 0);
                if (episode === 0) episode = 1; // Фильмы

                // 3. Ищем таймкоды
                var title = card.original_name || card.original_title || card.title;

                AnimeSkip.resolveAndSearch(title, episode, function(segments) {
                    // 4. Если нашли — добавляем в объект
                    if (segments && segments.length > 0) {
                        segments.forEach(function(s){ s.source = 'AnimeSkip'; });
                        object.segments = segments;
                        log('Segments injected into object BEFORE start:', segments);
                        notify('Найдено пропусков: ' + segments.length);
                    } else {
                        log('No segments found, starting anyway.');
                    }

                    // 5. ЗАПУСКАЕМ ПЛЕЕР (с задержкой или без)
                    originalPlay.apply(_thisContext, _arguments);
                });
            };
        },

        // --- ЛОГИКА ПОИСКА ---

        resolveAndSearch: function(originalTitle, episode, callback) {
            // Тайм-аут безопасности (чтобы плеер не завис, если API не отвечает)
            var hasReturned = false;
            var safeCallback = function(data) {
                if(hasReturned) return;
                hasReturned = true;
                callback(data);
            };
            setTimeout(function() { safeCallback(null); }, 4000); // Макс ждем 4 секунды

            // 1. Формируем список названий
            var titlesToTry = [originalTitle];
            var kitsuUrl = 'https://kitsu.io/api/edge/anime?filter[text]=' + encodeURIComponent(originalTitle);
            
            var network = new Lampa.Reguest();
            network.silent(kitsuUrl, function(res) {
                if (res && res.data && res.data.length > 0) {
                    var anime = res.data[0];
                    var attrs = anime.attributes;
                    if (attrs.titles && attrs.titles.en) titlesToTry.unshift(attrs.titles.en); // EN приоритет
                    if (attrs.canonicalTitle) titlesToTry.push(attrs.canonicalTitle);
                    if (attrs.titles && attrs.titles.en) {
                        var clean = attrs.titles.en.replace(/[^a-zA-Z0-9 ]/g, " ");
                        titlesToTry.push(clean);
                    }
                }
                // Уникальные
                titlesToTry = titlesToTry.filter(function(item, pos) { return titlesToTry.indexOf(item) == pos && item; });
                
                // 2. Ищем по списку
                AnimeSkip.cascadeFetch(titlesToTry, 0, episode, safeCallback);
            }, function() {
                // Ошибка Kitsu, ищем по оригиналу
                AnimeSkip.cascadeFetch(titlesToTry, 0, episode, safeCallback);
            });
        },

        cascadeFetch: function(titlesList, index, targetEpisode, callback) {
            if (index >= titlesList.length) {
                callback(null);
                return;
            }

            var currentQuery = titlesList[index];
            log('Searching: ' + currentQuery);

            this.gqlRequest(GQL_SEARCH, { search: currentQuery }, function(response) {
                if (response.data && response.data.searchShows && response.data.searchShows.length > 0) {
                    for(var i=0; i < response.data.searchShows.length; i++) {
                        var show = response.data.searchShows[i];
                        if (show.episodes && show.episodes.length > 0) {
                            var segments = AnimeSkip.parseEpisodes(show.episodes, targetEpisode);
                            if (segments && segments.length > 0) {
                                log('Match: ' + show.name);
                                callback(segments);
                                return;
                            }
                        }
                    }
                }
                // Не нашли, пробуем следующее название
                AnimeSkip.cascadeFetch(titlesList, index + 1, targetEpisode, callback);
            });
        },

        parseEpisodes: function(episodesList, targetEpisode) {
            var foundEp = episodesList.find(function(ep) { return ep.number == targetEpisode; });
            
            if (foundEp && foundEp.timestamps && foundEp.timestamps.length > 0) {
                var segments = [];
                foundEp.timestamps.forEach(function(ts) {
                    var typeName = (ts.type && ts.type.name) ? ts.type.name.toLowerCase() : 'unknown';
                    var label = 'Пропустить ' + typeName;
                    
                    if (typeName.indexOf('intro') > -1) label = 'Пропустить заставку';
                    else if (typeName.indexOf('outro') > -1) label = 'Пропустить титры';
                    else if (typeName.indexOf('preview') > -1) label = 'Пропустить превью';

                    // ВАЖНО: Так как API не вернул end/duration в прошлый раз,
                    // ставим фиксированную длину 85 сек. Это компромисс.
                    var startTime = ts.at;
                    var endTime = ts.at + 85; 

                    segments.push({
                        start: startTime,
                        end: endTime,
                        text: label
                    });
                });
                return segments;
            }
            return null;
        },

        isAnime: function(card) {
            if (!card) return false;
            if (card.genres && card.genres.find(function(g){ return g.id === 16; })) return true;
            if (card.source === 'shikimori') return true;
            if (card.original_language === 'ja') return true;
            return false;
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
                    error: function(xhr) { callback({}); }
                });
            } else {
                callback({});
            }
        }
    };

    function start() {
        if (window.anime_skip_v22) return;
        window.anime_skip_v22 = true;
        AnimeSkip.init();
    }

    if (typeof Lampa !== 'undefined' && Lampa.Player) start();
    else {
        var check = setInterval(function() {
            if (typeof Lampa !== 'undefined' && Lampa.Player) { clearInterval(check); start(); }
        }, 200);
    }
})();
