const wrongImg = "./cat_with_new_text.png";
const correctImg = "./two_cats_high_five_no_background.png";

const QUESTIONS = [
  {
    id: 1,
    text: "Anh bi chamaig haana harsan be?",
    options: ["Surguuli", "Uuland", "Zaaland", "Arig Anya"],
    correctIndex: 2,
  },
  {
    id: 2,
    text: "Minii urgiin ovog??",
    options: ["Borjigon", "Taij", "Taijuud", "Saljiud"],
    correctIndex: 1,
    popup: { correct: "ahh good job 🧡", wrong: "How dare you!" },
  },
  {
    id: 3,
    text: "Minii idej chaddaggui zuil?",
    options: ["Haluun Nogoo", "Songino", "Byslag", "Ooh"],
    correctIndex: 0,
    popup: { correct: "Yes baby its disgusting", wrong: "Chi ch namaig medeh boloogv bainda" },
  },
  {
    id: 4,
    text: "Ayalhiig hvsdeg gazar?",
    options: ["Europe", "USA", "Egypt", "Japan"],
    correctIndex: 3,
    popup: { correct: "Okay I'll pack my things", wrong: "Go by youreself :(" },
  },
];

// ---------- Helpers ----------
function rand(min, max) {
  return Math.random() * (max - min) + min;
}
function makeConfettiPieces(count = 260) {
  const now = Date.now();
  return Array.from({ length: count }).map((_, i) => ({
    id: `${now}-${i}`,
    x: `${rand(0, 100)}vw`,
    size: `${rand(6, 14)}px`,
    rot: `${rand(-720, 720)}deg`,
    dur: `${rand(3.2, 6)}s`,
    delay: `${rand(0, 0.8)}s`,
    c: `hsl(${Math.floor(rand(0, 360))} 95% 60%)`,
  }));
}

// ---------- DOM ----------
const el = {
  scoreValue: document.getElementById("scoreValue"),

  stageQuiz: document.getElementById("stageQuiz"),
  stageCelebrate: document.getElementById("stageCelebrate"),
  stageValentine: document.getElementById("stageValentine"),

  questionText: document.getElementById("questionText"),
  options: document.getElementById("options"),
  metaBadge: document.getElementById("metaBadge"),
  quizActions: document.getElementById("quizActions"),

  btnToValentine: document.getElementById("btnToValentine"),
  btnRestartFromCelebrate: document.getElementById("btnRestartFromCelebrate"),

  valentineArea: document.getElementById("valentineArea"),
  btnYes: document.getElementById("btnYes"),
  btnNo: document.getElementById("btnNo"),
  yesCelebrateText: document.getElementById("yesCelebrateText"),
  btnRestartFromValentine: document.getElementById("btnRestartFromValentine"),

  stickerOverlay: document.getElementById("stickerOverlay"),
  stickerImg: document.getElementById("stickerImg"),
  stickerText: document.getElementById("stickerText"),

  confetti: document.getElementById("confetti"),
  yesPop: document.getElementById("yesPop"),
};

// ---------- State ----------
const total = QUESTIONS.length;
let index = 0;

let score = 0;
let scoredById = {};

let selected = null;
let locked = false;

let sticker = null; // "correct" | "wrong" | null
let popupText = "";

let stage = "quiz"; // quiz | celebrate | valentine
let valentineAnswer = null; // "yes" | null

let yesConfetti = false;
let yesPop = false;

let noTransform = "translate(0,0)";

let stickerTimer = null;
let goNextTimer = null;
let unlockTimer = null;

function currentQ() {
  return QUESTIONS[index];
}
function isLast() {
  return index === total - 1;
}
function status() {
  const q = currentQ();
  if (!locked || selected == null) return null;
  return selected === q.correctIndex ? "correct" : "wrong";
}

// ---------- UI helpers ----------
function setStage(next) {
  stage = next;

  el.stageQuiz.hidden = stage !== "quiz";
  el.stageCelebrate.hidden = stage !== "celebrate";
  el.stageValentine.hidden = stage !== "valentine";

  el.stageQuiz.setAttribute("aria-hidden", stage !== "quiz");
  el.stageCelebrate.setAttribute("aria-hidden", stage !== "celebrate");
  el.stageValentine.setAttribute("aria-hidden", stage !== "valentine");
}

function renderScore() {
  el.scoreValue.textContent = `${score}/${total}`;
}

function clearSticker() {
  sticker = null;
  popupText = "";
  el.stickerOverlay.hidden = true;
  el.stickerText.textContent = "";
}

function showSticker(kind) {
  if (stickerTimer) clearTimeout(stickerTimer);

  const q = currentQ();
  const raw = (q.popup && q.popup[kind]) || "";
  popupText = raw;
  sticker = kind;

  el.stickerOverlay.hidden = false;

  const hideImage = q.id === 2 || q.id === 3;

  if (hideImage) {
    el.stickerImg.style.display = "none";
  } else {
    el.stickerImg.style.display = "block";
    el.stickerImg.src = kind === "wrong" ? wrongImg : correctImg;
    el.stickerImg.className = `sticker ${kind === "wrong" ? "sticker--wrong" : ""}`;
  }

  el.stickerText.textContent = popupText || "";
  el.stickerText.className = `stickerText ${kind === "wrong" ? "stickerText--wrong" : ""}`;

  const duration = kind === "correct" ? 6000 : 3000;
  stickerTimer = setTimeout(() => clearSticker(), duration);
}

