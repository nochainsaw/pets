// ============================================================
//  КОНФИГУРАЦИЯ ПРОЕКТА «ЛАГЕРНЫЕ ПИТОМЦЫ»
//  Меняешь значения здесь — работают все страницы сразу.
//
//  Все запросы идут через Cloudflare Worker — токен GitHub
//  хранится в секрете воркера, в этом файле его нет и не должно быть.
//  См. worker/README-WORKER.md — как развернуть воркер.
// ============================================================
window.CONFIG = {
  // Адрес твоего воркера.
  workerUrl: "https://pets.hamster-gdepost.workers.dev",
  // --- Репозиторий (для отображения/ссылок на сайте) ---
  owner: "nochainsaw",
  repo: "pets",
  branch: "main",
  dataPath: "data/data.json",
  // --- PIN администратора ---
  adminPin: "6767",
};

(function () {
  const C = window.CONFIG;
  window.DATA_FILE = C.workerUrl.replace(/\/+$/, "");
  window.authHeader = function () {
    return { Accept: "application/json" };
  };
})();
