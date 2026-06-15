// ============================================================
//  pet.js — СТРАНИЦА ПИТОМЦА (pet.html)
//  v2: ранги, звуки, анимации, промокоды, ссылка на магазин.
// ============================================================

(function () {
  "use strict";

  UI.renderTopActions();
  addSoundToggle();

  const params = new URLSearchParams(location.search);
  const requestedId = params.get("id");
  const myKidId = window.Auth.currentKidId();
  const targetId = requestedId || myKidId;

  if (!targetId) {
    document.getElementById("content").className = "empty-state";
    document.getElementById("content").innerHTML =
      "<h3>Ты не залогинен 🤔</h3>" +
      "<p>Заведи питомца или войди, чтобы увидеть своего.</p>" +
      '<p><a class="btn" href="login.html">На страницу входа</a></p>';
    return;
  }

  function isMine(kid) {
    return kid && kid.id === myKidId;
  }

  let data = null;
  let kid = null;
  let itemMap = {};
  let speciesMap = {};
  let prevPoints = null; // чтобы заметить рост очков и сыграть фанфары

  loadAndRender();

  function loadAndRender() {
    const content = document.getElementById("content");
    content.className = "loading";
    content.innerHTML = '<span class="spinner"></span><p>Загружаем…</p>';

    window.Store
      .loadData()
      .then((d) => {
        data = d;
        kid = (d.kids || []).find((k) => k.id === targetId);
        if (!kid) {
          content.className = "empty-state";
          content.innerHTML =
            "<h3>Такого питомца нет 😢</h3>" +
            '<p><a href="index.html">← К галерее</a></p>';
          return;
        }
        itemMap = {};
        (d.items || []).forEach((it) => (itemMap[it.id] = it));
        speciesMap = {};
        (d.species || []).forEach((s) => (speciesMap[s.id] = s));
        render();
      })
      .catch((err) => {
        content.className = "empty-state";
        content.innerHTML = "<h3>Не загрузилось 😕</h3><p>" + err.message + "</p>";
      });
  }

  function render() {
    const content = document.getElementById("content");
    const tpl = document.getElementById("tpl");
    content.className = "";
    content.innerHTML = "";
    content.appendChild(tpl.content.cloneNode(true));

    // --- Рендер питомца (с одеждой) ---
    const stage = document.getElementById("stage");
    window.PetRenderer.render(stage, kid.pet, data.items, speciesMap, 320);

    document.getElementById("petName").textContent =
      (kid.pet && kid.pet.name) || "Без имени";
    document.getElementById("ownerLine").textContent =
      kid.ownerName + " @" + kid.ownerNick;
    document.getElementById("points").textContent = window.UI.points(kid.points);

    // --- Ранг с прогресс-баром ---
    renderRank(kid.points);

    // --- Сытость ---
    const hungerPct = computeHunger(kid.pet);
    const hungerEl = document.getElementById("hunger");
    hungerEl.textContent = hungerPct + "%";
    if (hungerPct < 30) hungerEl.style.color = "var(--warn)";
    else hungerEl.style.color = "";
    document.getElementById("lastFed").textContent = window.UI.ago(
      kid.pet && kid.pet.lastFed
    );

    // --- Кнопки ---
    const mine = isMine(kid);
    const feedBtn = document.getElementById("feedBtn");
    const reloadBtn = document.getElementById("reloadBtn");
    reloadBtn.addEventListener("click", () => {
      window.Sfx.click();
      loadAndRender();
    });

    if (mine) {
      feedBtn.addEventListener("click", feed);

      // Кнопка «Магазин»
      const shopLink = document.createElement("a");
      shopLink.href = "shop.html";
      shopLink.className = "btn btn--ghost";
      shopLink.textContent = "🛒 В магазин";
      feedBtn.parentNode.appendChild(shopLink);

      // Поле промокода (только владелец)
      renderCodeForm();

      // Рекорд очков для звукового оповещения о росте
      if (prevPoints !== null && Number(kid.points) > prevPoints) {
        celebrateLevelUp(stage);
      }
      prevPoints = Number(kid.points) || 0;

      renderInventory();
    } else {
      feedBtn.disabled = true;
      feedBtn.title = "Это не твой питомец";
      document.querySelector(".inventory").style.display = "none";
      document.getElementById("codeArea").style.display = "none";
    }
  }

  // --- Бейдж ранга + прогресс-бар ---
  function renderRank(points) {
    const holder = document.getElementById("rank");
    if (!holder) return;
    const info = window.Ranks.progress(points);
    const r = info.current;

    const badge = document.createElement("span");
    badge.className = "rank-badge";
    badge.style.background = r.color;
    badge.innerHTML = '<span class="rank-icon">' + r.icon + "</span>" + r.title;

    const bar = document.createElement("div");
    bar.className = "rank-bar";
    const fill = document.createElement("div");
    fill.style.width = info.pct + "%";
    fill.style.background = r.color;
    bar.appendChild(fill);

    const caption = document.createElement("div");
    caption.className = "muted";
    caption.style.fontSize = "0.8rem";
    caption.style.marginTop = "4px";
    if (info.next) {
      caption.textContent =
        "До ранга «" + info.next.title + "» " + info.next.icon +
        " — " + window.Ranks.toNext(points) + " ⭐";
    } else {
      caption.textContent = "Максимальный ранг! 👑";
    }

    holder.innerHTML = "";
    holder.appendChild(badge);
    holder.appendChild(bar);
    holder.appendChild(caption);
  }

  // --- Сытость (падает со временем) ---
  function computeHunger(pet) {
    if (!pet) return 0;
    let base = Number(pet.hunger);
    if (isNaN(base)) base = 50;
    if (!pet.lastFed) return Math.max(0, Math.round(base));
    const then = new Date(pet.lastFed).getTime();
    const hours = (Date.now() - then) / 3600000;
    const current = base - hours * 2;
    return Math.max(0, Math.min(100, Math.round(current)));
  }

  // --- Кормление со звуком + анимация ---
  function feed() {
    const btn = document.getElementById("feedBtn");
    btn.disabled = true;
    btn.textContent = "Кормим…";

    const patch = {
      pet: {
        hunger: 100,
        mood: "happy",
        lastFed: new Date().toISOString(),
      },
    };
    window.Store
      .updateKid(kid.id, patch, "feed " + kid.ownerNick)
      .then(() => {
        window.Sfx.feed();
        const stage = document.getElementById("stage");
        stage.classList.add("pet-stage--bounce");
        spawnHearts(stage);
        setTimeout(() => stage.classList.remove("pet-stage--bounce"), 800);
        window.UI.ok("Ням-ням! 😋");
        loadAndRender();
      })
      .catch((err) => {
        window.Sfx.error();
        window.UI.error(err.message);
        btn.disabled = false;
        btn.textContent = "🍎 Покормить";
      });
  }

  // --- Промокод ---
  function renderCodeForm() {
    const area = document.getElementById("codeArea");
    area.innerHTML = "";

    const label = document.createElement("div");
    label.style.fontWeight = "600";
    label.style.marginBottom = "6px";
    label.textContent = "🎟 Промокод";
    area.appendChild(label);

    const wrap = document.createElement("div");
    wrap.className = "code-input";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Введи код";
    input.maxLength = 32;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        redeem(input.value);
      }
    });

    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = "Активировать";
    btn.addEventListener("click", () => redeem(input.value));

    wrap.appendChild(input);
    wrap.appendChild(btn);
    area.appendChild(wrap);
  }

  function redeem(rawCode) {
    const code = String(rawCode || "").trim().toUpperCase();
    if (!code) return;

    window.Store
      .saveData((d) => {
        const k = (d.kids || []).find((x) => x.id === kid.id);
        if (!k) throw new Error("Ты не найден");

        const codes = d.codes || [];
        const entry = codes.find((c) => String(c.code).toUpperCase() === code);
        if (!entry) throw new Error("Такого кода не существует");
        if (entry.active === false) throw new Error("Этот код больше не действует");
        if (entry.maxUses != null && entry.uses >= entry.maxUses) {
          throw new Error("Код исчерпан (все использования прошли)");
        }

        k.redeemedCodes = k.redeemedCodes || [];
        if (k.redeemedCodes.indexOf(code) !== -1) {
          throw new Error("Ты уже вводил этот код");
        }

        // Выдаём награду.
        const rewardPts = Number(entry.rewardPoints) || 0;
        if (rewardPts > 0) {
          k.points = (Number(k.points) || 0) + rewardPts;
        }
        if (entry.rewardItem) {
          const item = (d.items || []).find((it) => it.id === entry.rewardItem);
          if (!item) throw new Error("Наградной предмет не найден: " + entry.rewardItem);
          k.inventory = k.inventory || [];
          if (k.inventory.indexOf(item.id) === -1) k.inventory.push(item.id);
        }

        k.redeemedCodes.push(code);
        entry.uses = (Number(entry.uses) || 0) + 1;
        return d;
      }, "redeem code " + code + " by " + kid.ownerNick)
      .then(() => {
        window.Sfx.levelUp();
        confetti();
        window.UI.ok("Код принят! 🎉");
        setTimeout(() => location.reload(), 900);
      })
      .catch((err) => {
        window.Sfx.error();
        window.UI.error(err.message);
        const area = document.getElementById("codeArea");
        if (area) {
          area.classList.add("shake");
          setTimeout(() => area.classList.remove("shake"), 450);
        }
      });
  }

  // --- Инвентарь ---
  const SLOTS = [
    { key: "hat", label: "Голова" },
    { key: "face", label: "Лицо" },
    { key: "neck", label: "Шея" },
    { key: "body", label: "Тело" },
  ];

  function renderInventory() {
    const root = document.getElementById("invSlots");
    root.innerHTML = "";

    const inv = kid.inventory || [];
    const equipped = (kid.pet && kid.pet.equipped) || {};

    SLOTS.forEach((slot) => {
      const itemsInSlot = inv
        .map((id) => itemMap[id])
        .filter((it) => it && it.slot === slot.key);

      const block = document.createElement("div");
      const h = document.createElement("div");
      h.style.fontWeight = "600";
      h.style.fontSize = "0.9rem";
      h.style.marginBottom = "6px";
      h.textContent = slot.label;
      block.appendChild(h);

      const grid = document.createElement("div");
      grid.className = "inv-grid";

      if (itemsInSlot.length === 0) {
        const empty = document.createElement("div");
        empty.className = "inv-slot inv-slot--empty";
        empty.textContent = "пусто";
        grid.appendChild(empty);
      } else {
        itemsInSlot.forEach((it) => {
          const cell = document.createElement("div");
          let cls = "inv-slot";
          if (equipped[slot.key] === it.id) cls += " inv-slot--equipped";
          if (it.rare) cls += " inv-slot--rare";
          cell.className = cls;

          const img = document.createElement("img");
          img.src = window.PetRenderer.spriteUrl("items", it.sprite);
          img.alt = it.name;
          cell.appendChild(img);

          const lbl = document.createElement("div");
          lbl.textContent = it.name;
          cell.appendChild(lbl);

          cell.addEventListener("click", () => {
            window.Sfx.click();
            toggleEquip(slot.key, it.id);
          });
          grid.appendChild(cell);
        });
      }

      block.appendChild(grid);
      root.appendChild(block);
    });
  }

  function toggleEquip(slotKey, itemId) {
    const currentlyEquipped = (kid.pet && kid.pet.equipped) || {};
    const newEquipped = Object.assign({}, currentlyEquipped);
    if (newEquipped[slotKey] === itemId) {
      newEquipped[slotKey] = null;
    } else {
      newEquipped[slotKey] = itemId;
    }

    window.Store
      .updateKid(kid.id, { pet: { equipped: newEquipped } }, "equip " + kid.ownerNick)
      .then(() => loadAndRender())
      .catch((err) => {
        window.Sfx.error();
        window.UI.error(err.message);
      });
  }

  // --- Эффекты ---

  // Сердечки летят вверх из случайных точек сцены.
  function spawnHearts(stage) {
    const symbols = ["❤️", "💛", "💚", "🧡"];
    for (let i = 0; i < 5; i++) {
      const h = document.createElement("div");
      h.className = "heart";
      h.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      h.style.left = 20 + Math.random() * (stage.offsetWidth - 40) + "px";
      h.style.top = 40 + Math.random() * 60 + "px";
      h.style.animationDelay = i * 0.08 + "s";
      stage.appendChild(h);
      setTimeout(() => h.remove(), 1500);
    }
  }

  // Фанфары при росте очков (новый ранг или любое увеличение).
  function celebrateLevelUp(stage) {
    const info = window.Ranks.progress(kid.points);
    const prevInfo = window.Ranks.progress(prevPoints);
    if (info.current.id !== prevInfo.current.id) {
      // Точно новый ранг — большие фанфары.
      window.Sfx.levelUp();
      confetti();
      stage.classList.add("pet-stage--glow");
      setTimeout(() => stage.classList.remove("pet-stage--glow"), 1600);
      window.UI.ok("Новый ранг: " + info.current.icon + " " + info.current.title + "!");
    }
  }

  // Конфетти на весь экран.
  function confetti() {
    const colors = ["#e07a3c", "#5b8fb9", "#4caf50", "#f5da4b", "#e74c3c", "#9c27b0"];
    const n = 60;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("div");
      p.className = "confetti-piece";
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDuration = 2 + Math.random() * 1.5 + "s";
      p.style.animationDelay = Math.random() * 0.5 + "s";
      p.style.transform = "rotate(" + Math.random() * 360 + "deg)";
      if (Math.random() > 0.5) p.style.borderRadius = "50%";
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 4000);
    }
  }

  // --- Переключатель звука в шапке ---
  function addSoundToggle() {
    const box = document.getElementById("topActions");
    if (!box) return;
    const btn = document.createElement("button");
    btn.className = "btn btn--ghost btn-icon";
    btn.title = "Звук вкл/выкл";
    function refresh() {
      btn.textContent = window.Sfx.isOn() ? "🔊" : "🔇";
    }
    refresh();
    btn.addEventListener("click", () => {
      window.Sfx.toggle();
      refresh();
    });
    box.appendChild(btn);
  }
})();
