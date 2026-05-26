(() => {
  const root = document.documentElement;
  const body = document.body;
  const card = document.querySelector(".glass-card");
  const audio = document.querySelector("#relax-audio");
  const switchPanel = document.querySelector(".switch-panel");
  const switchButtons = document.querySelectorAll(".switch-button");
  const backgroundInput = document.querySelector("#background-input");
  const musicInput = document.querySelector("#music-input");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");

  let backgroundObjectUrl = "";
  let musicObjectUrl = "";

  window.addEventListener("load", () => {
    body.classList.add("is-loaded");
  }, { once: true });

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
      audio.volume = 0.82;
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

  const updateBackground = (file) => {
    if (!file) {
      return;
    }

    if (backgroundObjectUrl) {
      URL.revokeObjectURL(backgroundObjectUrl);
    }

    backgroundObjectUrl = URL.createObjectURL(file);
    root.style.setProperty("--hero-image", `url("${backgroundObjectUrl}")`);
  };

  const updateMusic = (file) => {
    if (!file || !audio) {
      return;
    }

    if (musicObjectUrl) {
      URL.revokeObjectURL(musicObjectUrl);
    }

    musicObjectUrl = URL.createObjectURL(file);
    audio.src = musicObjectUrl;
    audio.load();

    if (body.classList.contains("is-relaxing")) {
      audio.play().catch(() => {});
    }
  };

  card?.addEventListener("click", startRelaxing);
  card?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      startRelaxing();
    }
  });

  switchPanel?.addEventListener("click", (event) => {
    const button = event.target.closest(".switch-button");

    if (!button) {
      return;
    }

    if (button.dataset.switch === "background") {
      backgroundInput?.click();
    }

    if (button.dataset.switch === "music") {
      musicInput?.click();
    }
  });

  backgroundInput?.addEventListener("change", () => {
    updateBackground(backgroundInput.files?.[0]);
    backgroundInput.value = "";
  });

  musicInput?.addEventListener("change", () => {
    updateMusic(musicInput.files?.[0]);
    musicInput.value = "";
  });

  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() !== "r" || event.repeat) {
      return;
    }

    const target = event.target;
    const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;

    if (!isTyping) {
      toggleSwitchPanel();
    }
  });

  if (reduceMotion.matches || !finePointer.matches) {
    return;
  }

  let rafId = 0;
  let nextX = 0;
  let nextY = 0;

  const update = () => {
    rafId = 0;
    root.style.setProperty("--mx", nextX.toFixed(3));
    root.style.setProperty("--my", nextY.toFixed(3));
    root.style.setProperty("--card-x", `${(nextX * 8).toFixed(2)}px`);
    root.style.setProperty("--card-y", `${(nextY * 8).toFixed(2)}px`);
    root.style.setProperty("--glow-x", `${50 + nextX * 8}%`);
    root.style.setProperty("--glow-y", `${42 + nextY * 8}%`);
  };

  window.addEventListener("pointermove", (event) => {
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    nextX = (event.clientX / width - 0.5) * 2;
    nextY = (event.clientY / height - 0.5) * 2;

    if (!rafId) {
      rafId = window.requestAnimationFrame(update);
    }
  }, { passive: true });
})();
