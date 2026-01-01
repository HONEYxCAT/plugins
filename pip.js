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
	var savedPanelState = null;
	var savedTracks = null;
	var savedSubs = null;
	var savedQualitys = null;
	var savedFlows = null;
	var originalSetTracks = null;
	var originalSetSubs = null;
	var originalSetLevels = null;
	var originalQuality = null;
	var originalSetFlows = null;

	function savePanelState() {
		var subsBtn = document.querySelector(".player-panel__subs");
		var tracksBtn = document.querySelector(".player-panel__tracks");
		var qualityBtn = document.querySelector(".player-panel__quality");
		var episodeBtn = document.querySelector(".player-panel__episode");
		var playlistBtn = document.querySelector(".player-panel__playlist");
		var flowBtn = document.querySelector(".player-panel__flow");

		savedPanelState = {
			subsVisible: subsBtn && !subsBtn.classList.contains("hide"),
			tracksVisible: tracksBtn && !tracksBtn.classList.contains("hide"),
			qualityVisible: qualityBtn && !qualityBtn.classList.contains("hide"),
			qualityText: qualityBtn ? qualityBtn.textContent : "auto",
			episodeVisible: episodeBtn && !episodeBtn.classList.contains("hide"),
			episodeText: episodeBtn ? episodeBtn.textContent : "",
			playlistVisible: playlistBtn && !playlistBtn.classList.contains("hide"),
			flowVisible: flowBtn && !flowBtn.classList.contains("hide"),
		};
	}

	function restorePanelState() {
		if (!savedPanelState) return;

		var subsBtn = document.querySelector(".player-panel__subs");
		var tracksBtn = document.querySelector(".player-panel__tracks");
		var qualityBtn = document.querySelector(".player-panel__quality");
		var episodeBtn = document.querySelector(".player-panel__episode");
		var playlistBtn = document.querySelector(".player-panel__playlist");
		var flowBtn = document.querySelector(".player-panel__flow");

		if (subsBtn) subsBtn.classList.toggle("hide", !savedPanelState.subsVisible);
		if (tracksBtn) tracksBtn.classList.toggle("hide", !savedPanelState.tracksVisible);
		if (qualityBtn) {
			qualityBtn.classList.toggle("hide", !savedPanelState.qualityVisible);
			if (savedPanelState.qualityText) qualityBtn.textContent = savedPanelState.qualityText;
		}
		if (episodeBtn) {
			episodeBtn.classList.toggle("hide", !savedPanelState.episodeVisible);
			if (savedPanelState.episodeText) episodeBtn.textContent = savedPanelState.episodeText;
		}
		if (playlistBtn) playlistBtn.classList.toggle("hide", !savedPanelState.playlistVisible);
		if (flowBtn) flowBtn.classList.toggle("hide", !savedPanelState.flowVisible);

		if (savedTracks && savedTracks.length) {
			Lampa.PlayerPanel.setTracks(savedTracks);
		}
		if (savedSubs && savedSubs.length) {
			Lampa.PlayerPanel.setSubs(savedSubs);
		}
		if (savedQualitys) {
			Lampa.PlayerPanel.setLevels(savedQualitys, savedPanelState.qualityText);
		}
		if (savedFlows && Lampa.PlayerPanel.setFlows) {
			Lampa.PlayerPanel.setFlows(savedFlows);
		}
	}

	function interceptPanelMethods() {
		if (!originalSetTracks && Lampa.PlayerPanel && Lampa.PlayerPanel.setTracks) {
			originalSetTracks = Lampa.PlayerPanel.setTracks;
			Lampa.PlayerPanel.setTracks = function (tr) {
				savedTracks = tr;
				return originalSetTracks.apply(this, arguments);
			};
		}

		if (!originalSetSubs && Lampa.PlayerPanel && Lampa.PlayerPanel.setSubs) {
			originalSetSubs = Lampa.PlayerPanel.setSubs;
			Lampa.PlayerPanel.setSubs = function (su) {
				savedSubs = su;
				return originalSetSubs.apply(this, arguments);
			};
		}

		if (!originalSetLevels && Lampa.PlayerPanel && Lampa.PlayerPanel.setLevels) {
			originalSetLevels = Lampa.PlayerPanel.setLevels;
			Lampa.PlayerPanel.setLevels = function (levels, current) {
				savedQualitys = levels;
				return originalSetLevels.apply(this, arguments);
			};
		}

		if (!originalQuality && Lampa.PlayerPanel && Lampa.PlayerPanel.quality) {
			originalQuality = Lampa.PlayerPanel.quality;
			Lampa.PlayerPanel.quality = function (qs, url) {
				if (qs) savedQualitys = qs;
				return originalQuality.apply(this, arguments);
			};
		}

		if (!originalSetFlows && Lampa.PlayerPanel && Lampa.PlayerPanel.setFlows) {
			originalSetFlows = Lampa.PlayerPanel.setFlows;
			Lampa.PlayerPanel.setFlows = function (data) {
				savedFlows = data;
				return originalSetFlows.apply(this, arguments);
			};
		}
	}

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

		savePanelState();

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

		restorePanelState();

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
		savedPanelState = null;
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
		interceptPanelMethods();

		Lampa.Listener.follow("player", function (e) {
			if (e.type === "start") {
				setTimeout(function () {
					overridePipHandler();
					interceptPlayerMethods();
					interceptPanelMethods();
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
