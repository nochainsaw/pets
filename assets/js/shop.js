// ============================================================
//  shop.js — МАГАЗИН (shop.html)
//  Ребёнок тратит очки на шмотки. Редкие предметы (rare:true)
//  в магазине не продаются — их можно получить только промокодом
//  или от админа.
// ============================================================

(function () {
  "use strict";

  UI.renderTopActions();

  window.Auth.requireAuth().then((kid) => {
    loadAndRender(kid);
  }).catch(() => {
    // requireAuth сам сделает редирект
  });

  function loadAndRender(myKid) {
    const content = document.getElementById("content");
    content.className = "loading";
    content.innerHTML = '<span class="spinner"></span><p>Загружаем магазин…</p>';

    window.Store.loadData().then((data) => {
      // На всякий случай — перевитываем актуального ребёнка.
      const kid = (data.kids || []).find((k) => k.id === myKid.id) || myKid;
      const items = (data.items || []).filter((it) => !it.rare);
      renderShop(data, kid, items);
    }).catch((err) => {
      content.className = "empty-state";
      content.innerHTML = "<h3>Не загрузилось 😕</h3><p>" + err.message + "</p>";
    });
  }

  function renderShop(data, kid, items) {
    const content = document.getElementById("content");
    content.className = "";
    content.innerHTML = "";
    content.appendChild(document.getElementById("tpl").content.cloneNode(true));

    document.getElementById("balance").textContent = kid.points || 0;

    const grid = document.getElementById("shopGrid");
    grid.innerHTML = "";

    if (items.length === 0) {
      grid.className = "";
      grid.innerHTML = '<p class="muted">В магазине пока пусто.</p>';
      return;
    }

    const inventory = kid.inventory || [];

    items.forEach((it) => {
      const owned = inventory.indexOf(it.id) !== -1;
      const canAfford = (kid.points || 0) >= (it.cost || 0);

      const card = document.createElement("div");
      card.className =
        "shop-item" + (owned ? " shop-item--owned" : "");

      const img = document.createElement("img");
      img.className = "shop-sprite";
      img.src = window.PetRenderer.spriteUrl("items", it.sprite);
      img.alt = it.name;
      card.appendChild(img);

      const name = document.createElement("div");
      name.className = "shop-name";
      name.textContent = it.name;
      card.appendChild(name);

      const slot = document.createElement("div");
      slot.className = "shop-slot";
      slot.textContent = slotLabel(it.slot);
      card.appendChild(slot);

      const cost = document.createElement("div");
      cost.className = "shop-cost";
      cost.textContent = "⭐ " + it.cost;
      card.appendChild(cost);

      const btn = document.createElement("button");
      btn.className = "btn btn--small";
      btn.style.width = "100%";
      if (owned) {
        btn.textContent = "✓ Куплено";
        btn.disabled = true;
        btn.classList.add("btn--ghost");
      } else if (!canAfford) {
        btn.textContent = "Не хватает ⭐";
        btn.disabled = true;
        btn.classList.add("btn--ghost");
      } else {
        btn.textContent = "Купить";
        btn.addEventListener("click", () => buy(kid, it));
      }
      card.appendChild(btn);

      grid.appendChild(card);
    });
  }

  function slotLabel(slot) {
    return {
      hat: "голова",
      face: "лицо",
      neck: "шея",
      body: "тело",
    }[slot] || slot;
  }

  // Покупка: списываем очки и кладём предмет в инвентарь — атомарно в одном saveData.
  function buy(kid, item) {
    window.Store
      .saveData((d) => {
        const k = (d.kids || []).find((x) => x.id === kid.id);
        if (!k) throw new Error("Ты не найден в данных");

        k.inventory = k.inventory || [];
        if (k.inventory.indexOf(item.id) !== -1) {
          throw new Error("У тебя уже есть эта шмотка");
        }
        const cost = Number(item.cost) || 0;
        if ((Number(k.points) || 0) < cost) {
          throw new Error("Не хватает очков");
        }
        k.points = (Number(k.points) || 0) - cost;
        k.inventory.push(item.id);
        return d;
      }, "buy " + item.id + " by " + kid.ownerNick)
      .then(() => {
        window.Sfx.coins();
        window.UI.ok("Куплено: " + item.name + " 🎉");
        // Перезагружаем, чтобы обновить баланс и кнопки.
        setTimeout(() => location.reload(), 600);
      })
      .catch((err) => {
        window.Sfx.error();
        window.UI.error(err.message);
      });
  }
})();
