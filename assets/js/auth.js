// ============================================================
//  auth.js — АУТЕНТИФИКАЦИЯ ДЕТЕЙ
//
//  Простейшая схема: при регистрации ребёнок придумывает PIN (4 цифры),
//  он хранится прямо в data.json рядом с kid. При входе — выбираешь
//  себя из списка, вводишь PIN, проверка клиентская.
//
//  Сессия: в localStorage пишем { kidId, loginAt }.
//  Это не безопасность — это «чтобы не перепутать, чей питомец».
//
//  Экспортирует:
//    Auth.register({ownerName, ownerNick, speciesId, petName, pin}) -> Promise<kid>
//    Auth.login(nick, pin)                                            -> Promise<kid>
//    Auth.currentKidId()                                             -> string|null
//    Auth.getCurrentKid()                                            -> Promise<kid|null>
//    Auth.logout()
//    Auth.requireAuth()                                              -> Promise<kid>, иначе redirect
//    Auth.requireAdmin(pin)                                          -> Promise<bool>
//    Auth.isAdminSession()                                           -> bool
// ============================================================

window.Auth = (function () {
  "use strict";

  const SESSION_KEY = "pets_session_v1";
  const ADMIN_KEY = "pets_admin_v1";

  // --- Валидация ---

  function normalizeNick(nick) {
    return (nick || "").trim().toLowerCase().replace(/\s+/g, "");
  }

  function validatePin(pin) {
    return /^\d{4}$/.test(String(pin));
  }

  // --- Сессия ---

  function setSession(kidId) {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ kidId, loginAt: Date.now() })
    );
  }

  function currentKidId() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw).kidId || null;
    } catch (e) {
      return null;
    }
  }

  function getCurrentKid() {
    const id = currentKidId();
    if (!id) return Promise.resolve(null);
    return window.Store.kidById(id);
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  // Бросает на login.html, если не залогинен. Возвращает Promise<kid>.
  function requireAuth() {
    return getCurrentKid().then((kid) => {
      if (!kid) {
        window.location.href = "login.html";
        return new Promise(() => {}); // никогда не зарезолвится, мы ушли
      }
      return kid;
    });
  }

  // --- Регистрация ---

  function register(opts) {
    const ownerName = (opts.ownerName || "").trim();
    const ownerNick = normalizeNick(opts.ownerNick);
    const speciesId = (opts.speciesId || "").trim();
    const petName = (opts.petName || "").trim();
    const pin = String(opts.pin || "");

    if (!ownerName) return Promise.reject(new Error("Введите имя хозяина"));
    if (!ownerNick) return Promise.reject(new Error("Придумайте ник"));
    if (!speciesId) return Promise.reject(new Error("Выберите вид питомца"));
    if (!petName) return Promise.reject(new Error("Придумайте кличку питомцу"));
    if (!validatePin(pin))
      return Promise.reject(new Error("PIN должен быть 4 цифры")));

    // Проверяем уникальность ника + существование вида.
    return window.Store.loadData().then((data) => {
      const dup = (data.kids || []).some((k) => k.ownerNick === ownerNick);
      if (dup) {
        throw new Error("Этот ник уже занят — выберите другой");
      }
      const species = (data.species || []).find((s) => s.id === speciesId);
      if (!species) throw new Error("Такого вида питомца не существует");

      const kid = {
        id: "kid-" + Date.now().toString(36),
        ownerName: ownerName,
        ownerNick: ownerNick,
        pin: pin,
        points: 0,
        inventory: [],
        pet: {
          species: speciesId,
          name: petName,
          mood: "happy",
          hunger: 70,
          lastFed: null,
          equipped: { hat: null, face: null, neck: null, body: null },
        },
        createdAt: new Date().toISOString(),
      };

      return window.Store.addKid(kid, `register ${ownerNick}`).then(() => {
        setSession(kid.id);
        return kid;
      });
    });
  }

  // --- Вход ---

  function login(nick, pin) {
    const norm = normalizeNick(nick);
    if (!validatePin(pin))
      return Promise.reject(new Error("PIN должен быть 4 цифры"));

    return window.Store.loadData().then((data) => {
      const kid = (data.kids || []).find((k) => k.ownerNick === norm);
      if (!kid) throw new Error("Нет такого ника");
      if (kid.pin !== String(pin)) throw new Error("Неверный PIN");
      setSession(kid.id);
      return kid;
    });
  }

  // --- Админская сессия (отдельная от детской) ---

  function requireAdmin(pin) {
    if (String(pin) !== String(window.CONFIG.adminPin)) {
      return Promise.reject(new Error("Неверный админ-PIN"));
    }
    sessionStorage.setItem(ADMIN_KEY, "1");
    return Promise.resolve(true);
  }

  function isAdminSession() {
    return sessionStorage.getItem(ADMIN_KEY) === "1";
  }

  function logoutAdmin() {
    sessionStorage.removeItem(ADMIN_KEY);
  }

  return {
    register,
    login,
    currentKidId,
    getCurrentKid,
    logout,
    requireAuth,
    requireAdmin,
    isAdminSession,
    logoutAdmin,
    normalizeNick,
    validatePin,
  };
})();
