// A quiet daily affirmation + journal prompt.
// Runs on index.html (today) and archive.html (last 30 days).

(() => {
  "use strict";

  const DATA = {
    affirmations: "data/affirmations.json",
    prompts: "data/prompts.json",
  };

  // --- Theme handling ----------------------------------------------------

  const THEME_KEY = "quiet-moment-theme";

  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (_) {
      return null;
    }
  }

  function storeTheme(value) {
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch (_) {
      /* ignore */
    }
  }

  function preferredTheme() {
    const stored = getStoredTheme();
    if (stored === "light" || stored === "dark") return stored;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const icon = document.getElementById("theme-icon");
    if (icon) icon.textContent = theme === "dark" ? "☾" : "☀";
  }

  function initTheme() {
    applyTheme(preferredTheme());
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      storeTheme(next);
    });
  }

  // --- Rotation ----------------------------------------------------------

  // daysSinceEpoch using the visitor's LOCAL date — so the affirmation
  // changes at the visitor's local midnight, per PRD.
  function localDaysSinceEpoch(date = new Date()) {
    // Build a UTC-midnight timestamp from local Y/M/D so DST shifts can't
    // give us a fractional offset.
    const localMidnightUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.floor(localMidnightUtc / 86400000);
  }

  // Use two different stride multipliers so the affirmation index and the
  // prompt index advance independently — pairings vary as content grows.
  function indexForDay(arrayLength, daysSinceEpoch, stride = 1) {
    if (!arrayLength) return 0;
    // Multiplying by a stride that's coprime-ish with common array lengths
    // gives different pairings without losing determinism.
    const i = ((daysSinceEpoch * stride) % arrayLength + arrayLength) % arrayLength;
    return i;
  }

  function pickForDay(affirmations, prompts, daysSinceEpoch) {
    return {
      affirmation: affirmations[indexForDay(affirmations.length, daysSinceEpoch, 1)],
      prompt: prompts[indexForDay(prompts.length, daysSinceEpoch, 7)],
    };
  }

  // --- Date formatting ---------------------------------------------------

  function formatLongDate(date = new Date()) {
    try {
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch (_) {
      return date.toDateString();
    }
  }

  function formatShortDate(date) {
    try {
      return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch (_) {
      return date.toDateString();
    }
  }

  // --- Data loading ------------------------------------------------------

  async function loadData() {
    const [affRes, promptRes] = await Promise.all([
      fetch(DATA.affirmations, { cache: "no-cache" }),
      fetch(DATA.prompts, { cache: "no-cache" }),
    ]);
    if (!affRes.ok) throw new Error("affirmations.json not found");
    if (!promptRes.ok) throw new Error("prompts.json not found");
    const [affirmations, prompts] = await Promise.all([affRes.json(), promptRes.json()]);
    if (!Array.isArray(affirmations) || !affirmations.length) throw new Error("affirmations empty");
    if (!Array.isArray(prompts) || !prompts.length) throw new Error("prompts empty");
    return { affirmations, prompts };
  }

  // --- Today page --------------------------------------------------------

  async function renderToday() {
    const dateEl = document.getElementById("date");
    const affEl = document.getElementById("affirmation");
    const promptEl = document.getElementById("prompt");

    const now = new Date();
    if (dateEl) dateEl.textContent = formatLongDate(now);

    try {
      const { affirmations, prompts } = await loadData();
      const today = pickForDay(affirmations, prompts, localDaysSinceEpoch(now));
      if (affEl) affEl.textContent = today.affirmation;
      if (promptEl) promptEl.textContent = today.prompt;
    } catch (err) {
      if (affEl) affEl.textContent = "Something is quiet today.";
      if (promptEl) promptEl.textContent = "What is one small thing you can do for yourself right now?";
      // eslint-disable-next-line no-console
      console.error("Failed to load content:", err);
    }

    initCopyButton();
  }

  function initCopyButton() {
    const btn = document.getElementById("copy-btn");
    const status = document.getElementById("copy-status");
    const promptEl = document.getElementById("prompt");
    if (!btn || !status || !promptEl) return;

    btn.addEventListener("click", async () => {
      const text = promptEl.textContent || "";
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "absolute";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        status.textContent = "Copied.";
        status.classList.add("show");
        setTimeout(() => status.classList.remove("show"), 1600);
      } catch (_) {
        status.textContent = "Couldn't copy.";
        status.classList.add("show");
        setTimeout(() => status.classList.remove("show"), 1600);
      }
    });
  }

  // --- Archive page ------------------------------------------------------

  async function renderArchive() {
    const list = document.getElementById("archive-list");
    if (!list) return;

    try {
      const { affirmations, prompts } = await loadData();
      const now = new Date();
      const todayDse = localDaysSinceEpoch(now);
      list.innerHTML = "";

      for (let i = 0; i < 30; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dse = todayDse - i;
        const pair = pickForDay(affirmations, prompts, dse);

        const li = document.createElement("li");
        li.className = "archive-item";

        const dateP = document.createElement("p");
        dateP.className = "archive-date";
        dateP.textContent = i === 0 ? "Today · " + formatShortDate(d) : formatShortDate(d);

        const affP = document.createElement("p");
        affP.className = "archive-affirmation";
        affP.textContent = pair.affirmation;

        const promptP = document.createElement("p");
        promptP.className = "archive-prompt";
        promptP.textContent = pair.prompt;

        li.appendChild(dateP);
        li.appendChild(affP);
        li.appendChild(promptP);
        list.appendChild(li);
      }
    } catch (err) {
      list.innerHTML = '<li class="archive-loading">The archive could not be loaded.</li>';
      // eslint-disable-next-line no-console
      console.error("Failed to render archive:", err);
    }
  }

  // --- Bootstrap ---------------------------------------------------------

  function start() {
    initTheme();
    if (document.getElementById("affirmation")) {
      renderToday();
    } else if (document.getElementById("archive-list")) {
      renderArchive();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  // Expose for tests
  window.__quiet = { localDaysSinceEpoch, indexForDay, pickForDay };
})();
