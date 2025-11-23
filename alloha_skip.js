(function () {
	"use strict";

	// Настройки серверов
	const SERVERS = ["http://online3.skaz.tv/", "http://online4.skaz.tv/", "http://online5.skaz.tv/"];

	// Выбираем случайный сервер
	const HOST = SERVERS[Math.floor(Math.random() * SERVERS.length)];

	const log = (msg, data) => {
		if (data) console.log(`%c[AllohaSkip] ${msg}`, "color: #a3fd39; font-weight: bold;", data);
		else console.log(`%c[AllohaSkip] ${msg}`, "color: #a3fd39; font-weight: bold;");
	};

	// --- ХЕЛПЕРЫ ---

	function signUrl(url) {
		let uid = Lampa.Storage.get("lampac_unic_id", "");
		let email = Lampa.Storage.get("account_email", "");

		if (!uid) {
			uid = Lampa.Utils.uid(8).toLowerCase();
			Lampa.Storage.set("lampac_unic_id", uid);
		}
		// Используем реальную почту, если она есть в настройках, иначе заглушку
		if (!email) email = "guest@lampa.mx";

		const addParam = (u, p) => u + (u.indexOf("?") >= 0 ? "&" : "?") + p;

		url = url + "";
		if (url.indexOf("account_email=") === -1) url = addParam(url, "account_email=" + encodeURIComponent(email));
		if (url.indexOf("uid=") === -1) url = addParam(url, "uid=" + encodeURIComponent(uid));
		if (url.indexOf("token=") === -1) url = addParam(url, "token=");

		return url;
	}

	function request(url) {
		return new Promise((resolve, reject) => {
			const network = new Lampa.Reguest();
			network.silent(
				url,
				(response) => resolve(response),
				(error) => reject(error),
				false,
				{ dataType: "text" },
			);
		});
	}

	const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

	// --- ОСНОВНАЯ ЛОГИКА ---

	async function findSegments(card, season, episode) {
		const title = card.title || card.name;
		const origTitle = card.original_title || card.original_name;
		const year = (card.release_date || card.first_air_date || "0000").slice(0, 4);

		const paramsMap = {
			id: card.id,
			imdb_id: card.imdb_id || "",
			kinopoisk_id: card.kinopoisk_id || "",
			title: title,
			original_title: origTitle,
			year: year,
			serial: card.number_of_seasons || season > 0 ? 1 : 0,
			source: "tmdb",
			life: true,
		};

		const query = Object.keys(paramsMap)
			.map((k) => `${k}=${encodeURIComponent(paramsMap[k])}`)
			.join("&");

		try {
			// ШАГ 1: Инициализация поиска
			log(`Поиск Alloha для: ${title} S${season}E${episode}`);

			let url = signUrl(`${HOST}lite/events?${query}`);
			let text = await request(url);
			let json = JSON.parse(text);

			let allohaData = null;

			// Обработка режима Life (с повторными попытками)
			if (json.life && json.memkey) {
				log(`Включен режим Life (key: ${json.memkey}), ожидание результатов...`);

				// Делаем до 5 попыток с интервалом 1.5 сек
				for (let attempt = 1; attempt <= 5; attempt++) {
					await sleep(1500);

					const urlLife = signUrl(`${HOST}lifeevents?memkey=${json.memkey}&${query}`);
					try {
						let textLife = await request(urlLife);
						let jsonLife = JSON.parse(textLife);

						// Проверяем, есть ли Alloha в ответе
						const list = Array.isArray(jsonLife) ? jsonLife : jsonLife.online || [];
						const found = list.find((i) => i.name && i.name.toLowerCase().includes("alloha"));

						if (found) {
							allohaData = found;
							log(`Alloha найдена на попытке ${attempt}`);
							break;
						} else {
							log(`Попытка ${attempt}: Alloha пока не найдена...`);
						}
					} catch (err) {
						log(`Ошибка запроса Life попытка ${attempt}`, err);
					}
				}
			} else {
				// Если не Life режим, ищем сразу
				const list = Array.isArray(json) ? json : json.online || [];
				allohaData = list.find((i) => i.name && i.name.toLowerCase().includes("alloha"));
			}

			if (!allohaData) {
				log("Alloha так и не найдена в списке балансеров");
				return null;
			}

			log("Начинаем навигацию по Alloha...");

			// ШАГ 2: Навигация
			let currentUrl = signUrl(`${allohaData.url}${allohaData.url.includes("?") ? "&" : "?"}${query}`);
			let steps = 0;

			while (steps < 5) {
				steps++;
				const respText = await request(currentUrl);

				let isJson = false;
				let data = null;

				if (respText.trim().startsWith("{") || respText.trim().startsWith("[")) {
					try {
						data = JSON.parse(respText);
						isJson = true;
					} catch (e) {}
				}

				if (isJson) {
					if (data.segments) return data.segments; // УСПЕХ

					if (data.url && !data.playlist) {
						currentUrl = signUrl(data.url);
						continue;
					}
				}

				const $html = $(`<div>${respText}</div>`);
				const items = $html.find(".videos__item");

				if (items.length === 0 && !isJson) {
					log("Тупик: пустой ответ");
					break;
				}

				const firstEl = items.first();
				const hasEpisode = firstEl.attr("e") !== undefined;
				let targetItem = null;

				if (!hasEpisode) {
					// Переводы: берем первый
					targetItem = firstEl;
				} else {
					// Эпизоды: ищем нужный
					items.each((i, el) => {
						const $el = $(el);
						if ($el.attr("s") == season && $el.attr("e") == episode) {
							targetItem = $el;
							return false;
						}
					});
					// Если точного нет, берем первый
					if (!targetItem) targetItem = firstEl;
				}

				const jsonData = targetItem.data("json");
				if (jsonData && jsonData.url) {
					currentUrl = signUrl(jsonData.url);
				} else {
					log("URL не найден в элементе");
					break;
				}
			}
		} catch (e) {
			console.error("[AllohaSkip] Ошибка:", e);
		}

		return null;
	}

	function processSegments(allohaData) {
		if (!allohaData || !allohaData.skip || !Array.isArray(allohaData.skip)) return [];
		return allohaData.skip.map((item) => ({
			start: item.start,
			end: item.end,
			name: "Пропустить",
		}));
	}

	function injectSegments(item, segments) {
		if (!item || typeof item !== "object") return;
		if (!item.segments) item.segments = {};
		if (!item.segments.skip) item.segments.skip = [];

		segments.forEach((seg) => {
			const exists = item.segments.skip.some((s) => s.start === seg.start);
			if (!exists) item.segments.skip.push(seg);
		});
	}

	async function prepareAllohaSkip(data) {
		let card = data.movie || data.card;
		if (!card) {
			const active = Lampa.Activity.active();
			if (active) card = active.movie || active.card;
		}

		let episode = data.episode || data.e || data.episode_number || 1;
		let season = data.season || data.s || 1;

		const isSerial = card.number_of_seasons > 0 || (card.original_name && !card.original_title);
		if (!isSerial) {
			season = 1;
			episode = 1;
		}

		if (!card) return;

		const rawSegments = await findSegments(card, season, episode);

		if (rawSegments) {
			const lampaSegments = processSegments(rawSegments);
			if (lampaSegments.length > 0) {
				log(`Найдено ${lampaSegments.length} меток`);
				injectSegments(data, lampaSegments);
				if (data.playlist && Array.isArray(data.playlist)) {
					data.playlist.forEach((p) => {
						if (p.episode == episode && p.season == season) {
							injectSegments(p, lampaSegments);
						}
					});
				}
				Lampa.Noty.show(`AllohaSkip: Метки добавлены (${lampaSegments.length})`);
			}
		} else {
			log("Метки не найдены");
		}
	}

	function startPlugin() {
		if (window.lampa_alloha_skip) return;
		window.lampa_alloha_skip = true;
		log("Plugin Loaded v1.1");

		const originalPlay = Lampa.Player.play;

		Lampa.Player.play = function (data) {
			Lampa.Loading.start(() => {
				Lampa.Loading.stop();
				originalPlay.call(this, data);
			});

			prepareAllohaSkip(data)
				.then(() => {
					Lampa.Loading.stop();
					originalPlay.call(this, data);
				})
				.catch((e) => {
					log("Fatal Error", e);
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
