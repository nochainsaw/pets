// ============================================================
//  main.js — ГАЛЕРЕЯ / ЛИДЕРБОРД (index.html)
// ============================================================

(function () {
  "use strict";

  // Если конфиг не заполнен — показываем предупреждение и выходим.
  if (!window.Store.isConfigured()) {
    document.getElementById("configWarn").style.display = "block";
    document.getElementById("gallery").innerHTML =
      '<div class="empty-state"><h3>Проект ещё не настроен</h3>' +
      "<p>Открой <code>config.js</code> и впиши свои данные.</p></div>";
    UI.renderTopActions();
    return;
  }

  let lastData = null;
  let sortMode = "points"; // 'points' | 'name'

  UI.renderTopActions();

  document.getElementById("sortPoints").addEventListener("click", () => {
    sortMode = "points";
    renderGallery();
  });
  document.getElementById("sortName").addEventListener("click", () => {
    sortMode = "name";
    renderGallery();
  });
  document.getElementById("refresh").addEventListener("click", () => {
    loadAndRender();
  });

  function loadAndRender() {
    const gallery = document.getElementById("gallery");
    gallery.className = "loading";
    gallery.innerHTML = '<span class="spinner"></span><p>Загружаем питомцев…</p>';

    window.Store
      .loadData()
      .then((data) => {
        lastData = data;
        renderGallery();
      })
      .catch((err) => {
        gallery.className = "";
        gallery.innerHTML =
          '<div class="empty-state"><h3>Не удалось загрузить 😕</h3>' +
          "<p>" +
          escapeHtml(err.message) +
          "</p>" +
          '<p class="muted">Проверь, что репозиторий существует и <code>data/data.json</code> закоммичен.</p></div>';
      });
  }

  function buildSpeciesMap(data) {
    const m = {};
    (data.species || []).forEach((s) => (m[s.id] = s));
    return m;
  }

  function renderGallery() {
    if (!lastData) return;
    const gallery = document.getElementById("gallery");
    const speciesMap = buildSpeciesMap(lastData);
    const myKidId = window.Auth.currentKidId();

    let kids = (lastData.kids || []).slice();

    if (sortMode === "points") {
      kids.sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0));
    } else {
      kids.sort((a, b) => {
        const an = (a.pet && a.pet.name) || "";
        const bn = (b.pet && b.pet.name) || "";
        return an.localeCompare(bn, "ru");
      });
    }

    if (kids.length === 0) {
      gallery.className = "";
      gallery.innerHTML =
        '<div class="empty-state"><h3>Здесь пока пусто 🌱</h3>' +
        "<p>Никто ещё не завёл питомца. Будь первым!</p>" +
        '<p><a class="btn" href="login.html">✨ Завести питомца</a></p></div>';
      return;
    }

    gallery.className = "grid";
    gallery.innerHTML = "";

    kids.forEach((kid, index) => {
      const card = document.createElement("a");
      card.href = "pet.html?id=" + encodeURIComponent(kid.id);
      card.className = "card" + (kid.id === myKidId ? " card--mine" : "");

      // Бейдж места (только в режиме «по очкам»)
      if (sortMode === "points") {
        const rank = document.createElement("div");
        rank.className = "card-rank";
        if (index === 0) rank.classList.add("gold");
        else if (index === 1) rank.classList.add("silver");
        else if (index === 2) rank.classList.add("bronze");
        rank.textContent = index + 1;
        card.appendChild(rank);
      }

      // Превью питомца
      const stage = document.createElement("div");
      window.PetRenderer.renderBase(stage, kid.pet, speciesMap, 140);
      stage.style.margin = "0 auto";
      card.appendChild(stage);

      // Имя питомца
      const name = document.createElement("div");
      name.className = "pet-name";
      name.textContent = (kid.pet && kid.pet.name) || "Без имени";
      card.appendChild(name);

      // Ранг
      const rank = window.Ranks.get(kid.points);
      const rankEl = document.createElement("span");
      rankEl.className = "rank-badge";
      rankEl.style.background = rank.color;
      rankEl.style.marginBottom = "4px";
      rankEl.innerHTML = '<span class="rank-icon">' + rank.icon + "</span>" + rank.title;
      card.appendChild(rankEl);

      // Хозяин
      const owner = document.createElement("div");
      owner.className = "owner";
      owner.textContent = kid.ownerName + " @" + kid.ownerNick;
      card.appendChild(owner);

      // Очки
      const pts = document.createElement("div");
      pts.className = "points";
      pts.textContent = "⭐ " + window.UI.points(kid.points);
      card.appendChild(pts);

      gallery.appendChild(card);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);
  }

  loadAndRender();
})();
