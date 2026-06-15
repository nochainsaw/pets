// ============================================================
//  admin.js — АДМИНКА (admin.html, десктоп)
//
//  Вход по админ-PIN (из config.js). Возможности:
//   - Список детей: очки ± и вручную, выдать шмотку, удалить.
//   - Шмотки: список + добавить новую.
//   - Виды: список + добавить новый.
//   - Сырой data.json (просмотр).
// ============================================================

(function () {
  "use strict";

  UI.renderTopActions();

  // --- Вход ---

  const loginScreen = document.getElementById("loginScreen");
  const workspace = document.getElementById("workspace");

  function showLogin() {
    loginScreen.style.display = "";
    workspace.style.display = "none";
  }
  function showWorkspace() {
    loginScreen.style.display = "none";
    workspace.style.display = "";
    loadAll();
  }

  if (window.Auth.isAdminSession()) {
    showWorkspace();
  } else {
    showLogin();
  }

  document.getElementById("adminPinBtn").addEventListener("click", () => {
    const pin = document.getElementById("adminPinInput").value;
    window.Auth.requireAdmin(pin).then(showWorkspace).catch((err) => {
      window.UI.error(err.message);
    });
  });
  document.getElementById("adminPinInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("adminPinBtn").click();
  });

  // --- Табы ---

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document.querySelectorAll(".tabpanel").forEach((p) => (p.style.display = "none"));
      document.getElementById("tab-" + tab.dataset.tab).style.display = "";
    });
  });

  // --- Данные ---

  let data = null;

  function loadAll() {
    window.Store
      .loadData()
      .then((d) => {
        data = d;
        renderKids();
        renderItems();
        renderSpecies();
        renderCodes();
        renderRaw();
      })
      .catch((err) => {
        window.UI.error("Не загрузилось: " + err.message);
      });
  }

  document.getElementById("reloadKids").addEventListener("click", loadAll);

  // --- ТАБ: ДЕТИ ---

  function renderKids() {
    const tbody = document.querySelector("#kidsTable tbody");
    tbody.innerHTML = "";
    const items = data.items || [];
    const kids = (data.kids || []).slice().sort((a, b) =>
      a.ownerNick.localeCompare(b.ownerNick, "ru")
    );

    kids.forEach((kid) => {
      const tr = document.createElement("tr");

      // Хозяин
      const tdOwner = document.createElement("td");
      tdOwner.innerHTML = "<strong>" + escapeHtml(kid.ownerName) + "</strong><br>" +
        '<span class="muted">@' + escapeHtml(kid.ownerNick) + "</span>";
      tr.appendChild(tdOwner);

      // Питомец
      const tdPet = document.createElement("td");
      tdPet.textContent = (kid.pet && kid.pet.name) + " (" + (kid.pet && kid.pet.species) + ")";
      tr.appendChild(tdPet);

      // PIN: показать/скрыть + сбросить
      const tdPin = document.createElement("td");
      tdPin.style.whiteSpace = "nowrap";

      const pinDisplay = document.createElement("span");
      pinDisplay.textContent = "••••";
      pinDisplay.style.fontFamily = "monospace";
      pinDisplay.style.marginRight = "4px";
      pinDisplay.dataset.shown = "0";

      const eyeBtn = document.createElement("button");
      eyeBtn.className = "btn btn--small btn--ghost";
      eyeBtn.textContent = "👁";
      eyeBtn.title = "Показать/скрыть PIN";
      eyeBtn.addEventListener("click", () => {
        if (pinDisplay.dataset.shown === "0") {
          pinDisplay.textContent = kid.pin || "—";
          pinDisplay.dataset.shown = "1";
          eyeBtn.textContent = "🙈";
        } else {
          pinDisplay.textContent = "••••";
          pinDisplay.dataset.shown = "0";
          eyeBtn.textContent = "👁";
        }
      });

      const resetBtn = document.createElement("button");
      resetBtn.className = "btn btn--small btn--ghost";
      resetBtn.textContent = "↻";
      resetBtn.title = "Сбросить PIN (сгенерировать новый)";
      resetBtn.addEventListener("click", () => resetPin(kid, pinDisplay, eyeBtn));

      tdPin.appendChild(pinDisplay);
      tdPin.appendChild(eyeBtn);
      tdPin.appendChild(resetBtn);
      tr.appendChild(tdPin);

      // Очки: − [input] + [set]
      const tdPoints = document.createElement("td");
      tdPoints.style.whiteSpace = "nowrap";

      const minusBtn = document.createElement("button");
      minusBtn.className = "btn btn--small btn--ghost";
      minusBtn.textContent = "−";
      minusBtn.addEventListener("click", () => changePoints(kid, -10));

      const pointsInput = document.createElement("input");
      pointsInput.type = "number";
      pointsInput.value = kid.points;
      pointsInput.style.width = "70px";
      pointsInput.style.margin = "0 4px";
      pointsInput.style.padding = "4px";
      pointsInput.style.border = "1px solid var(--border)";
      pointsInput.style.borderRadius = "6px";

      const setBtn = document.createElement("button");
      setBtn.className = "btn btn--small";
      setBtn.textContent = "=";
      setBtn.addEventListener("click", () => {
        const v = parseInt(pointsInput.value, 10);
        if (!isNaN(v)) setPoints(kid, v);
      });

      const plusBtn = document.createElement("button");
      plusBtn.className = "btn btn--small btn--ghost";
      plusBtn.textContent = "+";
      plusBtn.addEventListener("click", () => changePoints(kid, +10));

      tdPoints.appendChild(minusBtn);
      tdPoints.appendChild(pointsInput);
      tdPoints.appendChild(setBtn);
      tdPoints.appendChild(plusBtn);
      tr.appendChild(tdPoints);

      // Выдать шмотку
      const tdGive = document.createElement("td");
      const sel = document.createElement("select");
      sel.style.padding = "4px";
      sel.style.maxWidth = "160px";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "— выбрать —";
      sel.appendChild(placeholder);
      items.forEach((it) => {
        const opt = document.createElement("option");
        opt.value = it.id;
        opt.textContent = it.name + " [" + it.slot + "]";
        sel.appendChild(opt);
      });
      const giveBtn = document.createElement("button");
      giveBtn.className = "btn btn--small";
      giveBtn.textContent = "Выдать";
      giveBtn.style.marginLeft = "4px";
      giveBtn.addEventListener("click", () => {
        if (sel.value) giveItem(kid, sel.value);
      });
      tdGive.appendChild(sel);
      tdGive.appendChild(giveBtn);

      // Список того, что уже есть — для контекста.
      const have = document.createElement("div");
      have.className = "muted";
      have.style.fontSize = "0.75rem";
      have.style.marginTop = "4px";
      have.textContent = "В инвентаре: " + (kid.inventory || []).length + " шт.";
      tdGive.appendChild(have);

      tr.appendChild(tdGive);

      // Действия
      const tdActions = document.createElement("td");
      const delBtn = document.createElement("button");
      delBtn.className = "btn btn--small btn--danger";
      delBtn.textContent = "Удалить";
      delBtn.addEventListener("click", () => {
        if (confirm("Удалить " + kid.ownerName + " @" + kid.ownerNick + "?")) {
          deleteKid(kid);
        }
      });
      tdActions.appendChild(delBtn);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  }

  function changePoints(kid, delta) {
    const newPoints = Math.max(0, (Number(kid.points) || 0) + delta);
    setPoints(kid, newPoints);
  }

  function setPoints(kid, newPoints) {
    window.Store
      .updateKid(kid.id, { points: newPoints }, "set points " + kid.ownerNick + " = " + newPoints)
      .then(() => {
        window.UI.ok("Очки обновлены");
        loadAll();
      })
      .catch((err) => window.UI.error(err.message));
  }

  // Сгенерировать новый случайный 4-значный PIN и записать его.
  // Если pinDisplay/eyeBtn переданы — сразу показываем новое значение.
  function resetPin(kid, pinDisplay, eyeBtn) {
    const newPin = String(Math.floor(1000 + Math.random() * 9000));
    const ok = confirm(
      "Сбросить PIN для " + kid.ownerName + " @" + kid.ownerNick + "?\n" +
      "Новый PIN: " + newPin + "\n" +
      "(запиши и сообщи ребёнку)"
    );
    if (!ok) return;

    window.Store
      .updateKid(kid.id, { pin: newPin }, "reset pin " + kid.ownerNick)
      .then(() => {
        kid.pin = newPin; // обновляем локальный объект на случай, если таблицу не перерисуют
        if (pinDisplay) {
          pinDisplay.textContent = newPin;
          pinDisplay.dataset.shown = "1";
        }
        if (eyeBtn) eyeBtn.textContent = "🙈";
        window.UI.ok("PIN сброшен: " + newPin);
        loadAll();
      })
      .catch((err) => window.UI.error(err.message));
  }

  function giveItem(kid, itemId) {
    window.Store
      .saveData((d) => {
        const k = (d.kids || []).find((x) => x.id === kid.id);
        if (!k) throw new Error("Ребёнок не найден");
        k.inventory = k.inventory || [];
        if (k.inventory.indexOf(itemId) === -1) {
          k.inventory.push(itemId);
        }
        return d;
      }, "give item " + itemId + " to " + kid.ownerNick)
      .then(() => {
        window.UI.ok("Шмотка выдана 🎁");
        loadAll();
      })
      .catch((err) => window.UI.error(err.message));
  }

  function deleteKid(kid) {
    window.Store
      .saveData((d) => {
        d.kids = (d.kids || []).filter((k) => k.id !== kid.id);
        return d;
      }, "delete kid " + kid.ownerNick)
      .then(() => {
        window.UI.ok("Удалён");
        loadAll();
      })
      .catch((err) => window.UI.error(err.message));
  }

  // --- ТАБ: ШМОТКИ ---

  function renderItems() {
    const tbody = document.querySelector("#itemsTable tbody");
    tbody.innerHTML = "";
    (data.items || []).forEach((it) => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td><code>" + escapeHtml(it.id) + "</code></td>" +
        "<td>" + escapeHtml(it.name) + "</td>" +
        "<td>" + escapeHtml(it.slot) + "</td>" +
        "<td><code>" + escapeHtml(it.sprite) + "</code></td>" +
        "<td>" + escapeHtml(String(it.cost)) + "</td>";
      tbody.appendChild(tr);
    });
  }

  document.getElementById("addItemForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("newItemId").value.trim();
    const name = document.getElementById("newItemName").value.trim();
    const slot = document.getElementById("newItemSlot").value;
    const cost = parseInt(document.getElementById("newItemCost").value, 10) || 0;
    let sprite = document.getElementById("newItemSprite").value.trim();
    if (!sprite) sprite = id + ".svg"; // конвенция по умолчанию

    window.Store
      .saveData((d) => {
        d.items = d.items || [];
        if (d.items.some((x) => x.id === id)) {
          throw new Error("Шмотка с таким ID уже есть");
        }
        d.items.push({ id, name, slot, sprite, cost });
        return d;
      }, "add item " + id)
      .then(() => {
        window.UI.ok("Шмотка добавлена");
        document.getElementById("addItemForm").reset();
        loadAll();
      })
      .catch((err) => window.UI.error(err.message));
  });

  // --- ТАБ: ВИДЫ ---

  function renderSpecies() {
    const tbody = document.querySelector("#speciesTable tbody");
    tbody.innerHTML = "";
    (data.species || []).forEach((s) => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td><code>" + escapeHtml(s.id) + "</code></td>" +
        "<td>" + escapeHtml(s.name) + "</td>" +
        "<td><code>" + escapeHtml(s.sprite) + "</code></td>";
      tbody.appendChild(tr);
    });
  }

  document.getElementById("addSpeciesForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("newSpeciesId").value.trim();
    const name = document.getElementById("newSpeciesName").value.trim();
    let sprite = document.getElementById("newSpeciesSprite").value.trim();
    if (!sprite) sprite = id + ".svg";

    window.Store
      .saveData((d) => {
        d.species = d.species || [];
        if (d.species.some((x) => x.id === id)) {
          throw new Error("Вид с таким ID уже есть");
        }
        d.species.push({ id, name, sprite });
        return d;
      }, "add species " + id)
      .then(() => {
        window.UI.ok("Вид добавлен");
        document.getElementById("addSpeciesForm").reset();
        loadAll();
      })
      .catch((err) => window.UI.error(err.message));
  });

  // --- ТАБ: RAW ---

  function renderRaw() {
    const pre = document.getElementById("rawJson");
    const clone = JSON.parse(JSON.stringify(data));
    delete clone._sha;
    pre.textContent = JSON.stringify(clone, null, 2);
  }

  // --- ТАБ: ПРОМОКОДЫ ---

  function renderCodes() {
    // Таблица существующих кодов.
    const tbody = document.querySelector("#codesTable tbody");
    tbody.innerHTML = "";
    const items = data.items || [];
    const itemMap = {};
    items.forEach((it) => (itemMap[it.id] = it));

    (data.codes || []).forEach((c) => {
      const tr = document.createElement("tr");

      // Код
      const tdCode = document.createElement("td");
      tdCode.innerHTML = "<code style='font-size:1.1rem; font-weight:700'>" +
        escapeHtml(c.code) + "</code>";
      tdCode.style.cursor = "pointer";
      tdCode.title = "Нажми, чтобы скопировать";
      tdCode.addEventListener("click", () => {
        navigator.clipboard.writeText(c.code).then(
          () => window.UI.ok("Скопировано: " + c.code),
          () => window.UI.error("Не удалось скопировать")
        );
      });
      tr.appendChild(tdCode);

      // Описание
      const tdLabel = document.createElement("td");
      tdLabel.textContent = c.label || "—";
      tr.appendChild(tdLabel);

      // Награда
      const tdReward = document.createElement("td");
      const parts = [];
      if (Number(c.rewardPoints) > 0) parts.push("⭐ " + c.rewardPoints);
      if (c.rewardItem && itemMap[c.rewardItem]) {
        parts.push(itemMap[c.rewardItem].name + (itemMap[c.rewardItem].rare ? " ✨" : ""));
      }
      tdReward.textContent = parts.join(" + ") || "—";
      tr.appendChild(tdReward);

      // Использований
      const tdUses = document.createElement("td");
      const limit = c.maxUses != null ? " / " + c.maxUses : "";
      tdUses.textContent = (c.uses || 0) + limit;
      tr.appendChild(tdUses);

      // Статус
      const tdStatus = document.createElement("td");
      const isActive = c.active !== false &&
        (c.maxUses == null || (c.uses || 0) < c.maxUses);
      const status = document.createElement("span");
      status.className = "rank-badge";
      status.style.background = isActive ? "var(--ok)" : "var(--text-muted)";
      status.textContent = isActive ? "активен" : "неактивен";
      tdStatus.appendChild(status);
      tr.appendChild(tdStatus);

      // Действие: вкл/выкл
      const tdAction = document.createElement("td");
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "btn btn--small btn--ghost";
      toggleBtn.textContent = isActive ? "Выключить" : "Включить";
      toggleBtn.addEventListener("click", () => toggleCode(c));
      tdAction.appendChild(toggleBtn);
      tr.appendChild(tdAction);

      tbody.appendChild(tr);
    });

    // Селект предметов в форме создания.
    const sel = document.getElementById("newCodeItem");
    sel.innerHTML = '<option value="">— без предмета —</option>';
    items.forEach((it) => {
      const opt = document.createElement("option");
      opt.value = it.id;
      opt.textContent = it.name + " [" + it.slot + "]" + (it.rare ? " ✨" : "");
      sel.appendChild(opt);
    });
  }

  function toggleCode(code) {
    window.Store
      .saveData((d) => {
        const target = (d.codes || []).find((x) => x.code === code.code);
        if (!target) throw new Error("Код не найден");
        target.active = target.active === false ? true : false;
        return d;
      }, "toggle code " + code.code)
      .then(() => {
        window.UI.ok(code.active === false ? "Код включён" : "Код выключен");
        loadAll();
      })
      .catch((err) => window.UI.error(err.message));
  }

  document.getElementById("addCodeForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = document.getElementById("newCodeCode").value.trim().toUpperCase();
    const label = document.getElementById("newCodeLabel").value.trim();
    const rewardPoints = parseInt(document.getElementById("newCodePoints").value, 10) || 0;
    const rewardItem = document.getElementById("newCodeItem").value || null;
    const maxUsesRaw = document.getElementById("newCodeMaxUses").value.trim();
    const maxUses = maxUsesRaw ? parseInt(maxUsesRaw, 10) : null;

    if (!code) {
      window.UI.error("Введи код");
      return;
    }

    window.Store
      .saveData((d) => {
        d.codes = d.codes || [];
        if (d.codes.some((x) => String(x.code).toUpperCase() === code)) {
          throw new Error("Такой код уже есть");
        }
        d.codes.push({
          code: code,
          label: label,
          rewardPoints: rewardPoints,
          rewardItem: rewardItem,
          active: true,
          uses: 0,
          maxUses: maxUses
        });
        return d;
      }, "add code " + code)
      .then(() => {
        window.UI.ok("Код создан: " + code);
        document.getElementById("addCodeForm").reset();
        document.getElementById("newCodePoints").value = 20;
        loadAll();
      })
      .catch((err) => window.UI.error(err.message));
  });

  // --- Утилиты ---

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);
  }
})();
