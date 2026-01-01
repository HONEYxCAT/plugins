(function () {
	"use strict";

	var preloadQueue = [];
	var isPreloading = false;
	var preloadTimer = null;

	function preloadRating(card) {
		if (!card || !card.id) return;

		var cache = Lampa.Storage.get("kp_rating", "{}");
		if (typeof cache === "string") {
			try { cache = JSON.parse(cache); } catch(e) { cache = {}; }
		}
		if (cache[card.id]) return;

		var inQueue = preloadQueue.some(function(c) { return c.id === card.id; });
		if (inQueue) return;

		preloadQueue.push(card);

		if (!isPreloading) {
			processPreloadQueue();
		}
	}

	function processPreloadQueue() {
		if (preloadQueue.length === 0) {
			isPreloading = false;
			return;
		}

		isPreloading = true;
		var card = preloadQueue.shift();

		fetchRating(card, function () {
			setTimeout(processPreloadQueue, 50);
		});
	}

	function fetchRating(card, callback) {
		var network = new Lampa.Reguest();
		var title = kpCleanTitle(card.title || card.name || "");
		var searchDate = card.release_date || card.first_air_date || card.last_air_date || "0000";
		var searchYear = parseInt((searchDate + "").slice(0, 4));
		var orig = card.original_title || card.original_name;
		var apiUrl = "https://kinopoiskapiunofficial.tech/";
		var ratingUrl = "https://rating.kinopoisk.ru/";
		var headers = { "X-API-KEY": "2a4a0808-81a3-40ae-b0d3-e11335ede616" };

		var url = apiUrl + "api/v2.1/films/search-by-keyword?keyword=" + encodeURIComponent(title);
		if (card.imdb_id) {
			url = apiUrl + "api/v2.2/films?imdbId=" + encodeURIComponent(card.imdb_id);
		}

		network.timeout(8000);
		network.silent(url, function (json) {
			var items = json.items || json.films || [];
			if (!items.length && card.imdb_id) {
				network.clear();
				network.timeout(8000);
				network.silent(
					apiUrl + "api/v2.1/films/search-by-keyword?keyword=" + encodeURIComponent(title),
					function (json2) {
						var items2 = json2.items || json2.films || [];
						processItems(items2, card, searchYear, orig, apiUrl, ratingUrl, headers, network, callback);
					},
					function () { 
						saveCache(card.id, 0, 0); 
						if (callback) callback(); 
					},
					false,
					{ headers: headers }
				);
			} else {
				processItems(items, card, searchYear, orig, apiUrl, ratingUrl, headers, network, callback);
			}
		}, function () {
			saveCache(card.id, 0, 0);
			if (callback) callback();
		}, false, { headers: headers });
	}

	function processItems(items, card, searchYear, orig, apiUrl, ratingUrl, headers, network, callback) {
		var cardTitle = card.title || card.name;
		
		if (!items || !items.length) {
			saveCache(card.id, 0, 0);
			if (callback) callback();
			return;
		}

		items.forEach(function (c) {
			var year = c.start_date || c.year || "0000";
			c.tmp_year = parseInt((year + "").slice(0, 4));
		});

		var found = null;

		if (card.imdb_id) {
			var byImdb = items.filter(function (e) { return (e.imdb_id || e.imdbId) == card.imdb_id; });
			if (byImdb.length === 1) {
				found = byImdb[0];
			}
		}

		if (!found && orig) {
			var byOrig = items.filter(function (e) {
				return equalTitle(e.nameOriginal || e.orig_title, orig) ||
					   equalTitle(e.nameEn || e.en_title, orig) ||
					   equalTitle(e.nameRu || e.ru_title || e.title, orig);
			});
			if (byOrig.length === 1) {
				found = byOrig[0];
			} else if (byOrig.length > 1) {
				var byYear = byOrig.filter(function (c) { return c.tmp_year === searchYear; });
				if (byYear.length === 1) {
					found = byYear[0];
				}
			}
		}

		if (!found && cardTitle) {
			var byTitle = items.filter(function (e) {
				return equalTitle(e.nameRu || e.ru_title || e.title, cardTitle) ||
					   equalTitle(e.nameEn || e.en_title, cardTitle) ||
					   equalTitle(e.nameOriginal || e.orig_title, cardTitle);
			});
			if (byTitle.length === 1) {
				found = byTitle[0];
			} else if (byTitle.length > 1) {
				var byYear = byTitle.filter(function (c) { return c.tmp_year === searchYear; });
				if (byYear.length === 1) {
					found = byYear[0];
				}
			}
		}

		if (!found && searchYear) {
			var byYear = items.filter(function (c) {
				return c.tmp_year && c.tmp_year >= searchYear - 1 && c.tmp_year <= searchYear + 1;
			});
			if (byYear.length === 1) {
				found = byYear[0];
			}
		}

		if (!found) {
			saveCache(card.id, 0, 0);
			if (callback) callback();
			return;
		}

		var kpId = found.kp_id || found.kinopoisk_id || found.kinopoiskId || found.filmId;
		if (!kpId) {
			saveCache(card.id, 0, 0);
			if (callback) callback();
			return;
		}

		network.clear();
		network.timeout(5000);
		network["native"](ratingUrl + kpId + ".xml", function (str) {
			if (str.indexOf("<rating>") >= 0) {
				try {
					var xml = $($.parseXML(str));
					var kp = parseFloat(xml.find("kp_rating").text()) || 0;
					var imdb = parseFloat(xml.find("imdb_rating").text()) || 0;
					saveCache(card.id, kp, imdb);
					if (callback) callback();
					return;
				} catch (e) {}
			}
			fetchFromApi(kpId, card.id, apiUrl, headers, network, callback);
		}, function () {
			fetchFromApi(kpId, card.id, apiUrl, headers, network, callback);
		}, false, { dataType: "text" });
	}

	function fetchFromApi(kpId, cardId, apiUrl, headers, network, callback) {
		network.clear();
		network.timeout(8000);
		network.silent(apiUrl + "api/v2.2/films/" + kpId, function (data) {
			var kp = data.ratingKinopoisk || 0;
			var imdb = data.ratingImdb || 0;
			saveCache(cardId, kp, imdb);
			if (callback) callback();
		}, function () {
			saveCache(cardId, 0, 0);
			if (callback) callback();
		}, false, { headers: headers });
	}

	function saveCache(id, kp, imdb) {
		var cache = Lampa.Storage.get("kp_rating", "{}");
		if (typeof cache === "string") {
			try { cache = JSON.parse(cache); } catch(e) { cache = {}; }
		}
		
		var keys = Object.keys(cache);
		
		if (keys.length >= 500) {
			var oldest = keys.sort(function(a, b) {
				return (cache[a].timestamp || 0) - (cache[b].timestamp || 0);
			}).slice(0, 100);
			oldest.forEach(function(k) { delete cache[k]; });
		}
		
		cache[id] = { kp: kp, imdb: imdb, timestamp: Date.now() };
		Lampa.Storage.set("kp_rating", cache);
	}

	function getCache(id) {
		var cache = Lampa.Storage.get("kp_rating", "{}");
		if (typeof cache === "string") {
			try { cache = JSON.parse(cache); } catch(e) { cache = {}; }
		}
		
		if (cache[id]) {
			var age = Date.now() - cache[id].timestamp;
			if (age < 86400000) return cache[id];
			delete cache[id];
			Lampa.Storage.set("kp_rating", cache);
		}
		return null;
	}

	function cleanTitle(str) {
		return str.replace(/[\s.,:;''`!?]+/g, " ").trim();
	}

	function kpCleanTitle(str) {
		return cleanTitle(str)
			.replace(/^[ \/\\]+/, "")
			.replace(/[ \/\\]+$/, "")
			.replace(/\+( *[+\/\\])+/g, "+")
			.replace(/([+\/\\] *)+\+/g, "+")
			.replace(/( *[\/\\]+ *)+/g, "+");
	}

	function normalizeTitle(str) {
		return cleanTitle(str.toLowerCase().replace(/[\-\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g, "-").replace(/ё/g, "е"));
	}

	function equalTitle(t1, t2) {
		return typeof t1 === "string" && typeof t2 === "string" && normalizeTitle(t1) === normalizeTitle(t2);
	}

	function findCardData(element) {
		if (!element) return null;
		var node = element.jquery ? element[0] : element;
		var steps = 0;
		while (node && !node.card_data && steps < 15) {
			node = node.parentNode;
			steps++;
		}
		return node && node.card_data ? node.card_data : null;
	}

	function preloadVisibleCards() {
		clearTimeout(preloadTimer);
		preloadTimer = setTimeout(function () {
			var layer = $(".layer--visible");
			if (!layer.length) layer = $("body");

			var cards = layer.find(".card, .card--small, .card--collection, .card-parser");
			
			if (cards.length === 0) {
				var cardViews = layer.find(".card__view");
				if (cardViews.length) {
					cards = cardViews.parent();
				}
			}
			
			cards.each(function () {
				var data = findCardData(this);
				if (data && data.id) {
					preloadRating(data);
				}
			});
		}, 300);
	}

	function setupObserver() {
		var observer = new MutationObserver(function (mutations) {
			for (var i = 0; i < mutations.length; i++) {
				var added = mutations[i].addedNodes;
				for (var j = 0; j < added.length; j++) {
					var node = added[j];
					if (node.nodeType === 1 && node.classList) {
						if (node.classList.contains("card") || (node.querySelector && node.querySelector(".card"))) {
							preloadVisibleCards();
							return;
						}
					}
				}
			}
		});
		observer.observe(document.body, { childList: true, subtree: true });
	}

	function showRating(data, render) {
		if (!render) {
			var activity = Lampa.Activity.active();
			if (activity && activity.activity) render = activity.activity.render();
		}
		if (!render || !data) return;

		$(".wait_rating", render).remove();

		var kp = parseFloat(data.kp);
		var imdb = parseFloat(data.imdb);
		var $kp = $(".rate--kp", render);
		var $imdb = $(".rate--imdb", render);

		if (!isNaN(kp) && kp > 0) {
			$kp.removeClass("hide").find("> div").eq(0).text(kp.toFixed(1));
		}

		if (!isNaN(imdb) && imdb > 0) {
			$imdb.removeClass("hide").find("> div").eq(0).text(imdb.toFixed(1));
		}
	}

	function loadAndShowRating(card, render) {
		var cached = getCache(card.id);
		if (cached) {
			showRating(cached, render);
			return;
		}

		$(".info__rate", render).after('<div style="width:2em;margin-top:1em;margin-right:1em" class="wait_rating"><div class="broadcast__scan"><div></div></div></div>');

		fetchRating(card, function () {
			var data = getCache(card.id);
			if (data) showRating(data, render);
			else $(".wait_rating", render).remove();
		});
	}

	function startPlugin() {
		if (window.rating_plugin) return;
		window.rating_plugin = true;

		setupObserver();

		Lampa.Listener.follow("activity", function (e) {
			if (e.type === "active" || e.type === "start") {
				setTimeout(preloadVisibleCards, 500);
			}
		});

		Lampa.Listener.follow("full", function (e) {
			if (e.type === "complite") {
				var render = e.object.activity.render();
				var card = e.data.movie;
				loadAndShowRating(card, render);
			}
		});

		setTimeout(preloadVisibleCards, 800);
	}

	startPlugin();
})();
