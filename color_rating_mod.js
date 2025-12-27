(function () {
	"use strict";

	var InterFaceMod = {
		name: "interface_mod_ratings_only",
		version: "1.0.0",
		debug: false,
		settings: {
			colored_ratings: true,
		},
	};

	function updateVoteColors() {
		if (!InterFaceMod.settings.colored_ratings) return;

		function applyColorByRating(element) {
			var $el = $(element);
			var voteText = $el.text().trim();

			if (/^\d+(\.\d+)?K$/.test(voteText)) {
				return;
			}

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
				color = "darkmagenta";
			} else if (vote >= 8 && vote <= 10) {
				color = "lawngreen";
			}

			if (color) {
				$el.css("color", color);
			}
		}

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

	function setupVoteColorsObserver() {
		if (!InterFaceMod.settings.colored_ratings) return;

		setTimeout(updateVoteColors, 300);

		var observer = new MutationObserver(function () {
			setTimeout(updateVoteColors, 100);
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	function setupVoteColorsForDetailPage() {
		if (!InterFaceMod.settings.colored_ratings) return;

		if (!window.Lampa || !Lampa.Listener) return;

		Lampa.Listener.follow("full", function (data) {
			if (data.type === "complite") {
				setTimeout(updateVoteColors, 100);
			}
		});
	}

	function startPlugin() {
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
		if (document.readyState === "complete" || document.readyState === "interactive") {
			startPlugin();
		} else {
			document.addEventListener("DOMContentLoaded", startPlugin);
		}
	}

	if (window.Lampa) {
		Lampa.Manifest = Lampa.Manifest || {};
		Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};
		Lampa.Manifest.plugins.interface_mod_ratings_only = {
			name: "Цветные рейтинги",
			version: InterFaceMod.version,
			description: "Подсветка рейтингов в зависимости от оценки",
		};
	}

	window.interface_mod_ratings_only = InterFaceMod;
})();
