(function () {
	"use strict";

	console.log("[PiP Plugin] Загрузка плагина...");

	var pipActive = false;
	var pipContainer = null;
	var originalVideoParent = null;
	var originalVideo = null;
	var originalPlayerVideoDestroy = null;
	var originalPlayerClose = null;
	var isEnteringPiP = false;
	var pipActivatedTime = 0;
	var savedPlayData = null;
	var savedVideoTime = 0;

	function createPipContainer() {
		if (pipContainer) return;

		pipContainer = document.createElement("div");
		pipContainer.id = "lampa-pip-container";
		pipContainer.innerHTML = '<div class="lampa-pip-close">✕</div><div class="lampa-pip-video-wrap"></div>';
		document.body.appendChild(pipContainer);

		pipContainer.querySelector(".lampa-pip-close").addEventListener("click", function (e) {
			e.stopPropagation();
			e.preventDefault();
			if (Date.now() - pipActivatedTime < 500) return;
			exitPiP();
		});

		pipContainer.addEventListener("click", function (e) {
			if (Date.now() - pipActivatedTime < 500) return;
			if (e.target === pipContainer || e.target.classList.contains("lampa-pip-video-wrap")) {
				exitPiP();
			}
		});
	}

	function togglePiP() {
		console.log("[PiP Plugin] togglePiP вызван, pipActive:", pipActive);
		if (pipActive) {
			exitPiP();
		} else {
			enterPiP();
		}
	}

	function enterPiP() {
		console.log("[PiP Plugin] enterPiP вызван");

		if (isEnteringPiP) {
			console.log("[PiP Plugin] Уже входим в PiP, пропускаем");
			return;
		}

		originalVideo = document.querySelector(".player-video__display video");
		if (!originalVideo) {
			originalVideo = document.querySelector(".player video");
		}

		if (!originalVideo) {
			console.log("[PiP Plugin] Видео не найдено");
			Lampa.Noty.show("Видео не найдено");
			return;
		}

		isEnteringPiP = true;
		originalVideoParent = originalVideo.parentElement;
		
		savedPlayData = Lampa.Player.playdata();
		savedVideoTime = originalVideo.currentTime;
		console.log("[PiP Plugin] Сохранены данные воспроизведения, время:", savedVideoTime);

		createPipContainer();

		var videoWrap = pipContainer.querySelector(".lampa-pip-video-wrap");
		videoWrap.appendChild(originalVideo);

		originalVideo.style.cssText = "width:100%!important;height:100%!important;object-fit:cover!important;position:static!important;transform:none!important;";

		pipActive = true;
		pipActivatedTime = Date.now();
		pipContainer.classList.add("active");

		document.body.classList.add("lampa-pip-mode");
		document.body.classList.remove("player--viewing");

		Lampa.PlayerPanel.hide();

		setTimeout(function () {
			Lampa.Controller.toggle("content");
			isEnteringPiP = false;
		}, 50);

		console.log("[PiP Plugin] PiP активирован");
	}

	function exitPiP() {
		console.log("[PiP Plugin] exitPiP вызван");

		if (!pipActive) return;

		var videoTime = 0;
		if (originalVideo) {
			videoTime = originalVideo.currentTime;
		}

		pipActive = false;
		isEnteringPiP = false;
		
		if (pipContainer) {
			pipContainer.classList.remove("active");
			var videoWrap = pipContainer.querySelector(".lampa-pip-video-wrap");
			if (videoWrap) videoWrap.innerHTML = "";
		}

		document.body.classList.remove("lampa-pip-mode");

		var playData = savedPlayData;
		
		originalVideo = null;
		originalVideoParent = null;
		savedPlayData = null;
		savedVideoTime = 0;

		if (playData) {
			console.log("[PiP Plugin] Перезапускаем воспроизведение с позиции:", videoTime);
			
			var newPlayData = Object.assign({}, playData);
			newPlayData.timeline = newPlayData.timeline || {};
			newPlayData.timeline.time = videoTime;
			
			setTimeout(function() {
				Lampa.Player.play(newPlayData);
			}, 100);
		}

		console.log("[PiP Plugin] PiP деактивирован");
	}

	function closePiPCompletely() {
		console.log("[PiP Plugin] Полное закрытие PiP");

		pipActive = false;
		isEnteringPiP = false;

		if (pipContainer) {
			pipContainer.classList.remove("active");
			var videoWrap = pipContainer.querySelector(".lampa-pip-video-wrap");
			if (videoWrap) videoWrap.innerHTML = "";
		}

		document.body.classList.remove("lampa-pip-mode");

		savedPlayData = null;
		savedVideoTime = 0;
		originalVideo = null;
		originalVideoParent = null;
	}

	function addStyles() {
		var css = [
			"#lampa-pip-container {",
			"  display: none;",
			"  position: fixed;",
			"  width: 400px;",
			"  height: 225px;",
			"  right: 30px;",
			"  bottom: 30px;",
			"  z-index: 999999;",
			"  border-radius: 10px;",
			"  overflow: hidden;",
			"  box-shadow: 0 5px 30px rgba(0,0,0,0.7);",
			"  background: #000;",
			"  cursor: pointer;",
			"}",
			"#lampa-pip-container.active {",
			"  display: block;",
			"}",
			".lampa-pip-video-wrap {",
			"  width: 100%;",
			"  height: 100%;",
			"  overflow: hidden;",
			"}",
			".lampa-pip-video-wrap video {",
			"  width: 100% !important;",
			"  height: 100% !important;",
			"  object-fit: cover !important;",
			"  transform: none !important;",
			"}",
			".lampa-pip-close {",
			"  position: absolute;",
			"  top: 8px;",
			"  right: 8px;",
			"  width: 30px;",
			"  height: 30px;",
			"  background: rgba(0,0,0,0.7);",
			"  border-radius: 50%;",
			"  display: flex;",
			"  align-items: center;",
			"  justify-content: center;",
			"  cursor: pointer;",
			"  z-index: 10000;",
			"  font-size: 18px;",
			"  color: white;",
			"}",
			"body.lampa-pip-mode .player {",
			"  position: fixed !important;",
			"  width: 1px !important;",
			"  height: 1px !important;",
			"  left: -9999px !important;",
			"  top: -9999px !important;",
			"  overflow: hidden !important;",
			"  pointer-events: none !important;",
			"}",
			"body.lampa-pip-mode .activity--active {",
			"  opacity: 1 !important;",
			"}",
		].join("\n");

		var style = document.createElement("style");
		style.id = "lampa-pip-styles";
		style.textContent = css;
		document.head.appendChild(style);
	}

	function overridePipHandler() {
		if (Lampa.PlayerPanel && Lampa.PlayerPanel.listener && Lampa.PlayerPanel.listener._listeners) {
			Lampa.PlayerPanel.listener._listeners["pip"] = [togglePiP];
			console.log("[PiP Plugin] Обработчик pip заменен");
		}
	}

	function showPipButton() {
		var pipBtn = document.querySelector(".player-panel__pip");
		if (pipBtn) {
			pipBtn.classList.remove("hide");
			console.log("[PiP Plugin] Кнопка PiP показана");
		}
	}

	function interceptPlayerMethods() {
		if (!originalPlayerVideoDestroy && Lampa.PlayerVideo && Lampa.PlayerVideo.destroy) {
			originalPlayerVideoDestroy = Lampa.PlayerVideo.destroy;
			Lampa.PlayerVideo.destroy = function (savemeta) {
				console.log("[PiP Plugin] PlayerVideo.destroy вызван, pipActive:", pipActive);
				if (pipActive) {
					console.log("[PiP Plugin] PiP активен, пропускаем destroy видео");
					return;
				}
				return originalPlayerVideoDestroy.call(this, savemeta);
			};
		}

		if (!originalPlayerClose && Lampa.Player && Lampa.Player.close) {
			originalPlayerClose = Lampa.Player.close;
			Lampa.Player.close = function () {
				console.log("[PiP Plugin] Player.close вызван, pipActive:", pipActive, "isEnteringPiP:", isEnteringPiP);
				if (pipActive || isEnteringPiP) {
					console.log("[PiP Plugin] PiP активен, игнорируем close");
					return;
				}
				return originalPlayerClose.call(this);
			};
		}
	}

	function initPlugin() {
		console.log("[PiP Plugin] initPlugin");

		addStyles();
		overridePipHandler();
		interceptPlayerMethods();

		Lampa.Listener.follow("player", function (e) {
			console.log("[PiP Plugin] Событие player:", e.type);

			if (e.type === "start") {
				setTimeout(function () {
					overridePipHandler();
					interceptPlayerMethods();
					showPipButton();
				}, 100);
			}

			if (e.type === "destroy") {
				if (pipActive) {
					console.log("[PiP Plugin] Плеер уничтожается, закрываем PiP");
					closePiPCompletely();
				}
			}
		});

		Lampa.Listener.follow("activity", function (e) {
			console.log("[PiP Plugin] Событие activity:", e.type);
		});

		console.log("[PiP Plugin] Инициализация завершена");
	}

	if (window.appready) {
		initPlugin();
	} else {
		Lampa.Listener.follow("app", function (e) {
			if (e.type === "ready") {
				initPlugin();
			}
		});
	}
})();
