(function () {
	"use strict";

	var TIZEN_FIX = {
		id: "anime_smart_tizen",
		version: "11.0",
		gap: 90, // Дней перерыва для смены сезона

		// Превращаем "YYYY-MM-DD" в простое число дней (условно от 0 года)
		// Это позволяет избежать использования new Date(), который глючит на старых ТВ
		dateToDays: function (dateStr) {
			if (!dateStr || typeof dateStr !== "string") return 0;
			var parts = dateStr.split("-");
			if (parts.length !== 3) return 0;

			var y = parseInt(parts[0], 10);
			var m = parseInt(parts[1], 10);
			var d = parseInt(parts[2], 10);

			// Грубая, но достаточная для сравнения интервалов формула
			return y * 365 + m * 30 + d;
		},

		init: function () {
			// Убрал вывод в консоль через стили, чтобы не крашить логгер Tizen
			console.log("AnimeFix: Start v" + this.version);
			this.hook();
		},

		hook: function () {
			var _this = this;
			if (!window.$ || !window.$.ajax) {
				return setTimeout(function () {
					_this.hook();
				}, 200);
			}

			var originalAjax = window.$.ajax;

			window.$.ajax = function (url, options) {
				var settings = (typeof url === "object" ? url : options) || {};
				var reqUrl = (typeof url === "string" ? url : settings.url) || "";

				// Проверяем: это запрос сезона сериала?
				var match = reqUrl.match(/\/tv\/(\d+)\/season\/(\d+)/);

				if (match) {
					var tvId = match[1];
					var season = parseInt(match[2], 10);

					// Применяем фикс для всех сериалов
					{
						// Всегда качаем 1-й сезон (источник данных)
						var s1Url = reqUrl.replace(/\/season\/\d+/, "/season/1");

						// Используем стандартные колбеки AJAX
						var successCallback = settings.success;
						var errorCallback = settings.error;
						var completeCallback = settings.complete;

						// Подменяем AJAX запрос
						originalAjax({
							url: s1Url,
							type: "GET",
							dataType: "json",
							success: function (data) {
								try {
									// Обрабатываем данные
									var fixedData = _this.process(data, season, tvId);

									// Эмуляция ответа XHR
									var fakeXHR = {
										responseText: JSON.stringify(fixedData),
										responseJSON: fixedData,
										status: 200,
										statusText: "OK",
										readyState: 4,
									};

									// Вызываем "родные" функции Лампы
									if (successCallback) successCallback(fixedData, "success", fakeXHR);
									if (completeCallback) completeCallback(fakeXHR, "success");
								} catch (e) {
									console.log("AnimeFix: Process Error", e);
									// Если упало - пробуем отдать как есть (лучше, чем ничего)
									if (successCallback) successCallback(data, "success", { status: 200 });
								}
							},
							error: function (xhr, st, err) {
								// Если сеть упала совсем (даже на S1), тогда создаем заглушки
								// только если запрошен сезон > 1. Если 1 - отдаем ошибку.
								if (season > 1) {
									var stubs = _this.makeStubs(tvId, season);
									if (successCallback) successCallback(stubs, "success", { status: 200 });
								} else {
									if (errorCallback) errorCallback(xhr, st, err);
								}
							},
						});

						// Возвращаем объект-пустышку, совместимый с jQuery Promise
						// чтобы код Лампы, ожидающий возврата от $.ajax, не сломался
						var dummyDeferred = $.Deferred();
						var promise = dummyDeferred.promise();
						promise.abort = function () { };
						return promise;
					}
				}

				return originalAjax.apply(this, arguments);
			};
		},

		// Основная логика обработки данных
		process: function (data, requestedSeason, tvId) {
			// Полная копия данных через JSON. Самый безопасный способ клонирования в старых JS движках.
			var copyData = JSON.parse(JSON.stringify(data));
			var allEps = copyData.episodes || [];

			if (allEps.length === 0) return copyData;

			// 1. Группировка эпизодов по сезонам
			var seasonsMap = {}; // { 1: [ep...], 2: [ep...] }
			var currentSeason = 1;
			var lastDay = 0;

			// Сортируем эпизоды по номеру (на всякий случай)
			allEps.sort(function (a, b) {
				return a.episode_number - b.episode_number;
			});

			for (var i = 0; i < allEps.length; i++) {
				var ep = allEps[i];

				// Определяем день выхода
				var epDay = this.dateToDays(ep.air_date);

				// Логика разрыва сезонов
				// Если дата есть, и она отличается от предыдущей больше чем на gap
				if (epDay > 0 && lastDay > 0) {
					if (epDay - lastDay > this.gap) {
						currentSeason++;
						console.log("AnimeFix: Split found at EP " + ep.episode_number);
					}
				}

				if (epDay > 0) lastDay = epDay; // Обновляем дату только если она валидна

				if (!seasonsMap[currentSeason]) seasonsMap[currentSeason] = [];

				// Меняем данные эпизода для корректного отображения
				ep.season_number = currentSeason;
				// Важно! Для новых сезонов эпизоды начинаются с 1, 2, 3...
				ep.episode_number = seasonsMap[currentSeason].length + 1;

				// Формируем уникальный ID, чтобы Лампа считала их разными сериями
				ep.id = 900000 + currentSeason * 1000 + ep.episode_number;
				// Старый ID Лампы могут кэшировать просмотры, поэтому создаем синтетический ID,
				// НО (!) если серия существует, она может подтянуть старую метаинформацию.
				// На Тизен с этим осторожно. Попробуем оставить старые поля описания как есть.

				seasonsMap[currentSeason].push(ep);
			}

			// 2. Формируем ответ именно для того сезона, который запросили

			var resultEps = seasonsMap[requestedSeason] || [];

			// ЕСЛИ ЗАПРОШЕН 2-й СЕЗОН, А ОН ПУСТ? (например, TMDB еще не добавил даты или серии)
			// Но мы знаем, что балансеры уже залили серии.
			// Генерируем заглушки ТОЛЬКО если массив пуст.
			if (requestedSeason > 1 && resultEps.length === 0) {
				console.log("AnimeFix: Season empty, creating stubs");
				// Делаем ровно 12 заглушек (стандартный сезон)
				for (var k = 1; k <= 12; k++) {
					resultEps.push({
						id: 888000 + k,
						episode_number: k,
						name: "Episode " + k,
						air_date: "2025-01-01",
						overview: "Нет данных в TMDB. (SmartFix)",
						season_number: requestedSeason,
						still_path: null, // Картинки нет
						vote_average: 5.0,
					});
				}
			}

			// Обновляем объект ответа
			copyData.episodes = resultEps;
			copyData.name = "Season " + requestedSeason;
			copyData.season_number = requestedSeason;
			copyData._id = "smart_id_" + tvId + "_" + requestedSeason; // Уник. ID чтобы сбить кэш
			copyData.id = 50000 + requestedSeason * 100;

			return copyData;
		},

		makeStubs: function (tvId, sNum) {
			// Полностью фейковый ответ при ошибке сети
			var eps = [];
			for (var i = 1; i <= 12; i++) {
				eps.push({
					id: 777000 + i,
					episode_number: i,
					name: "Episode " + i,
					overview: "Offline Fix",
					season_number: sNum,
					air_date: "2025-01-01",
					still_path: null,
				});
			}
			return {
				episodes: eps,
				name: "Season " + sNum,
				season_number: sNum,
				overview: "",
				id: 666000,
				poster_path: null,
			};
		},
	};

	// Безопасная загрузка при старте
	function start() {
		if (window.ANIME_FIX_LOADED) return;
		window.ANIME_FIX_LOADED = true;
		TIZEN_FIX.init();
	}

	if (typeof Lampa !== "undefined") {
		if (window.appready) start();
		else
			Lampa.Listener.follow("app", function (e) {
				if (e.type == "ready") start();
			});
	} else {
		// Фоллбэк, если скрипт загрузился раньше Лампы
		var t = setInterval(function () {
			if (typeof Lampa !== "undefined") {
				clearInterval(t);
				if (window.appready) start();
				else
					Lampa.Listener.follow("app", function (e) {
						if (e.type == "ready") start();
					});
			}
		}, 100);
	}
})();
