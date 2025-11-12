(function () {
	"use strict";

	/**
	 * Имя и данные плагина
	 */
	var PLUGIN_ID = "torrent_styles_mod";
	var PLUGIN_NAME = "Torrent Styles MOD";
	var PLUGIN_VERSION = "1.0.1";
	var PLUGIN_DESCRIPTION = "Добавляет визуальные улучшения списка торрентов: подсветка сидов/битрейта, фокус и отступы.";

	/**
	 * Базовые стили для торрентов
	 */
	var STYLES = {
		// Подсветка "Seeds" если значение высокое
		".torrent-item__seeds span.high-seeds": {
			color: "#00b300",
			"font-weight": "bold",
		},

		// Подсветка "Битрейт" если значение высокое
		".torrent-item__bitrate span.high-bitrate": {
			color: "#b30000",
			"font-weight": "bold",
		},

		".torrent-item.selector.focus": {
			"box-shadow": "0 0 0 0.3em #1aff00",
		},

		".torrent-serial.selector.focus": {
			"box-shadow": "0 0 0 0.25em #1aff00",
		},

		".torrent-file.selector.focus": {
			"box-shadow": "0 0 0 0.25em #1aff00",
		},

		".torrent-item.focus::after": {
			border: "none",
		},

		// Небольшой отступ для области со списком торрентов
		".scroll__body": {
			margin: "5px",
		},
	};

	/**
	 * Вставка CSS-стилей в документ
	 */
	function injectStyles() {
		try {
			var style = document.createElement("style");
			var css = Object.keys(STYLES)
				.map(function (selector) {
					var props = STYLES[selector];
					var rules = Object.keys(props)
						.map(function (prop) {
							return prop + ": " + props[prop] + " !important";
						})
						.join("; ");
					return selector + " { " + rules + " }";
				})
				.join("\n");

			style.setAttribute("data-" + PLUGIN_ID + "-styles", "true");
			style.innerHTML = css;
			document.head.appendChild(style);
		} catch (e) {
			console.error("[" + PLUGIN_ID + "] style injection error:", e);
		}
	}

	/**
	 * Обновление стилей элементов торрентов
	 */
	function updateTorrentStyles() {
		try {
			// Подсветка "Seeds" если значение > 10
			document.querySelectorAll(".torrent-item__seeds span").forEach(function (span) {
				var value = parseInt(span.textContent, 10) || 0;
				if (value > 10) span.classList.add("high-seeds");
				else span.classList.remove("high-seeds");
			});

			// Подсветка "Битрейт" если значение > 50
			document.querySelectorAll(".torrent-item__bitrate span").forEach(function (span) {
				var value = parseFloat(span.textContent) || 0;
				if (value > 50) span.classList.add("high-bitrate");
				else span.classList.remove("high-bitrate");
			});
		} catch (e) {
			console.error("[" + PLUGIN_ID + "] torrent update error:", e);
		}
	}

	/**
	 * Наблюдение за изменениями DOM для обновления стилей
	 */
	function observeDom() {
		try {
			if (typeof MutationObserver === "undefined") {
				updateTorrentStyles();
				return;
			}

			var observer = new MutationObserver(function (mutations) {
				var hasAdded = false;
				for (var i = 0; i < mutations.length; i++) {
					if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
						hasAdded = true;
						break;
					}
				}
				if (hasAdded) updateTorrentStyles();
			});

			observer.observe(document.body, { childList: true, subtree: true });
			updateTorrentStyles();
		} catch (e) {
			console.error("[" + PLUGIN_ID + "] observer error:", e);
			updateTorrentStyles();
		}
	}

	/**
	 * Регистрация плагина в манифесте Lampa и установка флага готовности,
	 * чтобы платформа не считала плагин неподтвержденным.
	 */
	function registerPlugin() {
		try {
			if (typeof Lampa === "undefined") return;

			Lampa.Manifest = Lampa.Manifest || {};
			Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};

			Lampa.Manifest.plugins[PLUGIN_ID] = {
				type: "other",
				name: PLUGIN_NAME,
				version: PLUGIN_VERSION,
				description: PLUGIN_DESCRIPTION,
			};

			// Стандартный флаг готовности плагина
			window["plugin_" + PLUGIN_ID + "_ready"] = true;
		} catch (e) {
			console.error("[" + PLUGIN_ID + "] register error:", e);
		}
	}

	/**
	 * Старт плагина
	 */
	function start() {
		injectStyles();
		observeDom();
		registerPlugin();

		console.log("[" + PLUGIN_ID + "] Plugin started: torrent styles active");
	}

	/**
	 * Инициализация с учетом готовности Lampa
	 */
	(function init() {
		if (typeof Lampa !== "undefined") {
			if (window.appready) {
				start();
			} else if (Lampa.Listener && typeof Lampa.Listener.follow === "function") {
				Lampa.Listener.follow("app", function (e) {
					if (e.type === "ready") start();
				});
			} else {
				setTimeout(start, 500);
			}
		} else {
			// Режим без Lampa: применяем только стили и наблюдение за DOM
			injectStyles();
			observeDom();
			console.log("[" + PLUGIN_ID + "] Lampa not detected, DOM-only mode (styles only)");
		}
	})();
})();
