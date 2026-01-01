(function () {
	"use strict";

	var pipActive = false;
	var pipContainer = null;
	var originalVideoParent = null;
	var originalVideo = null;
	var originalPlayerVideoDestroy = null;
	var originalPlayerClose = null;
	var originalPlayerPlay = null;
	var isEnteringPiP = false;
	var isExitingPiP = false;
	var pipActivatedTime = 0;
	var savedPlayData = null;
	var savedVideoTime = 0;
	var playerContainer = null;

	function createPipContainer() {
		if (pipContainer) return;

		pipContainer = document.createElement("div");
		pipContainer.id = "lampa-pip-container";
		pipContainer.innerHTML = '<div class="lampa-pip-video-wrap"></div>';
		document.body.appendChild(pipContainer);

		pipContainer.addEventListener("click", function (e) {
			if (Date.now() - pipActivatedTime < 500) return;
			if (e.target === pipContainer || e.target.classList.contains("lampa-pip-video-wrap")) {
				exitPiP();
			}
		});
	}

	function createHeaderButton() {
		var existing = document.querySelector(".head__action.pip--icon");
		if (existing) return;

		var actions = document.querySelector(".head__actions");
		if (!actions) return;

		var btn = document.createElement("div");
		btn.className = "head__action selector pip--icon";
		btn.style.display = "none";
		btn.innerHTML = '<svg viewBox="0 0 24.5 23.2" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.1,0h-3.7h-1.5H5.3C2.4,0,0,2.4,0,5.4v12.5c0,3,2.4,5.3,5.4,5.3h13.8c3,0,5.3-2.4,5.3-5.3V9.9V8.5V5.4C24.5,2.4,22.1,0,19.1,0z M19.1,20.5h-13H5.3c-1.5,0-2.6-1.2-2.6-2.7V5.4c0-1.5,1.2-2.6,2.6-2.6h5.1c-0.1,0.2-0.1,0.5-0.1,0.7v6.5c0,1.9,1.5,3.4,3.4,3.4H21c0.3,0,0.5,0,0.7-0.1v4.5C21.8,19.3,20.6,20.5,19.1,20.5z M21.8,9.9c0,0.4-0.3,0.7-0.7,0.7h-7.2c-0.4,0-0.7-0.3-0.7-0.7V3.4c0-0.4,0.3-0.7,0.7-0.7h1.5h3.7c1.5,0,2.7,1.2,2.7,2.6v3.2V9.9z" fill="currentColor"/></svg>';

		actions.insertBefore(btn, actions.firstChild);

		btn.addEventListener("click", function (e) {
			e.stopPropagation();
			exitPiP();
		});

		$(btn).on("hover:enter", function () {
			exitPiP();
		});
	}

	function showHeaderButton() {
		var btn = document.querySelector(".head__action.pip--icon");
		if (btn) btn.style.display = "";
	}

	function hideHeaderButton() {
		var btn = document.querySelector(".head__action.pip--icon");
		if (btn) btn.style.display = "none";
	}

	function togglePiP() {
		if (pipActive) {
			exitPiP();
		} else {
			enterPiP();
		}
	}

	function updatePipSize() {
		if (!pipContainer || !originalVideo) return;

		var videoWidth = originalVideo.videoWidth || 16;
		var videoHeight = originalVideo.videoHeight || 9;
		var aspectRatio = videoWidth / videoHeight;

		var pipWidth = 512;
		var pipHeight = Math.round(pipWidth / aspectRatio);

		pipContainer.style.width = pipWidth + "px";
		pipContainer.style.height = pipHeight + "px";
	}

	function enterPiP() {
		if (isEnteringPiP) {
			return;
		}

		originalVideo = document.querySelector(".player-video__display video");
		if (!originalVideo) {
			originalVideo = document.querySelector(".player video");
		}

		if (!originalVideo) {
			Lampa.Noty.show("PiP доступен только со встроенным плеером. Измените плеер в настройках.");
			return;
		}

		isEnteringPiP = true;
		originalVideoParent = originalVideo.parentElement;
		playerContainer = document.querySelector(".player");

		savedPlayData = Lampa.Player.playdata();
		savedVideoTime = originalVideo.currentTime;

		createPipContainer();

		var videoWrap = pipContainer.querySelector(".lampa-pip-video-wrap");
		videoWrap.appendChild(originalVideo);

		originalVideo.style.cssText = "width:100%!important;height:100%!important;object-fit:contain!important;position:static!important;transform:none!important;";

		updatePipSize();
		originalVideo.addEventListener("loadedmetadata", updatePipSize);

		pipActive = true;
		pipActivatedTime = Date.now();
		pipContainer.classList.add("active");

		document.body.classList.add("lampa-pip-mode");
		document.body.classList.remove("player--viewing");

		Lampa.PlayerPanel.hide();

		createHeaderButton();
		showHeaderButton();

		setTimeout(function () {
			Lampa.Controller.toggle("content");
			isEnteringPiP = false;
		}, 50);
	}

	function exitPiP() {
		if (!pipActive) return;

		isExitingPiP = true;

		if (originalVideo) {
			originalVideo.removeEventListener("loadedmetadata", updatePipSize);
		}

		if (pipContainer) {
			pipContainer.classList.remove("active");
		}

		if (playerContainer && !playerContainer.isConnected) {
			document.body.appendChild(playerContainer);
		}

		if (originalVideo && originalVideoParent) {
			originalVideoParent.appendChild(originalVideo);
			originalVideo.style.cssText = "";
		}

		document.body.classList.remove("lampa-pip-mode");
		document.body.classList.add("player--viewing");
		hideHeaderButton();

		pipActive = false;

		Lampa.Controller.toggle("player");
		Lampa.PlayerPanel.show(true);

		originalVideo = null;
		originalVideoParent = null;
		playerContainer = null;
		savedPlayData = null;
		savedVideoTime = 0;
		isExitingPiP = false;
	}

	function closePiPCompletely() {
		if (originalVideo && originalVideoParent) {
			if (playerContainer && !playerContainer.isConnected) {
				document.body.appendChild(playerContainer);
			}
			originalVideoParent.appendChild(originalVideo);
			originalVideo.style.cssText = "";
		}

		pipActive = false;
		isEnteringPiP = false;
		isExitingPiP = false;

		if (pipContainer) {
			pipContainer.classList.remove("active");
		}

		document.body.classList.remove("lampa-pip-mode");
		hideHeaderButton();

		savedPlayData = null;
		savedVideoTime = 0;
		originalVideo = null;
		originalVideoParent = null;
		playerContainer = null;
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
			"  transition: width 0.2s, height 0.2s;",
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
			"  object-fit: contain !important;",
			"  transform: none !important;",
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
			".player-panel__pip.hide {",
			"  display: flex !important;",
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
		}
	}

	function showPipButton() {
		var pipBtn = document.querySelector(".player-panel__pip");
		if (pipBtn) {
			pipBtn.classList.remove("hide");
		}
	}

	function interceptPlayerMethods() {
		if (!originalPlayerVideoDestroy && Lampa.PlayerVideo && Lampa.PlayerVideo.destroy) {
			originalPlayerVideoDestroy = Lampa.PlayerVideo.destroy;
			Lampa.PlayerVideo.destroy = function (savemeta) {
				if (pipActive) {
					return;
				}
				return originalPlayerVideoDestroy.call(this, savemeta);
			};
		}

		if (!originalPlayerClose && Lampa.Player && Lampa.Player.close) {
			originalPlayerClose = Lampa.Player.close;
			Lampa.Player.close = function () {
				if (pipActive || isEnteringPiP) {
					return;
				}
				return originalPlayerClose.call(this);
			};
		}

		if (!originalPlayerPlay && Lampa.Player && Lampa.Player.play) {
			originalPlayerPlay = Lampa.Player.play;
			Lampa.Player.play = function (data) {
				if (pipActive && !isExitingPiP) {
					Lampa.Noty.show("Сначала закройте PiP");
					return;
				}
				return originalPlayerPlay.call(this, data);
			};
		}
	}

	function initPlugin() {
		addStyles();
		overridePipHandler();
		interceptPlayerMethods();

		Lampa.Listener.follow("player", function (e) {
			if (e.type === "start") {
				setTimeout(function () {
					overridePipHandler();
					interceptPlayerMethods();
					showPipButton();
				}, 100);
			}

			if (e.type === "destroy") {
				if (pipActive) {
					closePiPCompletely();
				}
			}
		});

		Lampa.Listener.follow("activity", function (e) {});
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
