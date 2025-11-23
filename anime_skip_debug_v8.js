(function () {
    'use strict';

    const API_URL = 'https://api.anime-skip.com/graphql';
    const CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';
    const SKIP_TYPES = ['Intro', 'New Intro', 'Op', 'Opening', 'Recap', 'Credits', 'New Credits', 'Ed', 'Ending', 'Preview'];

    const log = (msg, data) => {
        if (data) console.log(`%c[AnimeSkip] ${msg}`, 'color: #a3fd39; font-weight: bold;', data);
        else console.log(`%c[AnimeSkip] ${msg}`, 'color: #a3fd39; font-weight: bold;');
    };

    function cleanTitle(title) {
        if (!title) return '';
        return title
            .replace(/\(\d{4}\)/g, '') 
            .replace(/\(TV\)/gi, '')
            .replace(/Season \d+/gi, '')
            .replace(/[:\-]/g, ' ')    
            .replace(/\s+/g, ' ')      
            .trim();
    }

    // --- НОВОЕ: Получение английского названия через TMDB ---
    async function fetchEnglishTitle(card) {
        if (!window.Lampa || !window.Lampa.TMDB) return null;

        // Определяем тип: если есть name - это сериал (tv), если title - фильм (movie)
        // Но лучше проверить явно
        const type = (card.name || card.original_name) ? 'tv' : 'movie';
        const id = card.id;

        if (!id) return null;

        log(`⚠️ Пробуем найти английское название для ID ${id} (${type})...`);

        const tmdbUrl = Lampa.TMDB.api(`${type}/${id}?api_key=${Lampa.TMDB.key()}&language=en-US`);

        try {
            const response = await fetch(tmdbUrl);
            const json = await response.json();
            const enTitle = json.name || json.title;
            
            if (enTitle) {
                log(`✅ Найдено английское название: "${enTitle}"`);
                return enTitle;
            }
        } catch (e) {
            console.warn('[AnimeSkip] Ошибка запроса к TMDB EN:', e);
        }
        return null;
    }

    async function apiRequest(query) {
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Client-ID': CLIENT_ID },
                body: JSON.stringify({ query })
            });
            const json = await res.json();
            if (json.errors) throw new Error(json.errors[0].message);
            return json.data;
        } catch (e) {
            throw e;
        }
    }

    async function findShowId(card) {
        let titlesToTry = [];
        
        // 1. Собираем то, что есть в Lampa (обычно RU + Original)
        if (card.original_title) titlesToTry.push(card.original_title);
        if (card.original_name) titlesToTry.push(card.original_name);
        if (card.title) titlesToTry.push(card.title);
        if (card.name) titlesToTry.push(card.name);

        // Очищаем дубликаты
        titlesToTry = [...new Set(titlesToTry)].filter(t => t);

        // 2. Пробуем искать по текущим названиям
        for (const query of titlesToTry) {
            const id = await trySearch(query);
            if (id) return id;
        }

        // 3. Если не нашли - запрашиваем английское название у TMDB
        Lampa.Noty.show('AnimeSkip: Запрос английского названия...');
        const enTitle = await fetchEnglishTitle(card);
        
        if (enTitle) {
            // Пробуем английское название
            let id = await trySearch(enTitle);
            if (id) return id;

            // Пробуем очищенное английское название
            const cleanEn = cleanTitle(enTitle);
            if (cleanEn !== enTitle) {
                id = await trySearch(cleanEn);
                if (id) return id;
            }
        }

        return null;
    }

    async function trySearch(query) {
        log(`Ищем ID для: "${query}"...`);
        try {
            // Ищем нечетким поиском (searchShows)
            const q = `{ searchShows(search: "${query}", limit: 1) { id name } }`;
            const data = await apiRequest(q);
            if (data.searchShows && data.searchShows.length > 0) {
                const show = data.searchShows[0];
                log(`✅ Найдено: ${show.name} (ID: ${show.id})`);
                return show.id;
            }
        } catch (e) {
            console.warn(`[AnimeSkip] Ошибка поиска "${query}":`, e);
        }
        return null;
    }

    async function getEpisodeData(showId, episodeNumber) {
        // Сначала пробуем найти по точному номеру (findEpisodesByShowId часто возвращает много всего)
        // AnimeSkip API странный, иногда надежнее искать через searchEpisodes внутри шоу
        
        const q = `{ 
            searchEpisodes(search: "", showId: "${showId}", limit: 200) { 
                number 
                timestamps { at type { name } } 
            } 
        }`;

        try {
            const data = await apiRequest(q);
            const episodes = data.searchEpisodes || [];
            
            // Ищем эпизод. Приводим к строке или числу для сравнения
            // (AnimeSkip может вернуть number: 28.0 или "28")
            const targetEp = episodes.find(e => parseFloat(e.number) === parseFloat(episodeNumber));

            if (!targetEp) {
                log(`❌ Эпизод ${episodeNumber} не найден в базе. Доступно эпизодов: ${episodes.length}`);
                if(episodes.length > 0) log('Первые доступные:', episodes.slice(0, 5).map(e => e.number));
                return null;
            }
            return targetEp.timestamps;
        } catch (e) {
            console.error('[AnimeSkip] Ошибка получения эпизодов:', e);
            return null;
        }
    }

    function processTimestamps(timestamps) {
        if (!timestamps || !timestamps.length) return [];
        timestamps.sort((a, b) => a.at - b.at);
        let segments = [];
        
        log('Сырые маркеры:', timestamps);

        for (let i = 0; i < timestamps.length; i++) {
            const curr = timestamps[i];
            const next = timestamps[i + 1]; // Может быть undefined, если это последний маркер
            const typeName = curr.type ? curr.type.name : 'Unknown';

            // Проверяем, входит ли тип в список пропускаемых
            if (SKIP_TYPES.some(t => typeName.toLowerCase().includes(t.toLowerCase()))) {
                
                // Вариант 1: Есть следующий маркер - используем его время как конец
                if (next) {
                    segments.push({
                        start: curr.at,
                        end: next.at,
                        name: typeName
                    });
                } 
                // Вариант 2: Это последний маркер (например, Ending или Preview в самом конце файла)
                // Lampa требует end. Можно поставить очень большое число, плеер сам остановит,
                // либо (лучше) попробовать взять длительность видео, но здесь она недоступна синхронно.
                // Пока пропустим одиночные маркеры в конце, чтобы не ломать таймлайн.
                else {
                    // Можно добавить "виртуальный" конец через +90 секунд, например, 
                    // но безопаснее игнорировать, если мы не знаем длительность.
                    log(`Маркер ${typeName} в конце (at: ${curr.at}), нет закрывающего маркера. Пропускаем.`);
                }
            }
        }
        return segments;
    }

    async function runAnimeSkip(data) {
        let card = data.movie || data.card;
        
        // Фолбэк на Activity, если запускаем из торрентов/онлайн
        if (!card) {
            const active = Lampa.Activity.active();
            if (active) card = active.movie || active.card;
        }

        let episodeNum = data.episode || data.e || data.episode_number;
        
        if (!card) return log('❌ Карточка не найдена.');
        
        // Если это фильм или нет номера эпизода, пробуем 1
        if (!episodeNum) {
             const isSerial = card.number_of_seasons > 0 || (card.original_name && !card.original_title); 
             if (!isSerial) episodeNum = 1;
             else if (data.id) {
                // Иногда номер эпизода зашит в ID (для IPTV или специфичных плагинов)
                // Но пока оставим 1 как дефолт
             }
        }
        if (!episodeNum) episodeNum = 1;

        log(`>>> ЗАПУСК V8: ${card.original_title || card.title} | Эп: ${episodeNum}`);
        Lampa.Noty.show(`AnimeSkip: Поиск...`);

        const showId = await findShowId(card);
        if (!showId) {
            Lampa.Noty.show('AnimeSkip: Не найдено');
            log('❌ Не удалось найти ID сериала ни по одному из названий.');
            return;
        }

        const timestamps = await getEpisodeData(showId, episodeNum);
        if (!timestamps) {
             Lampa.Noty.show(`AnimeSkip: Нет данных для ${episodeNum} серии`);
             return;
        }

        const skipSegments = processTimestamps(timestamps);

        if (skipSegments.length > 0) {
            log('✅ Сегменты готовы:', skipSegments);
            
            let currentSegments = Lampa.Segments.all() || {};
            if(!currentSegments.skip) currentSegments.skip = [];
            
            // Добавляем уникальные
            skipSegments.forEach(s => {
                 const exists = currentSegments.skip.find(ex => ex.start === s.start);
                 if (!exists) currentSegments.skip.push(s);
            });

            Lampa.Segments.set(currentSegments);
            Lampa.Noty.show(`AnimeSkip: Активно (${skipSegments.length} зон)`);
        } else {
            log('Сегменты не сформированы (возможно, маркеры не Intro/Ending).');
            Lampa.Noty.show('AnimeSkip: Нет пропускаемых зон');
        }
    }

    function startPlugin() {
        if (window.lampa_animeskip_v8) return;
        window.lampa_animeskip_v8 = true;
        console.log('AnimeSkip: Debug V8 Loaded (Auto Translation)');

        const originalPlay = Lampa.Player.play;
        Lampa.Player.play = function (data) {
            const result = originalPlay.apply(this, arguments);
            runAnimeSkip(data);
            return result;
        };
    }

    if (window.Lampa && window.Lampa.Player) {
        startPlugin();
    } else {
        window.document.addEventListener('app_ready', startPlugin);
    }
})();
