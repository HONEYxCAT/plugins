(function () {
	"use strict";

	/**
	 * Имя плагина для отображения в интерфейсе (можно изменить по желанию)
	 */
	var PLUGIN_ID = "torrent_styles_mod";
	var PLUGIN_NAME = "Torrent Styles MOD";

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
		// ".scroll__body": {
		// 	margin: "5px",
		// },
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
			// Тихо игнорируем, чтобы не ломать плагин
			console.error(PLUGIN_NAME + " style injection error:", e);
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
			console.error(PLUGIN_NAME + " torrent update error:", e);
		}
	}

	function observeDom() {
		try {
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
			console.error(PLUGIN_NAME + " observer error:", e);
			// Если MutationObserver не сработал, просто один раз обновим
			updateTorrentStyles();
		}
	}

	/**
	 * Старт плагина
	 */
	function start() {
		injectStyles();
		observeDom();
	}

	/**
	 * Регистрация в Lampa, чтобы плагин считался "корректным"
	 * Код не ломает работу, если Lampa ещё не загружен или отсутствует.
	 */
	function register() {
		try {
			if (window.Lampa && Lampa.SettingsApi && typeof Lampa.SettingsApi.addComponent === "function") {
				// Добавляем компонент в настройки (как делают другие плагины)
				Lampa.SettingsApi.addComponent({
					component: PLUGIN_ID,
					name: PLUGIN_NAME,
					icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="3" ry="3" stroke="currentColor" stroke-width="2"/><path d="M7 13L10 16L17 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
				});

				// Статичный пункт в настройках, чтобы Lampa видела плагин
				if (typeof Lampa.SettingsApi.addParam === "function") {
					Lampa.SettingsApi.addParam({
						component: PLUGIN_ID,
						param: {
							name: PLUGIN_ID + "_info",
							type: "static",
						},
						field: {
							name: PLUGIN_NAME,
							description: "Подсветка сидов, битрейта и улучшенный фокус в списке торрентов",
						},
					});
				}
			}

			// Дополнительно помечаем, что плагин успешно инициализировался
			window["plugin_" + PLUGIN_ID + "_ready"] = true;
		} catch (e) {
			console.error(PLUGIN_NAME + " registration error:", e);
		}
	}

	/**
	 * Инициализация:
	 * - сразу запускаем стили и наблюдатель
	 * - регистрируемся как плагин Lampa (если доступен)
	 */
	start();
	register();
})();
