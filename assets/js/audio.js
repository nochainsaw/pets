// ============================================================
//  audio.js — ЗВУКИ БЕЗ ФАЙЛОВ
//
//  Все звуки синтезируются на лету через Web Audio API:
//  никаких mp3 в репо, ничего качать не надо, ничьи авторские
//  права не страдают.
//
//  Экспортирует:
//    Sfx.feed()    — чавканье/хрум при кормлении
//    Sfx.coins()   — звон монет (покупка, очки)
//    Sfx.levelUp() — фанфары (новый ранг, награда)
//    Sfx.click()   — короткий клик
//    Sfx.error()   — низкий «буп» ошибки
//    Sfx.enabled() — включено ли (пользователь мог не кликнуть → аудио-контекст ещё молчит)
//    Sfx.toggle()  — вкл/выкл (сохраняется в localStorage)
//    Sfx.isOn()    — текущее состояние
// ============================================================

window.Sfx = (function () {
  "use strict";

  const STORAGE_KEY = "pets_sound_on";
  let ctx = null;
  let enabled = localStorage.getItem(STORAGE_KEY) !== "0"; // по умолчанию вкл.

  // Контекст создаём лениво и «размораживаем» по первому жесту.
  function ensureCtx() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      } catch (e) {
        return null;
      }
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Базовая нота: oscillator → gain(огибающая) → выход.
  // type: 'sine'|'square'|'triangle'|'sawtooth'
  // freq: Гц, dur: секунды, vol: 0..1, slideTo: Гц (глиссандо)
  function tone(opts) {
    if (!enabled) return;
    const ac = ensureCtx();
    if (!ac) return;

    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(opts.freq, t);
    if (opts.slideTo) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, opts.slideTo),
        t + opts.dur
      );
    }

    const vol = opts.vol == null ? 0.2 : opts.vol;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);

    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + opts.dur + 0.02);
  }

  // Несколько нот подряд.
  function sequence(notes) {
    if (!enabled) return;
    const ac = ensureCtx();
    if (!ac) return;
    let delay = 0;
    notes.forEach((n) => {
      setTimeout(() => tone(n), delay * 1000);
      delay += n.dur + (n.gap || 0);
    });
  }

  // --- Конкретные звуки ---

  function feed() {
    // «хрум»: два коротких низких тона.
    sequence([
      { type: "sine", freq: 300, dur: 0.08, vol: 0.18 },
      { type: "sine", freq: 220, dur: 0.1, vol: 0.18, gap: 0.02 },
    ]);
  }

  function coins() {
    // звон монет: две высокие ноты вверх.
    sequence([
      { type: "square", freq: 988, dur: 0.07, vol: 0.12 },
      { type: "square", freq: 1319, dur: 0.12, vol: 0.12, gap: 0.02 },
    ]);
  }

  function levelUp() {
    // фанфары: мажорное трезвучие вверх.
    sequence([
      { type: "triangle", freq: 523, dur: 0.12, vol: 0.18 }, // до
      { type: "triangle", freq: 659, dur: 0.12, vol: 0.18, gap: 0.01 }, // ми
      { type: "triangle", freq: 784, dur: 0.18, vol: 0.2, gap: 0.01 }, // соль
      { type: "triangle", freq: 1047, dur: 0.25, vol: 0.22, gap: 0.01 }, // до (октава)
    ]);
  }

  function click() {
    tone({ type: "square", freq: 660, dur: 0.04, vol: 0.08 });
  }

  function error() {
    tone({ type: "sawtooth", freq: 180, slideTo: 120, dur: 0.2, vol: 0.15 });
  }

  function isOn() {
    return enabled;
  }

  function toggle() {
    enabled = !enabled;
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    if (enabled) click();
    return enabled;
  }

  return { feed, coins, levelUp, click, error, toggle, isOn };
})();
