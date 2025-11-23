(function () {
	"use strict";

	const API_URL = "https://api.anime-skip.com/graphql";
	const CLIENT_ID = "ZGfO0sMF3eCwLYf8yMSCJjlynwNGRXWE";
	// Типы, которые ищем для пропуска
	const SKIP_TYPES = ["Intro", "New Intro", "Op", "Opening", "Recap", "Credits", "New Credits", "Ed", "Ending", "Preview"];

	function cleanTitle(title) {
		if (!title) return "";
		return title
			.replace(/\(\d{4}\)/g, "")
			.replace(/\(TV\)/gi, "")
			.replace(/Season \d+/gi, "")
			.replace(/[:\-]/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	}

	// Получение английского названия
	async function fetchEnglishTitle(card) {
		if (!window.Lampa || !window.Lampa.TMDB) return null;
		const type = card.name || card.original_name ? "tv" : "movie";
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
				method: "POST",
				headers: { "Content-Type": "application/json", "X-Client-ID": CLIENT_ID },
				body: JSON.stringify({ query }),
			});
			const json = await res.json();
			if (json.errors) throw new Error(json.errors[0].message);
			return json.data;
		} catch (e) {
			throw e;
		}
	}

	async function trySearch(query) {
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

		titlesToTry = [...new Set(titlesToTry)].filter((t) => t);

		for (const query of titlesToTry) {
			const id = await trySearch(query);
			if (id) return id;
		}

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

	// --- ИЗМЕНЕННАЯ ФУНКЦИЯ ПОИСКА ЭПИЗОДА ---
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

			// 1. Находим ВСЕ эпизоды с нужным номером (а не только первый попавшийся)
			const candidates = episodes.filter((e) => parseFloat(e.number) === parseFloat(episodeNumber));

			if (candidates.length === 0) return null;

			// Если кандидат один - возвращаем его
			if (candidates.length === 1) return candidates[0].timestamps;

			// 2. Если кандидатов несколько, сортируем их по "качеству"
			candidates.sort((a, b) => {
				const getScore = (ep) => {
					if (!ep.timestamps) return 0;
					let score = 0;
					const typeNames = ep.timestamps.map((t) => (t.type ? t.type.name.toLowerCase() : ""));

					// ПРИОРИТЕТ 1: Наличие "New Intro" или "New Credits" (как в Mob Psycho)
					// Даем много очков, чтобы перебить всё остальное
					if (typeNames.some((name) => name.includes("new intro") || name.includes("new credits"))) {
						score += 50;
					}

					// ПРИОРИТЕТ 2: Наличие стандартных маркеров (Intro, Op, Ed)
					if (typeNames.some((name) => name.includes("intro") || name.includes("op") || name.includes("opening"))) {
						score += 10;
					}
					if (typeNames.some((name) => name.includes("ending") || name.includes("ed") || name.includes("credits"))) {
						score += 10;
					}

					// ПРИОРИТЕТ 3: Количество таймкодов.
					// Обычно версия с 8 точками лучше версии с 2 точками.
					score += ep.timestamps.length;

					return score;
				};

				return getScore(b) - getScore(a); // Сортировка от большего к меньшему
			});

			return candidates[0].timestamps;
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
			const typeName = curr.type ? curr.type.name : "Unknown";

			if (SKIP_TYPES.some((t) => typeName.toLowerCase().includes(t.toLowerCase()))) {
				if (next) {
					segments.push({
						start: curr.at,
						end: next.at,
						name: typeName,
					});
				}
			}
		}
		return segments;
	}

	function injectSegments(item, segments) {
		if (!item || typeof item !== "object") return;

		if (!item.segments || typeof item.segments !== "object" || Array.isArray(item.segments)) {
			item.segments = {};
		}
		if (!item.segments.skip || !Array.isArray(item.segments.skip)) {
			item.segments.skip = [];
		}

		segments.forEach((seg) => {
			const exists = item.segments.skip.some((s) => s.start === seg.start);
			if (!exists) item.segments.skip.push(seg);
		});
	}

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

		const showId = await findShowId(card);
		if (!showId) return;

		const timestamps = await getEpisodeData(showId, episodeNum);
		if (!timestamps) return;

		const skipSegments = processTimestamps(timestamps);

		if (skipSegments.length > 0) {
			injectSegments(data, skipSegments);

			if (data.playlist && Array.isArray(data.playlist)) {
				data.playlist.forEach((p) => {
					if (p.episode === episodeNum || p.e === episodeNum) {
						injectSegments(p, skipSegments);
					}
				});
			}
		}
	}

	function startPlugin() {
		if (window.lampa_animeskip_v10) return; // Поднял версию для проверки
		window.lampa_animeskip_v10 = true;

		const originalPlay = Lampa.Player.play;

		Lampa.Player.play = function (data) {
			Lampa.Loading.start(() => {
				Lampa.Loading.stop();
			});

			prepareAnimeSkip(data)
				.then(() => {
					Lampa.Loading.stop();
					originalPlay.call(this, data);
				})
				.catch((e) => {
					Lampa.Loading.stop();
					originalPlay.call(this, data);
				});
		};
	}

	if (window.Lampa && window.Lampa.Player) {
		startPlugin();
	} else {
		window.document.addEventListener("app_ready", startPlugin);
	}
})();
