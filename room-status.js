(function () {
  const ROOM_STATUS_URL = "https://keyvalue.immanuel.co/api/KeyVal/GetValue/pd937k96/availability";
  const COOLDOWN_SECONDS = 20;

  let cooldownInterval = null;
  let cooldownRemaining = 0;

  function updateBadgeState(state) {
    const badge = document.getElementById("roomStatusBadge");
    if (!badge) return;

    badge.className = "badge";
    let key = "";
    let fallbackText = "";

    switch (state) {
      case "open":
        badge.classList.add("text-bg-success");
        key = "roomStatus.open";
        fallbackText = "Açık";
        break;
      case "closed":
        badge.classList.add("text-bg-danger");
        key = "roomStatus.closed";
        fallbackText = "Kapalı";
        break;
      case "error":
        badge.classList.add("text-bg-warning", "text-dark");
        key = "roomStatus.error";
        fallbackText = "Bağlanılamadı";
        break;
      case "loading":
      default:
        badge.classList.add("text-bg-secondary");
        key = "roomStatus.loading";
        fallbackText = "Yükleniyor...";
        break;
    }

    badge.setAttribute("data-i18n", key);
    if (window.i18next && i18next.isInitialized && i18next.exists(key)) {
      badge.innerHTML = i18next.t(key);
    } else {
      badge.textContent = fallbackText;
    }
  }

  async function fetchRoomStatus() {
    updateBadgeState("loading");

    try {
      const response = await fetch(ROOM_STATUS_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const rawText = await response.text();
      const cleanVal = rawText.trim().replace(/"/g, "").toLowerCase();

      if (cleanVal === "true") {
        updateBadgeState("open");
      } else if (cleanVal === "false") {
        updateBadgeState("closed");
      } else {
        updateBadgeState("error");
      }
    } catch (err) {
      console.error("Room status request failed:", err);
      updateBadgeState("error");
    }
  }

  function startCooldown(seconds) {
    const btn = document.getElementById("roomRefreshBtn");
    const timer = document.getElementById("roomRefreshTimer");
    if (!btn || !timer) return;

    if (cooldownInterval) {
      clearInterval(cooldownInterval);
    }

    cooldownRemaining = seconds;
    btn.disabled = true;
    timer.textContent = ` (${cooldownRemaining}s)`;

    cooldownInterval = setInterval(() => {
      cooldownRemaining -= 1;
      if (cooldownRemaining <= 0) {
        clearInterval(cooldownInterval);
        cooldownInterval = null;
        btn.disabled = false;
        timer.textContent = "";
      } else {
        timer.textContent = ` (${cooldownRemaining}s)`;
      }
    }, 1000);
  }

  function handleRefreshClick() {
    if (cooldownRemaining > 0) return;
    fetchRoomStatus();
    startCooldown(COOLDOWN_SECONDS);
  }

  function init() {
    const btn = document.getElementById("roomRefreshBtn");
    if (btn) {
      btn.addEventListener("click", handleRefreshClick);
    }
    fetchRoomStatus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
