(function () {
	"use strict";

	// Основной объект плагина, оставляем только то, что нужно для подсветки рейтингов
	var InterFaceMod = {
		name: "interface_mod_ratings_only",
		version: "1.0.0",
		debug: false,
		settings: {
			colored_ratings: true,
		},
	};

	// Функция для изменения цвета рейтинга фильмов и сериалов
	function updateVoteColors() {
		if (!InterFaceMod.settings.colored_ratings) return;

		// Функция для изменения цвета элемента в зависимости от рейтинга
		function applyColorByRating(element) {
			var $el = $(element);
			var voteText = $el.text().trim();

			// Если значение оканчивается на одиночную 'K' (например, 3.6K), игнорируем подсветку,
			if (/^\d+(\.\d+)?K$/.test(voteText)) {
				return;
			}

			// Регулярное выражение для извлечения числа из текста
			var match = voteText.match(/(\d+(\.\d+)?)/);
			if (!match) return;

			var vote = parseFloat(match[0]);
			if (isNaN(vote)) return;

			var color = "";

			if (vote >= 0 && vote <= 3) {
				color = "red";
			} else if (vote > 3 && vote < 6) {
				color = "orange";
			} else if (vote >= 6 && vote < 7) {
				color = "cornflowerblue";
			} else if (vote >= 7 && vote < 8) {
				color = "purple";
			} else if (vote >= 8 && vote <= 10) {
				color = "lawngreen";
			}

			if (color) {
				$el.css("color", color);
			}
		}

		// Обрабатываем рейтинги на карточках, в списках и в детальных страницах
		$(".card__vote").each(function () {
			applyColorByRating(this);
		});

		$(".full-start__rate, .full-start-new__rate").each(function () {
			applyColorByRating(this);
		});

		$(".info__rate, .card__imdb-rate, .card__kinopoisk-rate").each(function () {
			applyColorByRating(this);
		});
	}

	// Наблюдатель за изменениями в DOM для обновления цветов рейтинга
	function setupVoteColorsObserver() {
		if (!InterFaceMod.settings.colored_ratings) return;

		// Первичное обновление
		setTimeout(updateVoteColors, 300);

		// Наблюдаем за изменениями DOM и пере-применяем цвета
		var observer = new MutationObserver(function () {
			setTimeout(updateVoteColors, 100);
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	// Слушатель для детальных страниц (карточек)
	function setupVoteColorsForDetailPage() {
		if (!InterFaceMod.settings.colored_ratings) return;

		if (!window.Lampa || !Lampa.Listener) return;

		Lampa.Listener.follow("full", function (data) {
			if (data.type === "complite") {
				setTimeout(updateVoteColors, 100);
			}
		});
	}

	// Инициализация плагина
	function startPlugin() {
		// Если есть сохранённое значение настройки подсветки, учитываем его
		if (window.Lampa && Lampa.Storage) {
			var stored = Lampa.Storage.get("colored_ratings");
			if (typeof stored === "boolean") {
				InterFaceMod.settings.colored_ratings = stored;
			}
		}

		if (InterFaceMod.settings.colored_ratings) {
			setupVoteColorsObserver();
			setupVoteColorsForDetailPage();
		}
	}

	// Ждем готовности приложения Lampa, если оно есть
	if (window.Lampa) {
		if (window.appready) {
			startPlugin();
		} else {
			Lampa.Listener.follow("app", function (event) {
				if (event.type === "ready") {
					startPlugin();
				}
			});
		}
	} else {
		// Если Lampa нет, просто пробуем применить подсветку после загрузки DOM
		if (document.readyState === "complete" || document.readyState === "interactive") {
			startPlugin();
		} else {
			document.addEventListener("DOMContentLoaded", startPlugin);
		}
	}

	// Регистрация плагина в манифесте (минимальная)
	if (window.Lampa) {
		Lampa.Manifest = Lampa.Manifest || {};
		Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};
		Lampa.Manifest.plugins.interface_mod_ratings_only = {
			name: "Цветные рейтинги",
			version: InterFaceMod.version,
			description: "Подсветка рейтингов в зависимости от оценки",
		};
	}

	// Экспортируем объект для внешнего доступа при необходимости
	window.interface_mod_ratings_only = InterFaceMod;
})();
