(function () {
    'use strict';

    const API_URL = 'https://api.anime-skip.com/graphql';
    const CLIENT_ID = 'ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE';
    const SKIP_TYPES = ['Intro', 'New Intro', 'Op', 'Opening', 'Recap', 'Credits', 'New Credits', 'Ed', 'Ending', 'Preview'];

    const log = (msg, data) => {
        if (data) console.log(`%c[AnimeSkip] ${msg}`, 'color: #a3fd39; font-weight: bold;', data);
        else console.log(`%c[AnimeSkip] ${msg}`, 'color: #a3fd39; font-weight: bold;');
    };

    // Очистка названия
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
        // Собираем названия из разных полей
        if (card.original_title) titlesToTry.push(card.original_title);
        if (card.original_name) titlesToTry.push(card.original_name);
        if (card.title) titlesToTry.push(card.title);
        if (card.name) titlesToTry.push(card.name);
        if (card.original_title) titlesToTry.push(cleanTitle(card.original_title));

        titlesToTry = [...new Set(titlesToTry)].filter(t => t);
        log('Список названий для поиска:', titlesToTry);

        for (const query of titlesToTry) {
            log(`Ищем ID для: "${query}"...`);
            try {
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
        }
        return null;
    }

    async function getEpisodeData(showId, episodeNumber) {
        const q = `{ findEpisodesByShowId(showId: "${showId}") { number timestamps { at type { name } } } }`;
        try {
            const data = await apiRequest(q);
            const episodes = data.findEpisodesByShowId || [];
            // Сравнение нестрогое (1 == "1")
            const targetEp = episodes.find(e => e.number == episodeNumber);

            if (!targetEp) {
                log(`❌ Эпизод ${episodeNumber} не найден в базе. Всего эпизодов: ${episodes.length}`);
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
        for (let i = 0; i < timestamps.length; i++) {
            const curr = timestamps[i];
            const next = timestamps[i + 1];
            const typeName = curr.type ? curr.type.name : 'Unknown';

            if (SKIP_TYPES.some(t => typeName.includes(t))) {
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

    async function runAnimeSkip(data) {
        log('--- HOOK: PLAY DATA ---', data);

        // 1. Пытаемся найти карточку в переданных данных
        let card = data.movie || data.card;
        
        // 2. Если нет, ищем в активном окне Lampa (это стандартный фоллбэк)
        if (!card) {
            log('В данных плеера нет карточки. Проверяем Activity.active()...');
            const active = Lampa.Activity.active();
            if (active) {
                card = active.movie || active.card;
                log('Активность:', active);
                if (card) log('Карточка найдена в Активности:', card.title || card.name);
            }
        }

        // 3. Определяем номер эпизода
        // Lampa часто передает episode, s, e или episode_number
        let episodeNum = data.episode || data.e || data.episode_number;
        
        // Если это фильм (нет сезонов) или мы не нашли номер, пробуем 1
        if (!episodeNum && card) {
             // Проверка на сериальность в Lampa
             const isSerial = card.number_of_seasons > 0 || (card.original_name && !card.original_title); 
             if (!isSerial) episodeNum = 1;
        }

        if (!card) {
            log('❌ Не удалось найти информацию о фильме/сериале ни в плеере, ни в активности.');
            return;
        }
        
        if (!episodeNum) {
            log('⚠️ Нет номера эпизода. Возможно это первый запуск или данные неполные. Пробуем искать эпизод "1".');
            episodeNum = 1;
        }

        log(`>>> ЗАПУСК ПОИСКА: ${card.original_title || card.title} | Эпизод: ${episodeNum}`);
        Lampa.Noty.show(`AnimeSkip: Поиск для ${card.original_title || card.title}...`);

        const showId = await findShowId(card);
        if (!showId) {
            log('❌ Аниме не найдено в базе.');
            return;
        }

        const timestamps = await getEpisodeData(showId, episodeNum);
        if (!timestamps) return;

        const skipSegments = processTimestamps(timestamps);

        if (skipSegments.length > 0) {
            log('✅ Внедряем сегменты:', skipSegments);
            
            let currentSegments = Lampa.Segments.all() || {};
            if(!currentSegments.skip) currentSegments.skip = [];
            
            // Объединяем, чтобы не затереть другие (например, рекламу)
            // Но проверяем на дубликаты примитивно
            skipSegments.forEach(s => {
                 currentSegments.skip.push(s);
            });

            Lampa.Segments.set(currentSegments);
            Lampa.Noty.show(`AnimeSkip: Пропуск готов (${skipSegments.length} зон)`);
        } else {
            log('Сегменты найдены, но пропускать нечего (Intro/Ending не обнаружены).');
        }
    }

    function startPlugin() {
        if (window.lampa_animeskip_v7_1) return;
        window.lampa_animeskip_v7_1 = true;
        console.log('AnimeSkip: Debug V7.1 Loaded');

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
