// ============================================================
//  КОНФИГУРАЦИЯ ПРОЕКТА «ЛАГЕРНЫЕ ПИТОМЦЫ»
//  Меняешь значения здесь — работают все страницы сразу.
// ============================================================

window.CONFIG = {
  // --- Репозиторий с данными ---
  // owner: твой ник на GitHub (как в URL: github.com/<owner>/<repo>)
  owner: "YOUR_GITHUB_USERNAME",
  // repo: название репозитория (например "pets")
  // Если хочешь адрес вида  username.github.io/pets  — назови репо "pets".
  repo: "pets",
  // branch: ветка, в которой лежит data.json (обычно main)
  branch: "main",

  // --- Токен для чтения/записи data.json ---
  // Создаётся: GitHub → Settings → Developer settings → Personal access tokens
  //            → Fine-grained tokens → права: Contents = Read and write (только на этот репо)
  // ВАЖНО: токен виден в коде страницы. Не клади в репо с чувствительными данными.
  //        Для лагеря это приемлемо (ты сам так решил).
  token: "ghp_ЗДЕСЬ_ТВОЙ_ТОКЕН",

  // --- PIN администратора ---
  // Вход в admin.html происходит по этому пину.
  adminPin: "0000",

  // --- Пути внутри репозитория ---
  dataPath: "data/data.json",

  // --- Базовый URL API ---
  // Если позже захочешь спрятать токен через Cloudflare Worker —
  // поменяй apiBase на адрес воркера и убери token выше.
  apiBase: "https://api.github.com",
};

// Путь к data.json в репо (для удобства)
window.DATA_FILE = `${window.CONFIG.apiBase}/repos/${window.CONFIG.owner}/${window.CONFIG.repo}/contents/${window.CONFIG.dataPath}`;

// Заголовок авторизации (собирается один раз)
function authHeader() {
  return {
    Authorization: `Bearer ${window.CONFIG.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}
window.authHeader = authHeader;
