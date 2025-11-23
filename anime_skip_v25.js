(function () {
    'use strict';

    // === КОНФИГУРАЦИЯ ===
    var CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE'; // Public Test ID
    var API_URL = 'https://api.anime-skip.com/graphql';
    
    // Глобальный кэш для текущей сессии просмотра: { showId: [episodes_data] }
    var SESSION_CACHE = {};

    // Типы маркеров, которые начинаем пропускать
    var SKIP_TYPES = ['Intro', 'New Intro', 'Outro', 'Credits', 'New Credits', 'Recap', 'Preview'];
    // Типы маркеров, которые означают конец пропуска (возврат к контенту)
    var CONTENT_TYPES = ['Canon', 'Episode', 'Part A', 'Part B', 'Feature'];

    // === GRAPHQL ЗАПРОСЫ ===
    
    // 1. Поиск ID сериала
    var GQL_SEARCH = `
    query Search($search: String!) {
      searchShows(search: $search, limit: 1) {
        id
        name
      }
    }`;

    // 2. Получение всех таймкодов (Ваш исправленный запрос)
    var GQL_GET_EPISODES = `
    query GetEpisodes($showId: String!) {
      findEpisodesByShowId(showId: $showId) {
        number
        timestamps {
          at
          type {
            name
          }
        }
      }
    }`;

    // === ЛОГИРОВАНИЕ ===
    function log(msg, data) {
        console.log('[AnimeSkip] ' + msg, data || '');
    }
    function notify(msg) {
        if(Lampa.Noty) Lampa.Noty.show('[AnimeSkip] ' + msg);
    }

    // === ОСНОВНОЙ КЛАСС ===
    var AnimeSkip = {
        init: function() {
            this.hookPlayer();
            this.hookPlaylist();
            log('v25 Loaded (Interval Logic).');
            notify('AnimeSkip v25');
        },

        // 1. Перехват запуска видео
        hookPlayer: function() {
            var originalPlay = Lampa.Player.play;
            
            Lampa.Player.play = function(object) {
                var _thisContext = this;
                var _args = arguments;

                // Проверка на аниме
                var card = object.movie || object.card || Lampa.Activity.active().card;
                if (!AnimeSkip.isAnime(card)) {
                    return originalPlay.apply(_thisContext, _args);
                }

                // Если уже есть сегменты - не трогаем
                if (object.segments) return originalPlay.apply(_thisContext, _args);

                log('Anime detected. Holding playback for data fetch...');
                notify('Поиск пропусков...');

                // Запускаем процесс получения данных
                AnimeSkip.process(card, object, function(modifiedObject) {
                    // Запускаем плеер с обновленным объектом
                    originalPlay.apply(_thisContext, [modifiedObject]);
                });
            };
        },

        // 2. Перехват переключения серий (Плейлист)
        hookPlaylist: function() {
            Lampa.Player.listener.follow('new', function(e) {
                var object = e.object;
                var card = object.movie || object.card || Lampa.Activity.active().card;
                
                // Если данные для этого сериала уже в кэше, мгновенно применяем их к новой серии
                if (card && SESSION_CACHE[card.id]) {
                    log('Playlist switch detected. Using Cache.');
                    AnimeSkip.applyFromCache(card.id, object);
                }
            });
        },

        // 3. Главная логика
        process: function(card, object, callback) {
            var tmdbId = card.id;
            var title = card.original_name || card.original_title || card.title;

            // Если есть в кэше - берем сразу
            if (SESSION_CACHE[tmdbId]) {
                AnimeSkip.applyFromCache(tmdbId, object);
                callback(object);
                return;
            }

            // Если нет - ищем
            AnimeSkip.resolveTitle(title, function(searchTitle) {
                AnimeSkip.fetchSkipData(searchTitle, tmdbId, function(success) {
                    if (success) {
                        AnimeSkip.applyFromCache(tmdbId, object);
                    } else {
                        notify('Пропуски не найдены');
                    }
                    callback(object);
                });
            });
        },

        // 4. Поиск и загрузка данных
        fetchSkipData: function(title, tmdbId, callback) {
            // Шаг A: Ищем Show ID
            AnimeSkip.gqlRequest(GQL_SEARCH, { search: title }, function(res) {
                if (res.data && res.data.searchShows && res.data.searchShows.length > 0) {
                    var show = res.data.searchShows[0];
                    var showId = show.id;
                    log('Found Show ID: ' + showId + ' (' + show.name + ')');

                    // Шаг B: Получаем ВСЕ эпизоды
                    AnimeSkip.gqlRequest(GQL_GET_EPISODES, { showId: showId }, function(resEp) {
                        if (resEp.data && resEp.data.findEpisodesByShowId) {
                            var episodes = resEp.data.findEpisodesByShowId;
                            
                            // Сохраняем в кэш обработанные данные
                            // Формат кэша: { 1: [сегменты], 2: [сегменты] }
                            var processedCache = {};
                            
                            episodes.forEach(function(ep) {
                                var segments = AnimeSkip.calculateIntervals(ep.timestamps);
                                if (segments.length > 0) {
                                    processedCache[ep.number] = segments;
                                }
                            });

                            SESSION_CACHE[tmdbId] = processedCache;
                            callback(true);
                        } else {
                            callback(false);
                        }
                    });
                } else {
                    log('Show not found: ' + title);
                    callback(false);
                }
            });
        },

        // 5. Алгоритм конвертации (Points -> Intervals)
        calculateIntervals: function(timestamps) {
            if (!timestamps || timestamps.length === 0) return [];

            // Сортируем по времени
            timestamps.sort(function(a, b) { return a.at - b.at; });

            var segments = [];
            var currentStart = -1;
            var currentType = '';

            for (var i = 0; i < timestamps.length; i++) {
                var marker = timestamps[i];
                var typeName = marker.type.name;
                
                // Проверяем, является ли это началом пропуска
                // Используем частичное совпадение, т.к. бывают "New Intro", "Mixed Intro"
                var isSkipStart = SKIP_TYPES.some(function(t) { return typeName.indexOf(t) !== -1; });
                
                if (isSkipStart) {
                    if (currentStart === -1) {
                        currentStart = marker.at;
                        currentType = typeName;
                    }
                } else {
                    // Если это не начало пропуска, то это может быть конец предыдущего
                    if (currentStart !== -1) {
                        // Закрываем сегмент
                        segments.push({
                            start: currentStart,
                            end: marker.at,
                            name: "Пропустить " + currentType
                        });
                        currentStart = -1;
                        currentType = '';
                    }
                }
            }

            // Если файл кончился, а сегмент не закрыт (например, Outro в самом конце)
            if (currentStart !== -1) {
                // Ставим "виртуальный" конец +300 секунд, плеер сам остановит в конце файла
                segments.push({
                    start: currentStart,
                    end: currentStart + 300, 
                    name: "Пропустить " + currentType
                });
            }

            return segments;
        },

        // 6. Внедрение в объект Lampa
        applyFromCache: function(tmdbId, object) {
            var cache = SESSION_CACHE[tmdbId];
            if (!cache) return;

            var episode = parseInt(object.episode || (object.from_item ? object.from_item.episode : 0) || 1);
            
            var segments = cache[episode];
            if (segments && segments.length > 0) {
                // Формируем структуру для Lampa (Двойная совместимость)
                
                // 1. Структура из вашего запроса (для новых версий/o.js)
                object.segments = {
                    "skip": segments.map(function(s) {
                        return {
                            start: s.start,
                            end: s.end,
                            name: s.name
                        };
                    })
                };

                // 2. Маркеры для таймлайна (визуально)
                object.markers = segments.map(function(s) {
                    return {
                        time: s.start,
                        title: s.name
                    };
                });
                
                // 3. Стандартный массив (fallback)
                // object.segments также может быть массивом в некоторых версиях, 
                // но мы перезаписали его объектом выше. Надеемся, ваша версия Lampa это поймет.
                // Если нет - плеер просто проигнорирует.
                
                log('Injected for Ep ' + episode, segments);
                notify('Пропуски: ' + segments.length);
            } else {
                log('No segments for Ep ' + episode);
            }
        },

        // --- Helpers ---

        resolveTitle: function(jpTitle, callback) {
            // Пробуем найти английское название через Kitsu (как прокси-словарь)
            // так как Anime-Skip лучше ищет по-английски
            var kitsuUrl = 'https://kitsu.io/api/edge/anime?filter[text]=' + encodeURIComponent(jpTitle);
            var net = new Lampa.Reguest();
            
            net.silent(kitsuUrl, function(res) {
                if (res && res.data && res.data.length > 0) {
                    var attrs = res.data[0].attributes;
                    // Приоритет: en -> canonical
                    if (attrs.titles && attrs.titles.en) {
                        // Чистим название от спецсимволов
                        callback(attrs.titles.en.replace(/[^a-zA-Z0-9 ]/g, " ")); 
                        return;
                    }
                }
                callback(jpTitle); // Fallback to original
            }, function() {
                callback(jpTitle);
            });
        },

        gqlRequest: function (query, variables, callback) {
            if(typeof $ === 'undefined') return;
            $.ajax({
                url: API_URL,
                type: 'POST',
                data: JSON.stringify({ query: query, variables: variables }),
                contentType: 'application/json',
                headers: { 'X-Client-ID': CLIENT_ID },
                success: function(res) { callback(res); },
                error: function(xhr) { log('API Error', xhr); callback({}); }
            });
        },

        isAnime: function(card) {
            if (!card) return false;
            if (card.genres && card.genres.find(function(g){ return g.id === 16; })) return true;
            if (card.source === 'shikimori') return true;
            if (card.original_language === 'ja') return true;
            return false;
        }
    };

    if (window.appready) AnimeSkip.init();
    else Lampa.Listener.follow('app', function(e){ if(e.type=='ready') AnimeSkip.init(); });
})();
