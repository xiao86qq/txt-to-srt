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

  let backgroundObjectUrl = "";
  let musicObjectUrl = "";

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

  initCursorTrail();

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

    if (heroImage) {
      heroImage.src = backgroundObjectUrl;
    }
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

    if (button.dataset.switch === "daiban") {
      window.open("file:///E:/My%20Project/daiban/index.html", "_blank", "noopener");
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

})();
