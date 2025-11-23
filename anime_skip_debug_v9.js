(function () {
    'use strict';

    const API_URL = 'https://api.anime-skip.com/graphql';
    const CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';
    // Типы, которые ищем
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

    // Получение английского названия (решает проблему Frieren)
    async function fetchEnglishTitle(card) {
        if (!window.Lampa || !window.Lampa.TMDB) return null;
        const type = (card.name || card.original_name) ? 'tv' : 'movie';
        const id = card.id;
        if (!id) return null;

        const tmdbUrl = Lampa.TMDB.api(`${type}/${id}?api_key=${Lampa.TMDB.key()}&language=en-US`);

        try {
            const response = await fetch(tmdbUrl);
            const json = await response.json();
            return json.name || json.title;
        } catch (e) {
            return null;
        }
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

    async function trySearch(query) {
        log(`Ищем ID для: "${query}"...`);
        try {
            const q = `{ searchShows(search: "${query}", limit: 1) { id name } }`;
            const data = await apiRequest(q);
            if (data.searchShows && data.searchShows.length > 0) {
                return data.searchShows[0].id;
            }
        } catch (e) {}
        return null;
    }

    async function findShowId(card) {
        let titlesToTry = [];
        if (card.original_title) titlesToTry.push(card.original_title);
        if (card.original_name) titlesToTry.push(card.original_name);
        if (card.title) titlesToTry.push(card.title);
        if (card.name) titlesToTry.push(card.name);

        titlesToTry = [...new Set(titlesToTry)].filter(t => t);

        for (const query of titlesToTry) {
            const id = await trySearch(query);
            if (id) return id;
        }

        // Если не нашли, пробуем EN название
        const enTitle = await fetchEnglishTitle(card);
        if (enTitle) {
            let id = await trySearch(enTitle);
            if (id) return id;
            
            const cleanEn = cleanTitle(enTitle);
            if (cleanEn !== enTitle) {
                id = await trySearch(cleanEn);
                if (id) return id;
            }
        }
        return null;
    }

    async function getEpisodeData(showId, episodeNumber) {
        const q = `{ 
            searchEpisodes(search: "", showId: "${showId}", limit: 100) { 
                number 
                timestamps { at type { name } } 
            } 
        }`;
        try {
            const data = await apiRequest(q);
            const episodes = data.searchEpisodes || [];
            const targetEp = episodes.find(e => parseFloat(e.number) === parseFloat(episodeNumber));
            return targetEp ? targetEp.timestamps : null;
        } catch (e) {
            return null;
        }
    }

    function processTimestamps(timestamps) {
        if (!timestamps || !timestamps.length) return [];
        timestamps.sort((a, b) => a.at - b.at);
        let segments = [];
        for (let i = 0; i < timestamps.length; i++) {
            const curr = timestamps[i];
            const next = timestamps[i + 1];
            const typeName = curr.type ? curr.type.name : 'Unknown';

            if (SKIP_TYPES.some(t => typeName.toLowerCase().includes(t.toLowerCase()))) {
                if (next) {
                    segments.push({
                        start: curr.at,
                        end: next.at,
                        name: typeName
                    });
                }
            }
        }
        return segments;
    }

    // Функция внедрения в объект Lampa (как в вашем рабочем примере)
    function injectSegments(item, segments) {
        if (!item || typeof item !== 'object') return;

        if (!item.segments || typeof item.segments !== 'object' || Array.isArray(item.segments)) {
            item.segments = {};
        }
        if (!item.segments.skip || !Array.isArray(item.segments.skip)) {
            item.segments.skip = [];
        }

        // Добавляем только уникальные
        segments.forEach(seg => {
            const exists = item.segments.skip.some(s => s.start === seg.start);
            if (!exists) item.segments.skip.push(seg);
        });
    }

    // Главная функция поиска и подготовки данных
    async function prepareAnimeSkip(data) {
        let card = data.movie || data.card;
        if (!card) {
            const active = Lampa.Activity.active();
            if (active) card = active.movie || active.card;
        }

        let episodeNum = data.episode || data.e || data.episode_number;
        
        if (!card) return;
        
        if (!episodeNum) {
             const isSerial = card.number_of_seasons > 0 || (card.original_name && !card.original_title); 
             if (!isSerial) episodeNum = 1;
        }
        if (!episodeNum) episodeNum = 1;

        // 1. Ищем ID
        const showId = await findShowId(card);
        if (!showId) return;

        // 2. Ищем эпизоды
        const timestamps = await getEpisodeData(showId, episodeNum);
        if (!timestamps) return;

        // 3. Формируем сегменты
        const skipSegments = processTimestamps(timestamps);

        if (skipSegments.length > 0) {
            log(`Найдены сегменты (${skipSegments.length}), внедряем...`);
            
            // Внедряем в основной объект
            injectSegments(data, skipSegments);

            // Внедряем в плейлист (чтобы при переключении серий тоже работало, 
            // хотя для следующей серии нужно бы искать заново, но Lampa часто кеширует)
            if (data.playlist && Array.isArray(data.playlist)) {
                data.playlist.forEach(p => {
                    // Эвристика: если это тот же эпизод
                    if (p.episode === episodeNum || p.e === episodeNum) {
                         injectSegments(p, skipSegments);
                    }
                });
            }
            
            Lampa.Noty.show(`AnimeSkip: Пропуск готов (${skipSegments.length} зон)`);
        }
    }

    function startPlugin() {
        if (window.lampa_animeskip_v9) return;
        window.lampa_animeskip_v9 = true;
        console.log('AnimeSkip: V9 Loaded (Pre-load injection)');

        const originalPlay = Lampa.Player.play;
        
        Lampa.Player.play = function (data) {
            // Показываем лоадер Lampa
            Lampa.Loading.start(() => {
                // Если пользователь отменил, останавливаем
                Lampa.Loading.stop();
            });

            // Запускаем поиск
            prepareAnimeSkip(data).then(() => {
                // Когда поиск закончен (успешно или нет)
                Lampa.Loading.stop();
                // Запускаем оригинальный плеер с уже модифицированными данными
                originalPlay.call(this, data);
            }).catch(e => {
                console.error('AnimeSkip Fatal Error:', e);
                Lampa.Loading.stop();
                originalPlay.call(this, data);
            });
        };
    }

    if (window.Lampa && window.Lampa.Player) {
        startPlugin();
    } else {
        window.document.addEventListener('app_ready', startPlugin);
    }
})();
