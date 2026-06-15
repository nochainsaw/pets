// ============================================================
//  pet-renderer.js — ПОСЛОЙНЫЙ РЕНДЕР ПИТОМЦА
//
//  Контейнер 256×256, слои по z-order:
//    body (плащ/cape)  →  base (сам питомец)  →  neck (шарф/бабочка)
//    →  face (очки)  →  hat (шапка/корона)
//
//  Поддержка PNG: если рядом с .svg лежит .png с тем же именем —
//  можно просто заменить расширение в data.json (sprite: "cat.png").
//  Рендереру всё равно, он берёт путь как есть.
//
//  Экспортирует:
//    PetRenderer.render(container, pet, items, speciesMap, size)
//    PetRenderer.spriteUrl(kind, spriteName)   // kind: 'pets'|'items'
// ============================================================

window.PetRenderer = (function () {
  "use strict";

  const SPRITE_BASE = "assets/sprites";

  // Порядок слоёв снизу вверх. Плащ рисуем ПЕРЕД телом, чтобы тело было сверху.
  const LAYER_ORDER = [
    "body", // плащ, одежда на туловище (под телом в z-order не нужен, но ок)
    "base", // сам питомец
    "neck", // шарф, бабочка
    "face", // очки
    "hat",  // шапка, корона, цилиндр
  ];

  function spriteUrl(kind, spriteName) {
    if (!spriteName) return null;
    return `${SPRITE_BASE}/${kind}/${spriteName}`;
  }

  function makeImg(src, layer) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = layer;
    img.className = `pet-layer pet-layer--${layer}`;
    img.draggable = false;
    // Не ломаем вёрстку, если спрайта нет: всё равно кладём, но с onerror-скрытием.
    img.addEventListener("error", () => {
      img.style.display = "none";
    });
    return img;
  }

  // Строит индекс предметов по id для быстрого поиска.
  function indexItems(items) {
    const map = {};
    (items || []).forEach((it) => {
      map[it.id] = it;
    });
    return map;
  }

  // Главная функция: собирает DOM питомца в контейнере.
  //   container : HTMLElement (будет очищен)
  //   pet       : объект питомца {species, name, equipped, mood, ...}
  //   items     : массив всех предметов из data.json
  //   speciesMap: карта {speciesId: {sprite, name}}
  //   size      : число px (по умолчанию 256)
  function render(container, pet, items, speciesMap, size) {
    if (!container) return;
    size = size || 256;
    container.innerHTML = "";
    container.className = "pet-stage";
    container.style.width = size + "px";
    container.style.height = size + "px";

    const itemMap = indexItems(items);
    const species = speciesMap && speciesMap[pet.species];
    const baseSprite = species ? species.sprite : pet.species + ".svg";
    const equipped = (pet && pet.equipped) || {};

    const fragment = document.createDocumentFragment();

    LAYER_ORDER.forEach((layer) => {
      let sprite = null;
      let alt = layer;

      if (layer === "base") {
        sprite = baseSprite;
        alt = pet.species;
      } else {
        // Находим предмет в указанном слоте.
        const itemId = equipped[layer];
        if (itemId) {
          const item = itemMap[itemId];
          if (item) {
            sprite = item.sprite;
            alt = item.name || item.id;
          }
        }
      }

      if (sprite) {
        const kind = layer === "base" ? "pets" : "items";
        const url = spriteUrl(kind, sprite);
        fragment.appendChild(makeImg(url, layer, alt));
      }
    });

    container.appendChild(fragment);
    return container;
  }

  // Упрощённый рендер: только базовый питомец, без одежды.
  // Удобно для маленьких превьюшек в галерее.
  function renderBase(container, pet, speciesMap, size) {
    if (!container) return;
    size = size || 128;
    container.innerHTML = "";
    container.className = "pet-stage pet-stage--mini";
    container.style.width = size + "px";
    container.style.height = size + "px";

    const species = speciesMap && speciesMap[pet.species];
    const baseSprite = species ? species.sprite : pet.species + ".svg";
    const url = spriteUrl("pets", baseSprite);
    container.appendChild(makeImg(url, "base", pet.species));
    return container;
  }

  return {
    render,
    renderBase,
    spriteUrl,
    LAYER_ORDER,
  };
})();
