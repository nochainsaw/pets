// ============================================================
//  login.js — РЕГИСТРАЦИЯ И ВХОД (login.html)
// ============================================================

(function () {
  "use strict";

  UI.renderTopActions();

  // --- Переключение табов ---

  const tabNew = document.getElementById("tabNew");
  const tabExist = document.getElementById("tabExist");
  const formRegister = document.getElementById("formRegister");
  const formLogin = document.getElementById("formLogin");

  function showRegister() {
    tabNew.classList.add("active");
    tabExist.classList.remove("active");
    formRegister.style.display = "";
    formLogin.style.display = "none";
  }
  function showLogin() {
    tabExist.classList.add("active");
    tabNew.classList.remove("active");
    formLogin.style.display = "";
    formRegister.style.display = "none";
    populateLoginSelect();
  }

  tabNew.addEventListener("click", showRegister);
  tabExist.addEventListener("click", showLogin);

  // --- Предзаполнение селекта входа ---

  function populateLoginSelect() {
    const sel = document.getElementById("loginSelect");
    if (!window.Store.isConfigured()) {
      sel.innerHTML = "<option>— проект не настроен (см. config.js) —</option>";
      return;
    }
    sel.innerHTML = '<option value="">— выбери себя —</option>';
    window.Store.loadData().then((data) => {
      const kids = (data.kids || []).slice().sort((a, b) =>
        a.ownerNick.localeCompare(b.ownerNick, "ru")
      );
      kids.forEach((k) => {
        const opt = document.createElement("option");
        opt.value = k.ownerNick;
        opt.textContent =
          k.ownerName + " @" + k.ownerNick + " (" + (k.pet && k.pet.name) + ")";
        sel.appendChild(opt);
      });
    }).catch((err) => {
      sel.innerHTML = "<option>ошибка загрузки: " + err.message + "</option>";
    });
  }

  // --- Выбор вида питомца ---

  let selectedSpecies = null;

  function renderSpeciesPicker() {
    const picker = document.getElementById("speciesPicker");
    if (!window.Store.isConfigured()) {
      picker.innerHTML = '<small class="muted">Сначала заполни config.js</small>';
      return;
    }
    window.Store.loadData().then((data) => {
      picker.innerHTML = "";
      const species = data.species || [];
      if (species.length === 0) {
        picker.innerHTML = '<small class="muted">Виды не заданы. Добавь их в админке.</small>';
        return;
      }
      const map = {};
      species.forEach((s) => (map[s.id] = s));
      species.forEach((s) => {
        const opt = document.createElement("div");
        opt.className = "species-option";
        opt.dataset.id = s.id;
        const img = document.createElement("img");
        img.src = window.PetRenderer.spriteUrl("pets", s.sprite);
        img.alt = s.name;
        opt.appendChild(img);
        const name = document.createElement("div");
        name.className = "name";
        name.textContent = s.name;
        opt.appendChild(name);
        opt.addEventListener("click", () => {
          selectedSpecies = s.id;
          document
            .querySelectorAll(".species-option")
            .forEach((o) => o.classList.remove("selected"));
          opt.classList.add("selected");
        });
        picker.appendChild(opt);
      });
    }).catch((err) => {
      picker.innerHTML = '<small class="muted">Ошибка: ' + err.message + "</small>";
    });
  }

  // --- Сабмит регистрации ---

  formRegister.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = formRegister.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Сохраняем…";

    window.Auth.register({
      ownerName: document.getElementById("ownerName").value,
      ownerNick: document.getElementById("ownerNick").value,
      speciesId: selectedSpecies,
      petName: document.getElementById("petName").value,
      pin: document.getElementById("pin").value,
    })
      .then(() => {
        UI.ok("Питомец заведён! 🎉");
        setTimeout(() => (window.location.href = "pet.html"), 700);
      })
      .catch((err) => {
        UI.error(err.message);
        btn.disabled = false;
        btn.textContent = "Завести питомца 🎉";
      });
  });

  // --- Сабмит входа ---

  formLogin.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = formLogin.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Входим…";

    const nick = document.getElementById("loginSelect").value;
    const pin = document.getElementById("loginPin").value;

    window.Auth.login(nick, pin)
      .then(() => {
        UI.ok("С возвращением! 👋");
        setTimeout(() => (window.location.href = "pet.html"), 500);
      })
      .catch((err) => {
        UI.error(err.message);
        btn.disabled = false;
        btn.textContent = "Войти 🚪";
      });
  });

  // Если уже залогинен — можно сразу показать вход.
  if (window.Auth.currentKidId()) {
    showLogin();
  } else {
    showRegister();
    renderSpeciesPicker();
  }
})();
