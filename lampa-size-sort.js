// lampa-size-sort.js
// Плагин добавляет в меню фильтров сортировку по размеру торрент-файла.
// Для личного использования. Подстраивай RESULT_SIZE_FIELDS под свои источники.

(function () {
	if (!window.Lampa) {
		console.warn("Lampa не обнаружена. Подключай плагин после запуска приложения.");
		return;
	}

	// --- НАСТРОЙКИ: возможные имена поля размера в объектах результатов ---
	var RESULT_SIZE_FIELDS = ["size", "filesize", "file_size", "torrent_size", "bytes"];
	// если источник возвращает строку вроде "1.4 GB" — плагин распознает и её.
	// если источник хранит размер в байтах (число) — тоже распознает.

	// --- Утилита: парсер размера в байтах ---
	function parseSizeToBytes(val) {
		if (val === undefined || val === null) return null;

		if (typeof val === "number") {
			if (val > 1024) {
				// не уверены, число — в байтах, килобайтах или мегабайтах; предполагаем байты
				return Math.floor(val);
			} else {
				return Math.floor(val);
			}
		}

		if (typeof val !== "string") return null;

		var s = val.trim().toLowerCase();

		// если это чистое число (без единиц), попробуем привести к числу — предполагаем байты
		if (/^[0-9]+$/.test(s)) return parseInt(s, 10);

		// общие шаблоны: "1.4 gb", "700mb", "123 B", "1 024 KB", "1,5 ГБ"
		s = s.replace(/\s+/g, "");
		s = s.replace(",", ".");
		// русская аббревиатура ГБ, МБ, КБ
		s = s.replace("гб", "gb").replace("мб", "mb").replace("кб", "kb").replace("байт", "b");

		var m = s.match(/^([\d.]+)(b|kb|mb|gb|tb)?$/i);
		if (!m) return null;

		var num = parseFloat(m[1]);
		var unit = (m[2] || "b").toLowerCase();

		switch (unit) {
			case "tb":
				return Math.round(num * 1024 * 1024 * 1024 * 1024);
			case "gb":
				return Math.round(num * 1024 * 1024 * 1024);
			case "mb":
				return Math.round(num * 1024 * 1024);
			case "kb":
				return Math.round(num * 1024);
			default:
				return Math.round(num);
		}
	}

	// --- Вытаскиваем размер из объекта результата (попробовать несколько полей) ---
	function getSizeFromResult(item) {
		if (!item || typeof item !== "object") return null;

		for (var i = 0; i < RESULT_SIZE_FIELDS.length; i++) {
			var f = RESULT_SIZE_FIELDS[i];
			if (item.hasOwnProperty(f)) {
				var n = parseSizeToBytes(item[f]);
				if (n !== null) return n;
			}
		}

		// иногда размер находится в описании/summary/title, попытаемся найти паттерн
		var textCandidates = [item.title, item.name, item.description, item.info, item.summary];
		for (var j = 0; j < textCandidates.length; j++) {
			var t = textCandidates[j];
			if (!t) continue;
			var match = t.match(/([\d.,]+\s?(?:TB|GB|MB|KB|ТБ|ГБ|МБ|КБ|байт))/i);
			if (match) {
				var n = parseSizeToBytes(match[1]);
				if (n !== null) return n;
			}
		}

		return null;
	}

	// --- Сортировка массива результатов ---
	function sortResultsBySize(arr, direction) {
		// direction: 'asc' | 'desc'
		if (!Array.isArray(arr)) return arr;

		return arr.slice().sort(function (a, b) {
			var sa = getSizeFromResult(a);
			var sb = getSizeFromResult(b);

			// элементы без размера будут считаться меньше любого найденного размера
			if (sa === null && sb === null) return 0;
			if (sa === null) return direction === "asc" ? -1 : 1;
			if (sb === null) return direction === "asc" ? 1 : -1;

			if (sa === sb) return 0;
			if (direction === "asc") return sa - sb;
			return sb - sa;
		});
	}

	// --- Добавляем пункт фильтра в меню Lampa (универсальный вариант) ---
	function addFilterUI() {
		try {
			// пытаться использовать доступные API Lampa; если их нет — работать через DOM как fallback
			if (Lampa && Lampa.Filter && typeof Lampa.Filter.add === "function") {
				// id 'size_sort' и две опции
				Lampa.Filter.add("size_sort", "Размер файла", [
					{ title: "Нет", value: "none" },
					{ title: "По возрастанию", value: "size_asc" },
					{ title: "По убыванию", value: "size_desc" },
				]);
				console.log("Плагин Lampa: добавлен фильтр size_sort через Lampa.Filter.");
				return;
			}
		} catch (e) {
			console.warn("Ошибка при попытке добавить фильтр через Lampa.Filter", e);
		}

		// Fallback: попытка добавить в DOM меню фильтров (возможно потребуется адаптация под тему)
		try {
			var menu = document.querySelector(".filter-panel, .filters, .lampa-filter");
			if (!menu) return;
			var wrapper = document.createElement("div");
			wrapper.className = "lampa-size-sort";
			wrapper.innerHTML = '<label style="display:block;margin:8px 0;color:#fff">Сортировать по размеру</label>' + '<select id="lampa-size-sort-select" style="width:100%;padding:6px">' + '<option value="none">Не сортировать</option>' + '<option value="size_asc">По возрастанию</option>' + '<option value="size_desc">По убыванию</option>' + "</select>";
			menu.appendChild(wrapper);
			console.log("Плагин Lampa: добавлен DOM fallback фильтр.");
		} catch (e) {
			console.warn("Не удалось добавить DOM фильтр", e);
		}
	}

	// --- Перехват и обработка результатов ---
	function attachSorter() {
		// Попытаемся найти общий обработчик, который Lampa вызывает при получении JSON результатов.
		// Подход: перехватить функцию, которая рендерит список — Lampa часто использует Lampa.Component или Lampa.Controller.
		// Здесь реализован универсальный метод: патчим Array.prototype.sort вызовом обёртки не трогая Lampa.
		// Но более безопасно — слушать изменения DOM списка и при появлении элементов переставлять их.
		// Поэтому используем MutationObserver для контейнера результатов.

		var tryContainers = [
			".catalog .catalog-list", // возможные селекторы
			".search-result",
			".items",
			".catalog",
		];

		function findContainer() {
			for (var i = 0; i < tryContainers.length; i++) {
				var el = document.querySelector(tryContainers[i]);
				if (el) return el;
			}
			// fallback: попробуем найти родитель с классом items
			return document.querySelector("[data-list]");
		}

		var container = null;
		var observer = null;

		function startObserver() {
			if (observer) observer.disconnect();
			container = findContainer();
			if (!container) {
				// если контейнер не найден, пробуем ещё раз через 1.5 секунды
				setTimeout(startObserver, 1500);
				return;
			}

			observer = new MutationObserver(function (muts) {
				muts.forEach(function (m) {
					// при добавлении новых нод — попробуем отсортировать если активен фильтр
					if (m.addedNodes && m.addedNodes.length) {
						applySortToCurrentList();
					}
				});
			});

			observer.observe(container, { childList: true, subtree: true });
			console.log("Плагин Lampa: наблюдатель контейнера результатов включён.");
		}

		// получаем выбор фильтра (через Lampa.Filter API или через наш DOM select)
		function getSelectedSort() {
			try {
				if (Lampa && Lampa.Filter && typeof Lampa.Filter.get === "function") {
					var v = Lampa.Filter.get("size_sort");
					if (v) return v;
				}
			} catch (e) {}

			var sel = document.getElementById("lampa-size-sort-select");
			if (sel) return sel.value;
			return "none";
		}

		// попытаемся получить список объектов результатов, которые Lampa использует для рендера.
		// Это наиболее специфичная часть: разные плагины/темы хранят данные в разных местах.
		// Мы попробуем несколько подходов: 1) если в контейнере есть data-item-obj — читать оттуда,
		// 2) если элементы DOM содержат JSON в атрибуте data-json — распарсить,
		// 3) если ничего нет — не трогать.
		function collectResultItemsFromDOM() {
			if (!container) return null;
			var elems = container.querySelectorAll(".item, .catalog__item, .poster, .search-item");
			if (!elems || elems.length === 0) return null;

			var results = [];
			elems.forEach(function (el, idx) {
				var obj = null;
				// 1) data-item
				var dataJson = el.getAttribute("data-item") || el.getAttribute("data-json") || el.getAttribute("data-info");
				if (dataJson) {
					try {
						obj = JSON.parse(dataJson);
					} catch (e) {
						obj = null;
					}
				}

				// 2) inline script с JSON
				if (!obj) {
					var ds = el.querySelector('script[type="application/json"]');
					if (ds) {
						try {
							obj = JSON.parse(ds.textContent);
						} catch (e) {
							obj = null;
						}
					}
				}

				// 3) если нет объекта, создаём минимальный объект с title, sizeText
				if (!obj) {
					obj = {};
					var titleEl = el.querySelector(".title, .name, .catalog-title, .poster__title");
					if (titleEl) obj.title = titleEl.textContent.trim();
					var sizeEl = el.querySelector(".size, .torrent-size, .file-size");
					if (sizeEl) obj._size_text = sizeEl.textContent.trim();
					// сохраним ссылку на DOM для перестановки
					obj.__dom = el;
				} else {
					// если есть объект, сохраним pointer на DOM
					obj.__dom = el;
				}

				results.push(obj);
			});

			return results;
		}

		// Переставляем элементы в DOM в соответствии с отсортированным массивом
		function reorderDomAccordingToSorted(sorted) {
			if (!container || !Array.isArray(sorted)) return;
			var fragment = document.createDocumentFragment();
			sorted.forEach(function (it) {
				if (it && it.__dom) fragment.appendChild(it.__dom);
			});
			// вставляем в начало контейнера
			container.insertBefore(fragment, container.firstChild);
		}

		// Основная логика: собираем массив объектов, сортируем и перерисовываем DOM,
		// либо, если есть доступ к реальным объектам Lampa (например Lampa.List.current.items),
		// сортируем их и вызываем перерендер.
		function applySortToCurrentList() {
			var mode = getSelectedSort();
			if (!mode || mode === "none" || mode === "нет") return;

			// попытка 1: если Lampa хранит текущие результаты в Lampa.Api или Lampa.Component
			try {
				if (Lampa && Lampa.List && Lampa.List.current && Array.isArray(Lampa.List.current.items)) {
					var items = Lampa.List.current.items;
					var dir = mode === "size_asc" ? "asc" : "desc";
					var sorted = sortResultsBySize(items, dir);
					Lampa.List.current.items = sorted;
					if (typeof Lampa.List.current.render === "function") Lampa.List.current.render();
					console.log("Плагин Lampa: отсортировал Lampa.List.current.items по размеру.");
					return;
				}
			} catch (e) {
				/* continue */
			}

			// попытка 2: собрать объекты из DOM и переставить DOM элементы
			var results = collectResultItemsFromDOM();
			if (results && results.length) {
				var dir = mode === "size_asc" ? "asc" : "desc";
				var sorted = sortResultsBySize(results, dir);
				reorderDomAccordingToSorted(sorted);
				console.log("Плагин Lampa: отсортировал DOM элементы результатов по размеру.");
				return;
			}

			// иначе — ничего не делаем (нет подходящего механизма)
		}

		// слушаем изменение фильтра dropdown, если DOM fallback используется
		function attachSelectListener() {
			var sel = document.getElementById("lampa-size-sort-select");
			if (!sel) {
				// попробуем позже, если ещё не создан
				setTimeout(attachSelectListener, 1000);
				return;
			}
			sel.addEventListener("change", function () {
				applySortToCurrentList();
			});
		}

		startObserver();
		attachSelectListener();

		// также экспортируем функцию, чтобы пользователь мог вручную вызвать сортировку
		window.LampaSizeSort = {
			apply: applySortToCurrentList,
			parseSizeToBytes: parseSizeToBytes,
			getSizeFromResult: getSizeFromResult,
			settings: {
				RESULT_SIZE_FIELDS: RESULT_SIZE_FIELDS,
			},
		};

		console.log("Плагин Lampa: готов. Вызови LampaSizeSort.apply() для ручного запуска сортировки.");
	}

	// --- Запуск: добавляем UI и подцепляемся к результатам ---
	addFilterUI();
	attachSorter();
})();
