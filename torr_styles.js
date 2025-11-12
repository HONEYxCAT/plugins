(function () {
	"use strict";

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
	var css = "";

	for (var selector in STYLES) {
		if (!STYLES.hasOwnProperty(selector)) continue;

		var props = STYLES[selector];
		var rules = "";
		for (var prop in props) {
			if (!props.hasOwnProperty(prop)) continue;

			if (rules.length) rules += "; ";
			rules += prop + ": " + props[prop] + " !important";
		}
		css += selector + " { " + rules + " }\n";
	}

	style.innerHTML = css;

	if (document.head) {
		document.head.appendChild(style);
	} else {
		document.addEventListener("DOMContentLoaded", function () {
			document.head.appendChild(style);
		});
	}

	// Обновление стилей элементов торрентов
	function updateTorrentStyles() {
		// Подсветка "Seeds" если значение > 19
		var seeds = document.querySelectorAll(".torrent-item__seeds span");
		for (var i = 0; i < seeds.length; i++) {
			var span = seeds[i];
			var value = parseInt(span.textContent, 10) || 0;

			if (value > 19) {
				span.classList.add("high-seeds");
			} else {
				span.classList.remove("high-seeds");
			}
		}

		// Подсветка "Битрейт" если значение > 40
		var bitrates = document.querySelectorAll(".torrent-item__bitrate span");
		for (var j = 0; j < bitrates.length; j++) {
			var spanBitrate = bitrates[j];

			// На всякий случай заменим запятую на точку
			var text = spanBitrate.textContent ? spanBitrate.textContent.replace(",", ".") : "";
			var valueBitrate = parseFloat(text) || 0;

			if (valueBitrate > 40) {
				spanBitrate.classList.add("high-bitrate");
			} else {
				spanBitrate.classList.remove("high-bitrate");
			}
		}
	}

	function updateAll() {
		updateTorrentStyles();
	}

	// Наблюдение за изменениями DOM, чтобы применять стили при подгрузке торрентов
	if (typeof MutationObserver !== "undefined") {
		var observer = new MutationObserver(function (mutations) {
			var needUpdate = false;

			for (var k = 0; k < mutations.length; k++) {
				var m = mutations[k];
				if (m.addedNodes && m.addedNodes.length) {
					needUpdate = true;
					break;
				}
			}

			if (needUpdate) {
				updateAll();
			}
		});

		if (document.body) {
			observer.observe(document.body, { childList: true, subtree: true });
		} else {
			document.addEventListener("DOMContentLoaded", function () {
				observer.observe(document.body, { childList: true, subtree: true });
				updateAll();
			});
			return;
		}
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", updateAll);
	} else {
		updateAll();
	}
})();
