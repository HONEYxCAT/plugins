(function () {
	// Базовые стили для торрентов
	const STYLES = {
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

		// Небольшой отступ для области со списком торрентов
		".scroll__body": {
			margin: "5px",
		},
	};

	// Вставка CSS-стилей в документ
	let style = document.createElement("style");
	style.innerHTML = Object.entries(STYLES)
		.map(([selector, props]) => {
			const rules = Object.entries(props)
				.map(([prop, val]) => `${prop}: ${val} !important`)
				.join("; ");
			return `${selector} { ${rules} }`;
		})
		.join("\n");
	document.head.appendChild(style);

	// Обновление стилей элементов торрентов
	function updateTorrentStyles() {
		// Подсветка "Seeds" если значение > 19
		document.querySelectorAll(".torrent-item__seeds span").forEach((span) => {
			const value = parseInt(span.textContent) || 0;
			span.classList.toggle("high-seeds", value > 19);
		});

		// Подсветка "Битрейт" если значение > 40
		document.querySelectorAll(".torrent-item__bitrate span").forEach((span) => {
			const value = parseFloat(span.textContent) || 0;
			span.classList.toggle("high-bitrate", value > 40);
		});
	}

	function updateAll() {
		updateTorrentStyles();
	}

	// Наблюдение за изменениями DOM, чтобы применять стили при подгрузке торрентов
	const observer = new MutationObserver((mutations) => {
		if (mutations.some((m) => m.addedNodes && m.addedNodes.length)) {
			updateAll();
		}
	});

	observer.observe(document.body, { childList: true, subtree: true });
	updateAll();
})();
