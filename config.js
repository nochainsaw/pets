// ============================================================
//  КОНФИГУРАЦИЯ ПРОЕКТА «ЛАГЕРНЫЕ ПИТОМЦЫ»
//  Меняешь значения здесь — работают все страницы сразу.
// ============================================================
//
//  ДВА РЕЖИМА РАБОТЫ:
//
//  1) ЧЕРЕЗ CLOUDFLARE WORKER (рекомендуется, токен спрятан):
//     useWorker: true, workerUrl: адрес твоего воркера.
//     Токен хранится в секрете воркера, в этом файле его нет.
//     См. worker/README-WORKER.md — как развернуть воркер.
//
//  2) НАПРЯМУЮ ЧЕРЕЗ GITHUB API (токен виден в коде — небезопасно):
//     useWorker: false, owner/repo/token заполнены.
//     GitHub будет регулярно отзывать токен автоматически.
//     Этот режим — только для быстрой отладки, не для лагеря.
// ============================================================

window.CONFIG = {
  // --- Включить проксирование через Cloudflare Worker ---
  useWorker: true,

  // Адрес твоего воркера (появится после деплоя в Cloudflare).
  // Скорее всего вида: https://pets-proxy.твой-сабаккаунт.workers.dev
  workerUrl: "https://pets.hamster-gdepost.workers.dev",

  // --- Для прямого режима (useWorker:false) ---
  owner: "nochainsaw",
  repo: "pets",
  branch: "main",
  // Не используется в режиме воркера. В режиме прямого доступа —
  // твой GitHub fine-grained токен.
  token: "",

  // --- PIN администратора (в обоих режимах) ---
  adminPin: "6767",

  // --- Пути ---
  dataPath: "data/data.json",
  // Прямой адрес GitHub API (используется только при useWorker:false).
  apiBase: "https://api.github.com",
};

// --- Внутреннее: куда слать запросы и какие заголовки ---
// dataEndpoint: адрес, по которому store.js читает/пишет data.json.
// authHeader(): заголовки запроса. В режиме воркера — без Authorization!
//               Токен живёт в секрете воркера и наружу не выходит.
(function () {
  const C = window.CONFIG;

  if (C.useWorker) {
    // Удаляем возможный trailing slash.
    window.DATA_FILE = C.workerUrl.replace(/\/+$/, "");
    window.authHeader = function () {
      return {
        Accept: "application/json",
      };
    };
  } else {
    window.DATA_FILE = `${C.apiBase}/repos/${C.owner}/${C.repo}/contents/${C.dataPath}`;
    window.authHeader = function () {
      return {
        Authorization: `Bearer ${C.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      };
    };
  }
})();
