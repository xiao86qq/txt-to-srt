(() => {
  const root = document.documentElement;
  const body = document.body;
  const hero = document.querySelector(".hero");
  const heroImage = document.querySelector("#hero-image");
  const card = document.querySelector(".glass-card");
  const audio = document.querySelector("#relax-audio");
  const switchPanel = document.querySelector(".switch-panel");
  const switchButtons = document.querySelectorAll(".switch-button");
  const backgroundInput = document.querySelector("#background-input");
  const musicInput = document.querySelector("#music-input");
  const trailLayer = document.querySelector(".cursor-trail-layer");
  const backgroundModal = document.querySelector("#background-modal");
  const backgroundModalPanel = backgroundModal?.querySelector(".media-modal__panel");
  const backgroundGrid = document.querySelector("#background-grid");
  const backgroundCurrent = document.querySelector("#background-current");
  const randomBackgroundToggle = document.querySelector("#random-background-toggle");
  const setDefaultBackgroundButton = document.querySelector("#set-default-background");
  const restoreDefaultBackgroundButton = document.querySelector("#restore-default-background");
  const musicDrawer = document.querySelector("#music-drawer");
  const musicDrawerPanel = musicDrawer?.querySelector(".music-drawer__panel");
  const shortcutsModal = document.querySelector("#shortcuts-modal");
  const shortcutsModalPanel = shortcutsModal?.querySelector(".shortcuts-modal__panel");
  const songSearch = document.querySelector("#song-search");
  const songList = document.querySelector("#song-list");
  const nowPlayingTitle = document.querySelector("#now-playing-title");
  const nowPlayingMeta = document.querySelector("#now-playing-meta");
  const playToggle = document.querySelector("#play-toggle");
  const prevSongButton = document.querySelector("#prev-song");
  const nextSongButton = document.querySelector("#next-song");
  const repeatToggle = document.querySelector("#repeat-toggle");
  const audioProgress = document.querySelector("#audio-progress");
  const audioCurrentTime = document.querySelector("#audio-current-time");
  const audioDuration = document.querySelector("#audio-duration");
  const volumeSlider = document.querySelector("#volume-slider");
  const volumeValue = document.querySelector("#volume-value");

  const normalizeMediaItem = (item, fallbackId, fallbackTitle, fallbackSrc, extra = {}) => ({
    id: String(item?.id || fallbackId),
    title: String(item?.title || fallbackTitle),
    src: String(item?.src || fallbackSrc),
    filename: String(item?.filename || item?.title || fallbackTitle),
    ...extra
  });
  const manifest = window.MEDIA_LIBRARY && typeof window.MEDIA_LIBRARY === "object" ? window.MEDIA_LIBRARY : null;
  const manifestBackgrounds = Array.isArray(manifest?.backgrounds) ? manifest.backgrounds : [];
  const manifestSongs = Array.isArray(manifest?.songs) ? manifest.songs : [];
  const fallbackBackgroundSrc = heroImage?.getAttribute("src") || "./assets/picture/hero-background.png";
  const fallbackSongSrc = audio?.getAttribute("src") || "./assets/song/Stay Alive (From The Secret Life of Walter Mitty Soundtrack) - José González.mp3";
  const fallbackBackground = normalizeMediaItem(null, "hero-background", "默认蓝天", fallbackBackgroundSrc);
  const fallbackSong = normalizeMediaItem(null, "stay-alive", "Stay Alive", fallbackSongSrc, { artist: "José González" });
  const normalizeBackgrounds = () => {
    const items = manifestBackgrounds
      .filter((item) => item?.id && item?.src)
      .map((item) => normalizeMediaItem(item, fallbackBackground.id, fallbackBackground.title, fallbackBackground.src));

    return items.length ? items : [fallbackBackground];
  };
  const normalizeSongs = () => {
    const items = manifestSongs
      .filter((item) => item?.id && item?.src)
      .map((item) => normalizeMediaItem(item, fallbackSong.id, fallbackSong.title, fallbackSong.src, { artist: String(item?.artist || "未知艺术家") }));

    return items.length ? items : [fallbackSong];
  };
  const backgroundLibrary = normalizeBackgrounds();
  const songLibrary = normalizeSongs();
  const DEFAULT_BACKGROUND_ID = backgroundLibrary.some((item) => item.id === manifest?.defaults?.backgroundId)
    ? manifest.defaults.backgroundId
    : backgroundLibrary[0].id;
  const DEFAULT_SONG_ID = songLibrary.some((item) => item.id === manifest?.defaults?.songId)
    ? manifest.defaults.songId
    : songLibrary[0].id;
  const STORAGE_KEYS = {
    selectedBackground: "relax.background.selected",
    defaultBackground: "relax.background.default",
    randomBackground: "relax.background.randomOnOpen",
    selectedSong: "relax.music.selected",
    volume: "relax.music.volume",
    repeat: "relax.music.repeat"
  };
  const repeatLabels = {
    one: "单曲",
    all: "循环",
    shuffle: "随机"
  };

  let backgroundObjectUrl = "";
  let musicObjectUrl = "";
  let selectedBackgroundId = DEFAULT_BACKGROUND_ID;
  let defaultBackgroundId = DEFAULT_BACKGROUND_ID;
  let randomBackgroundOnOpen = false;
  let selectedSongId = DEFAULT_SONG_ID;
  let repeatMode = "one";
  let lastBackgroundTrigger = null;
  let lastMusicTrigger = null;
  let lastShortcutsTrigger = null;

  const storage = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {}
    }
  };

  const isTypingTarget = (target) => (target instanceof HTMLInputElement && target.type !== "range") || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
  const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[char]);
  const resolveUrl = (src) => new URL(src, document.baseURI).href;
  const findBackground = (id) => backgroundLibrary.find((item) => item.id === id) || backgroundLibrary[0];
  const findSong = (id) => songLibrary.find((item) => item.id === id) || songLibrary[0];
  const cssUrl = (src) => `url("${src.replace(/"/g, "\\\"")}")`;
  const randomBackgroundId = () => backgroundLibrary[Math.floor(Math.random() * backgroundLibrary.length)]?.id || DEFAULT_BACKGROUND_ID;
  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = String(Math.floor(seconds % 60)).padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
  };

  const syncProgressUI = () => {
    const duration = audio && Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    const currentTime = audio && Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const percent = duration ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

    if (audioProgress) {
      audioProgress.value = String(percent);
      audioProgress.style.setProperty("--progress-percent", `${percent}%`);
    }

    if (audioCurrentTime) {
      audioCurrentTime.textContent = formatTime(currentTime);
    }

    if (audioDuration) {
      audioDuration.textContent = formatTime(duration);
    }
  };

  const seekAudio = () => {
    if (!audio || !audioProgress || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }

    audio.currentTime = (Number(audioProgress.value) / 100) * audio.duration;
    syncProgressUI();
  };

  const seekAudioBy = (seconds) => {
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }

    audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + seconds));
    syncProgressUI();
  };

  const adjustVolumeBy = (delta) => {
    if (!audio) {
      return;
    }

    audio.volume = Math.min(1, Math.max(0, audio.volume + delta));
    storage.set(STORAGE_KEYS.volume, String(audio.volume));
    syncMusicUI();
  };

  window.addEventListener("load", () => {
    body.classList.add("is-loaded");
  }, { once: true });

  const updateImageLayout = () => {
    if (!hero || !heroImage?.naturalWidth || !heroImage?.naturalHeight) {
      return;
    }

    const ratio = heroImage.naturalWidth / heroImage.naturalHeight;
    hero.classList.toggle("is-widescreen-image", Math.abs(ratio - 16 / 9) < 0.03);
  };

  const syncBackgroundUI = () => {
    if (backgroundGrid) {
      backgroundGrid.querySelectorAll(".background-card").forEach((cardElement) => {
        const id = cardElement.dataset.backgroundId;
        const isSelected = id === selectedBackgroundId;
        const isDefault = id === defaultBackgroundId;
        cardElement.classList.toggle("is-selected", isSelected);
        cardElement.classList.toggle("is-default", isDefault);
        cardElement.setAttribute("aria-pressed", String(isSelected));
        const badge = cardElement.querySelector(".background-card__badge");

        if (badge) {
          badge.textContent = isSelected ? "当前" : isDefault ? "默认" : "";
        }
      });
    }

    const selected = findBackground(selectedBackgroundId);

    if (backgroundCurrent) {
      backgroundCurrent.textContent = `当前背景：${selected.title}${randomBackgroundOnOpen ? " · 每次打开随机" : ""}`;
    }

    randomBackgroundToggle?.setAttribute("aria-pressed", String(randomBackgroundOnOpen));
    body.classList.toggle("is-random-background", randomBackgroundOnOpen);
  };

  const applyBackground = (id, { persist = true } = {}) => {
    const background = findBackground(id);
    selectedBackgroundId = background.id;

    if (backgroundObjectUrl) {
      URL.revokeObjectURL(backgroundObjectUrl);
      backgroundObjectUrl = "";
    }

    hero?.classList.remove("is-widescreen-image");
    root.style.setProperty("--hero-image", cssUrl(background.src));

    if (heroImage) {
      heroImage.src = background.src;

      if (heroImage.complete) {
        requestAnimationFrame(updateImageLayout);
      }
    }

    if (persist) {
      storage.set(STORAGE_KEYS.selectedBackground, selectedBackgroundId);
    }

    syncBackgroundUI();
  };

  const renderBackgroundGrid = () => {
    if (!backgroundGrid) {
      return;
    }

    backgroundGrid.innerHTML = backgroundLibrary.map((item) => `
      <button class="background-card" type="button" data-background-id="${escapeHtml(item.id)}" aria-label="选择背景：${escapeHtml(item.title)}" aria-pressed="false">
        <img src="${escapeHtml(item.src)}" alt="" loading="lazy">
      </button>
    `).join("");
    syncBackgroundUI();
  };

  const openBackgroundModal = (trigger = null) => {
    lastBackgroundTrigger = trigger;
    renderBackgroundGrid();
    backgroundModal?.classList.add("is-open");
    backgroundModal?.setAttribute("aria-hidden", "false");
    body.classList.add("background-modal-open");
    requestAnimationFrame(() => backgroundModalPanel?.focus());
  };

  const closeBackgroundModal = () => {
    backgroundModal?.classList.remove("is-open");
    backgroundModal?.setAttribute("aria-hidden", "true");
    body.classList.remove("background-modal-open");
    lastBackgroundTrigger?.focus?.();
  };

  const toggleBackgroundModal = () => {
    if (backgroundModal?.classList.contains("is-open")) {
      closeBackgroundModal();
    } else {
      openBackgroundModal();
    }
  };

  const moveBackground = (direction) => {
    if (!backgroundLibrary.length) {
      return;
    }

    const currentIndex = Math.max(0, backgroundLibrary.findIndex((background) => background.id === selectedBackgroundId));
    const nextIndex = (currentIndex + direction + backgroundLibrary.length) % backgroundLibrary.length;
    applyBackground(backgroundLibrary[nextIndex].id);
  };

  const updateBackgroundFromFile = (file) => {
    if (!file) {
      return;
    }

    if (backgroundObjectUrl) {
      URL.revokeObjectURL(backgroundObjectUrl);
    }

    backgroundObjectUrl = URL.createObjectURL(file);
    selectedBackgroundId = "custom-background";
    hero?.classList.remove("is-widescreen-image");
    root.style.setProperty("--hero-image", cssUrl(backgroundObjectUrl));

    if (heroImage) {
      heroImage.src = backgroundObjectUrl;
    }

    if (backgroundCurrent) {
      backgroundCurrent.textContent = `当前背景：${file.name}`;
    }
  };

  const syncMusicUI = () => {
    const song = findSong(selectedSongId);

    songList?.querySelectorAll(".song-item").forEach((item) => {
      const isActive = item.dataset.songId === selectedSongId;
      item.classList.toggle("is-active", isActive);
      item.classList.toggle("is-playing", isActive && !!audio && !audio.paused);
      item.setAttribute("aria-selected", String(isActive));
    });

    if (nowPlayingTitle) {
      nowPlayingTitle.textContent = song.title;
    }

    if (nowPlayingMeta) {
      nowPlayingMeta.textContent = song.artist;
    }

    if (playToggle) {
      playToggle.textContent = audio && !audio.paused ? "暂停" : "播放";
      playToggle.setAttribute("aria-pressed", String(!!audio && !audio.paused));
    }

    if (repeatToggle) {
      repeatToggle.textContent = repeatLabels[repeatMode] || repeatLabels.one;
      repeatToggle.setAttribute("aria-pressed", "true");
    }

    if (volumeSlider && audio) {
      volumeSlider.value = String(Math.round(audio.volume * 100));
    }

    if (volumeValue && audio) {
      volumeValue.textContent = `${Math.round(audio.volume * 100)}%`;
    }
  };

  const applySong = (id, { persist = true, play = false } = {}) => {
    const song = findSong(id);
    selectedSongId = song.id;

    if (musicObjectUrl) {
      URL.revokeObjectURL(musicObjectUrl);
      musicObjectUrl = "";
    }

    if (audio && audio.src !== resolveUrl(song.src)) {
      audio.src = song.src;
      audio.load();
    }

    if (persist) {
      storage.set(STORAGE_KEYS.selectedSong, selectedSongId);
    }

    syncMusicUI();
    syncProgressUI();

    if (play && audio) {
      audio.play().catch(() => {});
    }
  };

  const renderSongList = () => {
    if (!songList) {
      return;
    }

    const keyword = songSearch?.value.trim().toLowerCase() || "";
    const filteredSongs = songLibrary.filter((song) => `${song.title} ${song.artist}`.toLowerCase().includes(keyword));
    songList.innerHTML = filteredSongs.length ? filteredSongs.map((song) => `
      <button class="song-item" type="button" role="option" data-song-id="${escapeHtml(song.id)}" aria-selected="false">
        <strong>${escapeHtml(song.title)}</strong>
        <span>${escapeHtml(song.artist)}</span>
      </button>
    `).join("") : `<p class="modal-status">没有找到匹配歌曲。</p>`;
    syncMusicUI();
  };

  const openMusicDrawer = (trigger = null) => {
    lastMusicTrigger = trigger;
    renderSongList();
    musicDrawer?.classList.add("is-open");
    musicDrawer?.setAttribute("aria-hidden", "false");
    body.classList.add("music-drawer-open");
    requestAnimationFrame(() => songSearch?.focus() || musicDrawerPanel?.focus());
  };

  const closeMusicDrawer = () => {
    musicDrawer?.classList.remove("is-open");
    musicDrawer?.setAttribute("aria-hidden", "true");
    body.classList.remove("music-drawer-open");
    lastMusicTrigger?.focus?.();
  };

  const toggleMusicDrawer = () => {
    if (musicDrawer?.classList.contains("is-open")) {
      closeMusicDrawer();
    } else {
      openMusicDrawer();
    }
  };

  const openShortcutsModal = (trigger = null) => {
    lastShortcutsTrigger = trigger;
    shortcutsModal?.classList.add("is-open");
    shortcutsModal?.setAttribute("aria-hidden", "false");
    body.classList.add("shortcuts-modal-open");
    requestAnimationFrame(() => shortcutsModalPanel?.focus());
  };

  const closeShortcutsModal = () => {
    shortcutsModal?.classList.remove("is-open");
    shortcutsModal?.setAttribute("aria-hidden", "true");
    body.classList.remove("shortcuts-modal-open");
    lastShortcutsTrigger?.focus?.();
  };

  const toggleShortcutsModal = () => {
    if (shortcutsModal?.classList.contains("is-open")) {
      closeShortcutsModal();
    } else {
      openShortcutsModal();
    }
  };

  const setTextCardVisible = (visible) => {
    if (!card) {
      return;
    }

    card.classList.toggle("is-dismissed", !visible);
    card.setAttribute("aria-hidden", String(!visible));
    card.setAttribute("tabindex", visible ? "0" : "-1");
  };

  const toggleTextCard = () => {
    setTextCardVisible(card?.classList.contains("is-dismissed") || card?.getAttribute("aria-hidden") === "true");
  };

  const playSelectedSong = () => {
    if (!audio) {
      return;
    }

    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  const moveSong = (direction, shouldPlay = true) => {
    if (!songLibrary.length) {
      return;
    }

    const currentIndex = Math.max(0, songLibrary.findIndex((song) => song.id === selectedSongId));
    const nextIndex = (currentIndex + direction + songLibrary.length) % songLibrary.length;
    applySong(songLibrary[nextIndex].id, { play: shouldPlay });
  };

  const moveRandomSong = (shouldPlay = true) => {
    if (!songLibrary.length) {
      return;
    }

    if (songLibrary.length === 1) {
      applySong(songLibrary[0].id, { play: shouldPlay });
      return;
    }

    const currentIndex = songLibrary.findIndex((song) => song.id === selectedSongId);
    let nextIndex = currentIndex;

    while (nextIndex === currentIndex) {
      nextIndex = Math.floor(Math.random() * songLibrary.length);
    }

    applySong(songLibrary[nextIndex].id, { play: shouldPlay });
  };

  const updateRepeatMode = () => {
    repeatMode = repeatMode === "one" ? "all" : repeatMode === "all" ? "shuffle" : "one";
    storage.set(STORAGE_KEYS.repeat, repeatMode);

    if (audio) {
      audio.loop = false;
    }

    syncMusicUI();
  };

  const updateMusicFromFile = (file) => {
    if (!file || !audio) {
      return;
    }

    if (musicObjectUrl) {
      URL.revokeObjectURL(musicObjectUrl);
    }

    musicObjectUrl = URL.createObjectURL(file);
    selectedSongId = "custom-song";
    audio.src = musicObjectUrl;
    audio.load();

    if (nowPlayingTitle) {
      nowPlayingTitle.textContent = file.name.replace(/\.[^.]+$/, "");
    }

    if (nowPlayingMeta) {
      nowPlayingMeta.textContent = "本地文件";
    }

    syncProgressUI();

    if (body.classList.contains("is-relaxing")) {
      audio.play().catch(() => {});
    }
  };

  const enableSwitchPanel = () => {
    body.classList.add("is-relaxing", "controls-visible");
    switchPanel?.setAttribute("aria-hidden", "false");
    switchButtons.forEach((button) => {
      button.disabled = false;
    });
  };

  const startRelaxing = () => {
    if (!card || card.classList.contains("is-dismissed")) {
      return;
    }

    card.classList.add("is-dismissed");
    card.setAttribute("aria-hidden", "true");
    card.setAttribute("tabindex", "-1");
    enableSwitchPanel();

    if (audio) {
      audio.play().catch(() => {
        card.classList.remove("is-dismissed");
        card.removeAttribute("aria-hidden");
        card.setAttribute("tabindex", "0");
        body.classList.remove("is-relaxing", "controls-visible");
        switchPanel?.setAttribute("aria-hidden", "true");
        switchButtons.forEach((button) => {
          button.disabled = true;
        });
      });
    }
  };

  const toggleSwitchPanel = () => {
    if (!body.classList.contains("is-relaxing")) {
      return;
    }

    const nextVisible = !body.classList.contains("controls-visible");
    body.classList.toggle("controls-visible", nextVisible);
    switchPanel?.setAttribute("aria-hidden", String(!nextVisible));
  };

  const initPreferences = () => {
    const savedDefaultBackgroundId = storage.get(STORAGE_KEYS.defaultBackground);
    defaultBackgroundId = backgroundLibrary.some((item) => item.id === savedDefaultBackgroundId) ? savedDefaultBackgroundId : DEFAULT_BACKGROUND_ID;
    randomBackgroundOnOpen = storage.get(STORAGE_KEYS.randomBackground) === "true";
    const savedBackgroundId = storage.get(STORAGE_KEYS.selectedBackground);
    const preferredBackgroundId = randomBackgroundOnOpen
      ? randomBackgroundId()
      : backgroundLibrary.some((item) => item.id === savedBackgroundId)
        ? savedBackgroundId
        : defaultBackgroundId;
    const savedSongId = storage.get(STORAGE_KEYS.selectedSong);
    const savedRepeatMode = storage.get(STORAGE_KEYS.repeat);
    selectedSongId = songLibrary.some((item) => item.id === savedSongId) ? savedSongId : DEFAULT_SONG_ID;
    repeatMode = ["one", "all", "shuffle"].includes(savedRepeatMode) ? savedRepeatMode : "one";
    const savedVolume = Number(storage.get(STORAGE_KEYS.volume));

    renderBackgroundGrid();
    applyBackground(preferredBackgroundId, { persist: true });
    renderSongList();
    applySong(selectedSongId, { persist: false });

    if (audio) {
      audio.volume = Number.isFinite(savedVolume) ? Math.min(1, Math.max(0, savedVolume)) : 0.82;
      audio.loop = false;
    }

    syncBackgroundUI();
    syncMusicUI();
  };

  heroImage?.addEventListener("load", updateImageLayout);

  if (heroImage?.complete) {
    updateImageLayout();
  }

  const initCursorTrail = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");

    if (!hero || !trailLayer || reduceMotion.matches || !finePointer.matches) {
      return;
    }

    const colors = [
      ["rgba(104, 166, 245, 0.88)", "rgba(104, 166, 245, 0.46)"],
      ["rgba(166, 132, 226, 0.84)", "rgba(166, 132, 226, 0.42)"],
      ["rgba(199, 207, 226, 0.76)", "rgba(199, 207, 226, 0.36)"],
      ["rgba(95, 135, 178, 0.76)", "rgba(95, 135, 178, 0.34)"],
      ["rgba(220, 82, 96, 0.78)", "rgba(220, 82, 96, 0.36)"]
    ];
    const poolSize = 34;
    const particles = Array.from({ length: poolSize }, () => {
      const particle = document.createElement("span");
      particle.className = "cursor-trail-particle";
      trailLayer.appendChild(particle);
      return particle;
    });

    let particleIndex = 0;
    let lastEmit = 0;
    let bounds = hero.getBoundingClientRect();

    const refreshBounds = () => {
      bounds = hero.getBoundingClientRect();
    };

    const chooseColor = () => colors[Math.floor(Math.random() * colors.length)];

    const emitParticle = (event) => {
      const now = performance.now();

      if (now - lastEmit < 42 || (event.pointerType && event.pointerType !== "mouse")) {
        return;
      }

      lastEmit = now;
      const particle = particles[particleIndex];
      particleIndex = (particleIndex + 1) % particles.length;
      particle.getAnimations().forEach((animation) => animation.cancel());

      const [color, glow] = chooseColor();
      const size = 7 + Math.random() * 9;
      const x = event.clientX - bounds.left + (Math.random() - 0.5) * 14;
      const y = event.clientY - bounds.top + (Math.random() - 0.5) * 14;
      const driftX = (Math.random() - 0.5) * 72;
      const driftY = 22 + Math.random() * 54;
      const rotate = (Math.random() - 0.5) * 180;
      const duration = 540 + Math.random() * 360;

      particle.style.setProperty("--trail-size", `${size.toFixed(2)}px`);
      particle.style.setProperty("--trail-color", color);
      particle.style.setProperty("--trail-glow", glow);

      particle.animate([
        {
          opacity: 1,
          transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rotate * 0.15}deg) scale(1)`
        },
        {
          opacity: 0.7,
          offset: 0.38,
          transform: `translate3d(${(x + driftX * 0.28).toFixed(2)}px, ${(y + driftY * 0.28).toFixed(2)}px, 0) rotate(${rotate * 0.45}deg) scale(0.92)`
        },
        {
          opacity: 0,
          transform: `translate3d(${(x + driftX).toFixed(2)}px, ${(y + driftY).toFixed(2)}px, 0) rotate(${rotate}deg) scale(0.34)`
        }
      ], {
        duration,
        easing: "cubic-bezier(.2, .7, .2, 1)",
        fill: "forwards"
      });
    };

    hero.addEventListener("pointerenter", refreshBounds, { passive: true });
    hero.addEventListener("pointermove", emitParticle, { passive: true });
    window.addEventListener("resize", refreshBounds, { passive: true });
  };

  initPreferences();
  initCursorTrail();

  card?.addEventListener("click", startRelaxing);
  card?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      startRelaxing();
    }
  });

  backgroundGrid?.addEventListener("click", (event) => {
    const backgroundCard = event.target.closest(".background-card");

    if (backgroundCard?.dataset.backgroundId) {
      applyBackground(backgroundCard.dataset.backgroundId);
    }
  });

  setDefaultBackgroundButton?.addEventListener("click", () => {
    defaultBackgroundId = selectedBackgroundId;
    storage.set(STORAGE_KEYS.defaultBackground, defaultBackgroundId);
    syncBackgroundUI();
  });

  restoreDefaultBackgroundButton?.addEventListener("click", () => {
    randomBackgroundOnOpen = false;
    storage.set(STORAGE_KEYS.randomBackground, "false");
    applyBackground(defaultBackgroundId);
  });

  randomBackgroundToggle?.addEventListener("click", () => {
    randomBackgroundOnOpen = !randomBackgroundOnOpen;
    storage.set(STORAGE_KEYS.randomBackground, String(randomBackgroundOnOpen));

    if (randomBackgroundOnOpen) {
      applyBackground(randomBackgroundId());
    }

    syncBackgroundUI();
  });

  songSearch?.addEventListener("input", renderSongList);

  songList?.addEventListener("click", (event) => {
    const songItem = event.target.closest(".song-item");

    if (songItem?.dataset.songId) {
      applySong(songItem.dataset.songId, { play: true });
    }
  });

  playToggle?.addEventListener("click", playSelectedSong);
  prevSongButton?.addEventListener("click", () => moveSong(-1));
  nextSongButton?.addEventListener("click", () => repeatMode === "shuffle" ? moveRandomSong() : moveSong(1));
  repeatToggle?.addEventListener("click", updateRepeatMode);
  audioProgress?.addEventListener("input", seekAudio);

  volumeSlider?.addEventListener("input", () => {
    if (!audio) {
      return;
    }

    audio.volume = Number(volumeSlider.value) / 100;
    storage.set(STORAGE_KEYS.volume, String(audio.volume));
    syncMusicUI();
  });

  audio?.addEventListener("loadedmetadata", syncProgressUI);
  audio?.addEventListener("durationchange", syncProgressUI);
  audio?.addEventListener("timeupdate", syncProgressUI);

  audio?.addEventListener("play", () => {
    body.classList.add("is-music-playing");
    syncMusicUI();
    syncProgressUI();
  });

  audio?.addEventListener("pause", () => {
    body.classList.remove("is-music-playing");
    syncMusicUI();
    syncProgressUI();
  });

  audio?.addEventListener("ended", () => {
    if (repeatMode === "one") {
      audio.currentTime = 0;
      syncProgressUI();
      audio.play().catch(() => {});
      return;
    }

    if (repeatMode === "all") {
      moveSong(1, true);
      return;
    }

    moveRandomSong(true);
  });

  audio?.addEventListener("volumechange", () => {
    storage.set(STORAGE_KEYS.volume, String(audio.volume));
    syncMusicUI();
  });

  document.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-close]");

    if (!closeTarget) {
      return;
    }

    if (closeTarget.dataset.close === "background") {
      closeBackgroundModal();
    }

    if (closeTarget.dataset.close === "music") {
      closeMusicDrawer();
    }

    if (closeTarget.dataset.close === "shortcuts") {
      closeShortcutsModal();
    }
  });

  switchPanel?.addEventListener("click", (event) => {
    const button = event.target.closest(".switch-button");

    if (!button) {
      return;
    }

    if (button.dataset.switch === "background") {
      openBackgroundModal(button);
    }

    if (button.dataset.switch === "music") {
      openMusicDrawer(button);
    }

    if (button.dataset.switch === "daiban") {
      window.open("file:///E:/My%20Project/daiban/index.html", "_blank", "noopener");
    }
  });

  backgroundInput?.addEventListener("change", () => {
    updateBackgroundFromFile(backgroundInput.files?.[0]);
    backgroundInput.value = "";
  });

  musicInput?.addEventListener("change", () => {
    updateMusicFromFile(musicInput.files?.[0]);
    musicInput.value = "";
  });

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const typing = isTypingTarget(event.target);

    if (key === "escape") {
      if (shortcutsModal?.classList.contains("is-open")) {
        closeShortcutsModal();
      } else if (backgroundModal?.classList.contains("is-open")) {
        closeBackgroundModal();
      } else if (musicDrawer?.classList.contains("is-open")) {
        closeMusicDrawer();
      }
      return;
    }

    if (event.defaultPrevented || event.repeat || typing) {
      return;
    }

    if (key === "r") {
      toggleSwitchPanel();
    }

    if (key === "p") {
      toggleMusicDrawer();
    }

    if (key === "t") {
      event.preventDefault();
      toggleTextCard();
    }

    if (key === "h") {
      event.preventDefault();
      toggleShortcutsModal();
    }

    if (key === "arrowleft") {
      event.preventDefault();
      seekAudioBy(-5);
    }

    if (key === "arrowright") {
      event.preventDefault();
      seekAudioBy(5);
    }

    if (key === "arrowup") {
      event.preventDefault();
      adjustVolumeBy(0.05);
    }

    if (key === "arrowdown") {
      event.preventDefault();
      adjustVolumeBy(-0.05);
    }

    if (key === "n") {
      event.preventDefault();
      moveSong(-1);
    }

    if (key === "m") {
      event.preventDefault();
      repeatMode === "shuffle" ? moveRandomSong() : moveSong(1);
    }

    if ((key === " " || key === "spacebar") && body.classList.contains("is-relaxing")) {
      event.preventDefault();
      playSelectedSong();
    }

    if (key === "e") {
      event.preventDefault();
      toggleBackgroundModal();
    }

    if (key === "k") {
      event.preventDefault();
      moveBackground(-1);
    }

    if (key === "l") {
      event.preventDefault();
      moveBackground(1);
    }
  });
})();
