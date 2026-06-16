// ============================================================
//  store.js — СЛОЙ ДАННЫХ
//  Единственный источник правды: data/data.json в репозитории GitHub.
//
//  Экспортирует:
//    Store.loadData()              -> Promise<data>
//    Store.saveData(updater)       -> Promise<data>   (updater: (data) => newData)
//    Store.updateKid(kidId, patch) -> Promise         (удобная обёртка над saveData)
//    Store.addKid(kid)             -> Promise
//    Store.kidById(id)             -> Promise<kid|null>
//    Store.isConfigured()          -> bool
//
//  Защита от гонок: перед каждой записью перечитываем актуальный файл
//  и применяем updater уже к свежим данным. При конфликте (409) повторяем.
// ============================================================

window.Store = (function () {
  "use strict";

  const CFG = window.CONFIG;
  const DATA_URL = window.DATA_FILE;

  // Очередь записей: гарантирует, что параллельные saveData идут строго последовательно.
  let chain = Promise.resolve();

  // ----------------------------------------------------------
  //  Внутренние хелперы
  // ----------------------------------------------------------

  function isConfigured() {
    return (
      CFG &&
      CFG.owner &&
      CFG.owner !== "YOUR_GITHUB_USERNAME" &&
      CFG.workerUrl &&
      !CFG.workerUrl.includes("твой-сабаккаунт")
    );
  }
  function notConfiguredError() {
    return new Error(
      "CONFIG не заполнен. Открой config.js и впиши owner и workerUrl. " +
        "Подробнее — в README.md."
    );
  }

  // Превращаем base64-строку из GitHub в текст (UTF-8 безопасно).
  function decodeBase64(b64) {
    // GitHub отдаёт base64 без переносов, но на всякий случай чистим.
    const clean = b64.replace(/\s/g, "");
    // decode → bytes → UTF-8 строка
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  // Кодируем текст в base64 (UTF-8 безопасно).
  function encodeBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  // RAW GET файла из Contents API с актуальным sha.
  // ?t=Date.now() — чтобы обойти кэш CDN.
  function fetchFile() {
    const url = `${DATA_URL}?t=${Date.now()}`;
    const res = fetch(url, {
      headers: window.authHeader(),
      cache: "no-store",
    }).then((r) => {
      if (r.status === 404) {
        throw new Error(
          "data/data.json не найден в репозитории. " +
            "Создай его (шаблон сгенерирован локально в проекте) и закоммить в репо."
        );
      }
      if (!r.ok) {
        return r.json().then(
          (body) => {
            throw new Error(
              `GitHub API ${r.status}: ${(body && body.message) || r.statusText}`
            );
          },
          () => {
            throw new Error(`GitHub API ${r.status}: ${r.statusText}`);
          }
        );
      }
      return r.json();
    });
    return res;
  }

  // PUT файла с актуальным sha.
  function putFile(contentB64, sha, message) {
    return fetch(DATA_URL, {
      method: "PUT",
      headers: Object.assign({}, window.authHeader(), {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        message: message || "update data.json",
        content: contentB64,
        sha: sha,
        branch: CFG.branch,
      }),
    }).then((r) => {
      if (!r.ok) {
        // Вернём статус, чтобы вызывающий код мог отреагировать на 409.
        return r.json().then(
          (body) => {
            const err = new Error(
              `GitHub API ${r.status}: ${(body && body.message) || r.statusText}`
            );
            err.status = r.status;
            throw err;
          },
          () => {
            const err = new Error(`GitHub API ${r.status}: ${r.statusText}`);
            err.status = r.status;
            throw err;
          }
        );
      }
      return r.json();
    });
  }

  // ----------------------------------------------------------
  //  Публичный API
  // ----------------------------------------------------------

  // Чтение данных. Возвращает распарсенный объект data.json.
  function loadData() {
    if (!isConfigured()) return Promise.reject(notConfiguredError());

    return fetchFile().then((file) => {
      const json = decodeBase64(file.content);
      const data = JSON.parse(json);
      data._sha = file.sha; // сохраняем для будущих записей
      return data;
    });
  }

  // Гарантированно валидная структура данных (если файл пустой/битый).
  function emptyData() {
    return {
      species: [],
      items: [],
      kids: [],
      meta: { version: 1, updatedAt: new Date().toISOString() },
    };
  }

  // Запись с защитой от гонок.
  // updater: (currentData) => newData  (newData может быть mutated currentData)
  // message: commit message
  function saveData(updater, message) {
    if (!isConfigured()) return Promise.reject(notConfiguredError());
    if (typeof updater !== "function") {
      return Promise.reject(new Error("saveData: updater must be a function"));
    }

    // Сериализуем все записи в одну цепочку.
    const run = chain.then(() => writeWithRetry(updater, message, 0));
    // Даже если эта запись упала — следующая должна стартовать, а не застрять.
    chain = run.catch(() => {});
    return run;
  }

  // Цикл read → updater → write с ретраями на 409.
  function writeWithRetry(updater, message, attempt) {
    const MAX = 3;
    return fetchFile()
      .then((file) => {
        let data;
        try {
          data = JSON.parse(decodeBase64(file.content));
        } catch (e) {
          // Файл битый — стартуем с пустой структуры, чтобы починить.
          console.warn("[store] data.json не парсится, перезаписываю пустым.", e);
          data = emptyData();
        }
        data._sha = file.sha;

        const updated = updater(data) || data;
        updated.meta = updated.meta || { version: 1 };
        updated.meta.updatedAt = new Date().toISOString();
        delete updated._sha;

        const b64 = encodeBase64(JSON.stringify(updated, null, 2));
        return putFile(b64, file.sha, message).then(() => updated);
      })
      .catch((err) => {
        if (err && err.status === 409 && attempt < MAX) {
          console.warn(
            `[store] конфликт записи (409), повтор ${attempt + 1}/${MAX}`
          );
          return writeWithRetry(updater, message, attempt + 1);
        }
        throw err;
      });
  }

  // --- Удобные обёртки над saveData ---

  // Изменить одного ребёнка: patch — частичный объект, вмерживаемый в kid.
  function updateKid(kidId, patch, message) {
    return saveData((data) => {
      const kid = (data.kids || []).find((k) => k.id === kidId);
      if (!kid) throw new Error(`Ребёнок ${kidId} не найден`);
      // Глубокий мерж для pet.equipped и т.п.
      if (patch.pet && kid.pet) {
        kid.pet = Object.assign({}, kid.pet, patch.pet);
        if (patch.pet.equipped) {
          kid.pet.equipped = Object.assign({}, kid.pet.equipped, patch.pet.equipped);
        }
        delete patch.pet;
      }
      Object.assign(kid, patch);
      return data;
    }, message || `update kid ${kidId}`);
  }

  // Добавить нового ребёнка.
  function addKid(kid, message) {
    return saveData((data) => {
      data.kids = data.kids || [];
      if (!kid.id) kid.id = "kid-" + Date.now().toString(36);
      if (!kid.createdAt) kid.createdAt = new Date().toISOString();
      data.kids.push(kid);
      return data;
    }, message || `add kid ${kid.ownerNick || kid.id}`);
  }

  // Получить ребёнка по id.
  function kidById(id) {
    return loadData().then((data) =>
      (data.kids || []).find((k) => k.id === id) || null
    );
  }

  return {
    loadData,
    saveData,
    updateKid,
    addKid,
    kidById,
    isConfigured,
  };
})();
