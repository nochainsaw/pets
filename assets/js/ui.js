// ============================================================
//  ui.js — ОБЩИЕ UI-ХЕЛПЕРЫ
//  Тосты, рендер шапки (topActions), форматирование.
//  Используется всеми страницами.
// ============================================================

window.UI = (function () {
  "use strict";

  // --- Тосты ---

  let toastTimer = null;

  function toast(message, type) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = "show" + (type ? " " + type : "");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.className = (type ? type : "");
    }, 2600);
  }

  function ok(msg) {
    toast(msg, "ok");
  }
  function error(msg) {
    toast(msg, "error");
  }

  // --- Рендер действий в шапке ---
  // Зависит от того, залогинен ли ребёнок.

  function renderTopActions() {
    const box = document.getElementById("topActions");
    if (!box) return;

    const myKidId = window.Auth.currentKidId();

    box.innerHTML = "";

    if (myKidId) {
      const petLink = document.createElement("a");
      petLink.href = "pet.html";
      petLink.className = "btn btn--small";
      petLink.textContent = "🐶 Мой питомец";
      box.appendChild(petLink);

      const shopLink = document.createElement("a");
      shopLink.href = "shop.html";
      shopLink.className = "btn btn--ghost btn--small";
      shopLink.textContent = "🛒 Магазин";
      box.appendChild(shopLink);

      const logoutBtn = document.createElement("button");
      logoutBtn.className = "btn btn--ghost btn--small";
      logoutBtn.textContent = "Выйти";
      logoutBtn.addEventListener("click", () => {
        window.Auth.logout();
        window.UI.toast("Вы вышли", "ok");
        setTimeout(() => location.reload(), 500);
      });
      box.appendChild(logoutBtn);
    } else {
      const loginLink = document.createElement("a");
      loginLink.href = "login.html";
      loginLink.className = "btn btn--small";
      loginLink.textContent = "✨ Завести питомца";
      box.appendChild(loginLink);
    }

    // Ссылка на админку — всегда, вход по PIN.
    const adminLink = document.createElement("a");
    adminLink.href = "admin.html";
    adminLink.className = "btn btn--ghost btn--small";
    adminLink.textContent = "⚙ Админка";
    box.appendChild(adminLink);
  }

  // --- Форматирование очков ---

  function points(n) {
    return (Number(n) || 0).toString();
  }

  // --- Время с последней кормёжки в человекочитаемом виде ---

  function ago(iso) {
    if (!iso) return "никогда";
    const then = new Date(iso).getTime();
    if (isNaN(then)) return "—";
    const diff = Date.now() - then;
    const min = Math.floor(diff / 60000);
    if (min < 1) return "только что";
    if (min < 60) return min + " мин назад";
    const h = Math.floor(min / 60);
    if (h < 24) return h + " ч назад";
    const d = Math.floor(h / 24);
    return d + " дн назад";
  }

  return { toast, ok, error, renderTopActions, points, ago };
})();
