(function () {
	"use strict";

	// Проверка окружения Lampa. Если нет - просто применяем стили без регистрации.
	function applyTorrentStyles() {
		// Базовые стили для торрентов
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
				"box-shadow": "0 0 0 0.4em #1aff00",
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

		// Вставка CSS-стилей в документ
		var style = document.createElement("style");
		style.setAttribute("data-torr-styles", "true");

		style.innerHTML = Object.keys(STYLES)
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

		document.head.appendChild(style);

		// Обновление стилей элементов торрентов
		function updateTorrentStyles() {
			// Подсветка "Seeds" если значение > 19
			var seeds = document.querySelectorAll(".torrent-item__seeds span");
			for (var i = 0; i < seeds.length; i++) {
				var spanSeeds = seeds[i];
				var valueSeeds = parseInt(spanSeeds.textContent, 10) || 0;
				if (valueSeeds > 19) spanSeeds.classList.add("high-seeds");
				else spanSeeds.classList.remove("high-seeds");
			}

			// Подсветка "Битрейт" если значение > 40
			var bitrates = document.querySelectorAll(".torrent-item__bitrate span");
			for (var j = 0; j < bitrates.length; j++) {
				var spanBr = bitrates[j];
				var valueBr = parseFloat(spanBr.textContent) || 0;
				if (valueBr > 40) spanBr.classList.add("high-bitrate");
				else spanBr.classList.remove("high-bitrate");
			}
		}

		function updateAll() {
			updateTorrentStyles();
		}

		// Наблюдение за изменениями DOM, чтобы применять стили при подгрузке торрентов
		var observer = new MutationObserver(function (mutations) {
			for (var i = 0; i < mutations.length; i++) {
				var m = mutations[i];
				if (m.addedNodes && m.addedNodes.length) {
					updateAll();
					break;
				}
			}
		});

		observer.observe(document.body, { childList: true, subtree: true });
		updateAll();
	}

	// Регистрация как "подтвержденного" плагина для Lampa
	function registerPlugin() {
		// Если API плагинов недоступен, просто применяем стили
		if (typeof window.Lampa === "undefined") {
			applyTorrentStyles();
			return;
		}

		// Если есть стандартный механизм регистрации плагинов
		// Имя должно быть стабильным и уникальным
		if (Lampa.Plugin && typeof Lampa.Plugin.create === "function") {
			Lampa.Plugin.create({
				id: "torr_styles",
				name: "Torrent Styles",
				version: "1.0.0",
				description: "Подсветка сидов, битрейта и улучшенная рамка фокуса для торрентов.",
				onLoad: function () {
					applyTorrentStyles();
				},
			});
		} else {
			// Запасной вариант: если плагин-система другая/отсутствует,
			// всё равно применяем стили, но без ломания загрузчика.
			applyTorrentStyles();
		}
	}

	registerPlugin();
})();