function renderBadge() {
  const s = status();
  el.metaBadge.innerHTML = "";
  if (!s) return;

  const span = document.createElement("span");
  span.className = `badge ${s === "correct" ? "badge--ok" : "badge--no"}`;
  span.textContent = s === "correct" ? "Correct 💙" : "Oops 🙈";
  el.metaBadge.appendChild(span);
}

function renderActions() {
  el.quizActions.innerHTML = "";
  if (!isLast()) return;

  const btn = document.createElement("button");
  btn.className = "nextBtn";
  btn.textContent = "Restart ↺";
  btn.addEventListener("click", restart);
  el.quizActions.appendChild(btn);
}

function renderOptions() {
  const q = currentQ();
  const s = status();

  el.questionText.textContent = q.text;
  el.options.innerHTML = "";

  q.options.forEach((label, i) => {
    const isSelected = selected === i;
    const isCorrect = q.correctIndex === i;

    let variant = "option";
    if (locked && isSelected && isCorrect) variant += " option--correct";
    if (locked && isSelected && !isCorrect) variant += " option--wrong";

    if (locked && s === "correct" && !isSelected && isCorrect) {
      variant += " option--hint";
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = variant;
    btn.textContent = label;
    btn.setAttribute("role", "listitem");

    // ✅ FIX: allow retry while popup still shows
    // block only during the brief lock window
    btn.disabled = locked;

    btn.addEventListener("click", () => pickOption(i));
    el.options.appendChild(btn);
  });
}

function renderQuiz() {
  renderScore();
  renderOptions();
  renderBadge();
  renderActions();
}

// ---------- Quiz flow ----------
function goNextQuestion() {
  if (isLast()) {
    setStage("celebrate");
    selected = null;
    locked = false;
    clearSticker();
    renderQuiz();
    return;
  }

  index += 1;
  selected = null;
  locked = false;
  clearSticker();
  renderQuiz();
}

function pickOption(i) {
  if (stage !== "quiz") return;

  // prevent double-click spam only during brief lock
  if (locked) return;

  const q = currentQ();
  const qid = q.id;

  selected = i;
  locked = true;

  const isCorrect = i === q.correctIndex;

  if (isCorrect) {
    if (!scoredById[qid]) {
      score += 1;
      scoredById[qid] = true;
    }

    showSticker("correct");
    renderQuiz();

    if (goNextTimer) clearTimeout(goNextTimer);
    goNextTimer = setTimeout(goNextQuestion, 900);
    return;
  }

  showSticker("wrong");
  renderQuiz();

  // ✅ unlock quickly so user can try again immediately
  if (unlockTimer) clearTimeout(unlockTimer);
  unlockTimer = setTimeout(() => {
    selected = null;
    locked = false;
    renderQuiz();
  }, 180);
}

// ---------- Valentine flow ----------
function moveNoButton() {
  const dx = Math.floor(rand(-160, 160));
  const dy = Math.floor(rand(-90, 90));
  noTransform = `translate(${dx}px, ${dy}px)`;
  el.btnNo.style.transform = noTransform;
}

function setConfetti(on) {
  yesConfetti = on;
  if (!yesConfetti) {
    el.confetti.hidden = true;
    el.confetti.innerHTML = "";
    return;
  }

  const pieces = makeConfettiPieces(260);
  el.confetti.hidden = false;
  el.confetti.innerHTML = "";

  pieces.forEach((p) => {
    const sp = document.createElement("span");
    sp.className = "confettiPiece";
    sp.style.setProperty("--x", p.x);
    sp.style.setProperty("--size", p.size);
    sp.style.setProperty("--rot", p.rot);
    sp.style.setProperty("--dur", p.dur);
    sp.style.setProperty("--delay", p.delay);
    sp.style.setProperty("--c", p.c);
    el.confetti.appendChild(sp);
  });
}

function setYesPop(on) {
  yesPop = on;
  el.yesPop.hidden = !yesPop;
}

function answerValentine(ans) {
  if (ans !== "yes") return;

  valentineAnswer = "yes";

  el.valentineArea.hidden = true;
  el.yesCelebrateText.hidden = false;

  setConfetti(true);
  setYesPop(true);

  setTimeout(() => setYesPop(false), 2400);
  setTimeout(() => setConfetti(false), 5200);
}

function goToValentineQuestion() {
  setStage("valentine");
  valentineAnswer = null;

  noTransform = "translate(0,0)";
  el.btnNo.style.transform = noTransform;

  el.valentineArea.hidden = false;
  el.yesCelebrateText.hidden = true;

  setConfetti(false);
  setYesPop(false);
}

function restart() {
  setStage("quiz");

  setConfetti(false);
  setYesPop(false);

  noTransform = "translate(0,0)";
  el.btnNo.style.transform = noTransform;

  index = 0;
  score = 0;
  scoredById = {};

  selected = null;
  locked = false;

  clearSticker();

  valentineAnswer = null;
  el.valentineArea.hidden = false;
  el.yesCelebrateText.hidden = true;

  renderQuiz();
}

// ---------- Events ----------
el.btnToValentine.addEventListener("click", goToValentineQuestion);
el.btnRestartFromCelebrate.addEventListener("click", restart);
el.btnRestartFromValentine.addEventListener("click", restart);

el.btnYes.addEventListener("click", () => answerValentine("yes"));
el.btnNo.addEventListener("mouseenter", moveNoButton);
el.btnNo.addEventListener("click", moveNoButton);

// ---------- Init ----------
(function init() {
  setStage("quiz");
  renderScore();
  renderQuiz();
})();
