// ============================================================
//  ranks.js — IT-РАНГИ ПО ОЧКАМ
//
//  Ранг — чистая функция от очков, ничего не хранится в data.json.
//  Пороги расставлены «интервально»: первые ранги быстрые, дальше —
//  всё реже, чтобы у новичков был быстрый старт, а у лидеров —
//  долгая гонка.
//
//  Экспортирует:
//    Ranks.get(points)        -> { id, title, icon, color, min, next }
//    Ranks.progress(points)   -> { pct, current, next }   для полоски прогресса
//    Ranks.all()              -> массив всех рангов
// ============================================================

window.Ranks = (function () {
  "use strict";

  // Пороги в очках. min — накопленный минимум для этого ранга.
  // Можно свободно править под свою шкалу.
  const RANKS = [
    { id: "newbie",   title: "Новичок",      icon: "🐣", color: "#9e9e9e", min: 0 },
    { id: "student",  title: "Студент",      icon: "📚", color: "#8bc34a", min: 50 },
    { id: "coder",    title: "Кодер",        icon: "💻", color: "#03a9f4", min: 150 },
    { id: "dev",      title: "Разработчик",  icon: "⚙️", color: "#3f51b5", min: 350 },
    { id: "hacker",   title: "Хакер",        icon: "🕶️", color: "#673ab7", min: 700 },
    { id: "master",   title: "Мастер кода",  icon: "🔥", color: "#e91e63", min: 1200 },
    { id: "legend",   title: "Легенда ИТ",   icon: "👑", color: "#ffc107", min: 2000 }
  ];

  function all() {
    return RANKS.slice();
  }

  // Возвращает текущий ранг и информацию о следующем.
  function get(points) {
    points = Number(points) || 0;
    let current = RANKS[0];
    let next = null;
    for (let i = 0; i < RANKS.length; i++) {
      if (points >= RANKS[i].min) {
        current = RANKS[i];
        next = RANKS[i + 1] || null;
      }
    }
    return Object.assign({}, current, { next });
  }

  // Прогресс внутри текущего ранга для полоски 0..100%.
  function progress(points) {
    points = Number(points) || 0;
    const cur = get(points);
    const next = cur.next;
    let pct = 100;
    if (next) {
      const span = next.min - cur.min;
      const done = points - cur.min;
      pct = Math.max(0, Math.min(100, Math.round((done / span) * 100)));
    }
    return { pct, current: cur, next };
  }

  // Сколько очков осталось до следующего ранга (для подписи).
  function toNext(points) {
    points = Number(points) || 0;
    const info = progress(points);
    if (!info.next) return 0;
    return Math.max(0, info.next.min - points);
  }

  return { get, progress, toNext, all };
})();
