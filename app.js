/* global QUESTION_BANK */
(() => {
  const $ = (sel) => document.querySelector(sel);

  const hubView = $("#hubView");
  const quizView = $("#quizView");
  const topicGrid = $("#topicGrid");

  const homeBtn = $("#homeBtn");
  const resetBtn = $("#resetBtn");
  const finalBtn = $("#finalBtn");

  const quizTitle = $("#quizTitle");
  const quizSub = $("#quizSub");

  const sAnswered = $("#sAnswered");
  const sCorrect = $("#sCorrect");
  const sIncorrect = $("#sIncorrect");
  const sRemaining = $("#sRemaining");
  const progressBar = $("#progressBar");

  const flashcard = $("#flashcard");
  const qIndex = $("#qIndex");
  const qTopic = $("#qTopic");
  const qMulti = $("#qMulti");
  const qText = $("#qText");
  const optionsForm = $("#optionsForm");

  const submitBtn = $("#submitBtn");
  const nextBtn = $("#nextBtn");
  const backToHubBtn = $("#backToHubBtn");

  const resultBanner = $("#resultBanner");
  const yourSel = $("#yourSel");
  const correctSel = $("#correctSel");

  const donePanel = $("#donePanel");
  const doneSummary = $("#doneSummary");
  const restartBtn = $("#restartBtn");
  const doneHubBtn = $("#doneHubBtn");

  const overallStats = $("#overallStats");

  const bank = QUESTION_BANK;
  const topics = bank.topics || [];

  function shuffle(arr) {
    // Fisher–Yates
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function topicSummary() {
    const total = topics.reduce((a, t) => a + (t.questions?.length || 0), 0);
    const tcount = topics.length;
    overallStats.textContent = `${tcount} topics • ${total} questions`;
  }

  function renderHub() {
    topicGrid.innerHTML = "";
    topics.forEach((t) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "topic";
      el.innerHTML = `
        <h3>${escapeHtml(t.title)}</h3>
        <p class="muted">${t.questions.length} question${t.questions.length === 1 ? "" : "s"}</p>
      `;
      el.addEventListener("click", () => {
        location.hash = `#topic=${encodeURIComponent(t.id)}`;
      });
      topicGrid.appendChild(el);
    });
    topicSummary();
  }

  // Quiz state
  const state = {
    mode: "hub", // hub | topic | final
    topicId: null,
    questions: [],
    idx: 0,
    answered: 0,
    correct: 0,
    incorrect: 0,
    lastWasCorrect: null,
    lastSelectedIdxs: [],
  };

  function resetState() {
    state.questions = [];
    state.idx = 0;
    state.answered = 0;
    state.correct = 0;
    state.incorrect = 0;
    state.lastWasCorrect = null;
    state.lastSelectedIdxs = [];
  }

  function showHub() {
    resetState();
    hubView.classList.remove("hidden");
    quizView.classList.add("hidden");
    donePanel.classList.add("hidden");
    flashcard.classList.remove("flipped");
    location.hash = "#";
  }

  function showQuizView() {
    hubView.classList.add("hidden");
    quizView.classList.remove("hidden");
  }

  function setStats() {
    const total = state.questions.length;
    const remaining = Math.max(0, total - state.answered);
    sAnswered.textContent = String(state.answered);
    sCorrect.textContent = String(state.correct);
    sIncorrect.textContent = String(state.incorrect);
    sRemaining.textContent = String(remaining);

    const pct = total === 0 ? 0 : Math.round((state.answered / total) * 100);
    progressBar.style.width = `${pct}%`;
  }

  function renderQuestion() {
    const total = state.questions.length;
    const q = state.questions[state.idx];

    if (!q) {
      // done
      flashcard.classList.add("hidden");
      donePanel.classList.remove("hidden");
      const pct = total ? Math.round((state.correct / total) * 100) : 0;
      doneSummary.textContent = `You got ${state.correct}/${total} correct (${pct}%).`;
      setStats();
      return;
    }

    donePanel.classList.add("hidden");
    flashcard.classList.remove("hidden");
    flashcard.classList.remove("flipped");

    qIndex.textContent = `Question ${state.idx + 1} / ${total}`;
    qText.textContent = q.question;

    // topic pill (only for final test)
    if (state.mode === "final") {
      qTopic.classList.remove("hidden");
      qTopic.textContent = q.topicTitle || q.topicId || "Topic";
    } else {
      qTopic.classList.add("hidden");
      qTopic.textContent = "";
    }

    if (q.multi) qMulti.classList.remove("hidden");
    else qMulti.classList.add("hidden");

    // options
    optionsForm.innerHTML = "";
    const inputType = q.multi ? "checkbox" : "radio";
    q.options.forEach((opt, i) => {
      const id = `opt_${state.idx}_${i}`;
      const wrapper = document.createElement("div");
      wrapper.className = "opt";
      wrapper.innerHTML = `
        <input id="${id}" name="optGroup" type="${inputType}" value="${i}">
        <label for="${id}">${escapeHtml(opt.text)}</label>
      `;
      optionsForm.appendChild(wrapper);
    });

    submitBtn.disabled = false;
    setStats();
  }

  function listToUl(ul, items) {
    ul.innerHTML = "";
    if (!items.length) {
      const li = document.createElement("li");
      li.textContent = "— (nothing selected)";
      ul.appendChild(li);
      return;
    }
    items.forEach((txt) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${escapeHtml(txt)}</strong>`;
      ul.appendChild(li);
    });
  }

  function getSelectedIdxs() {
    const nodes = [...optionsForm.querySelectorAll("input")];
    return nodes.filter(n => n.checked).map(n => Number(n.value));
  }

  function computeCorrectness(q, selectedIdxs) {
    const correctIdxs = q.options.map((o, i) => o.correct ? i : -1).filter(i => i >= 0);
    const selSet = new Set(selectedIdxs);
    const corSet = new Set(correctIdxs);

    if (selectedIdxs.length === 0) return { ok: false, correctIdxs };

    if (q.multi) {
      // must match exactly
      if (selSet.size !== corSet.size) return { ok: false, correctIdxs };
      for (const i of corSet) if (!selSet.has(i)) return { ok: false, correctIdxs };
      return { ok: true, correctIdxs };
    }

    // single-choice
    return { ok: selectedIdxs.length === 1 && corSet.has(selectedIdxs[0]), correctIdxs };
  }

  function showBack(q, selectedIdxs, correctIdxs, ok) {
    const selectedText = selectedIdxs.map(i => q.options[i]?.text).filter(Boolean);
    const correctText = correctIdxs.map(i => q.options[i]?.text).filter(Boolean);

    listToUl(yourSel, selectedText);
    listToUl(correctSel, correctText);

    resultBanner.className = "result-banner " + (ok ? "ok" : "bad");
    resultBanner.textContent = ok ? "Correct ✅" : "Incorrect ❌";

    flashcard.classList.add("flipped");
  }

  function startTopic(topicId) {
    const topic = topics.find(t => t.id === topicId);
    if (!topic) { showHub(); return; }

    resetState();
    state.mode = "topic";
    state.topicId = topicId;
    state.questions = shuffle(topic.questions.map(q => ({ ...q, topicId: topic.id, topicTitle: topic.title })));
    quizTitle.textContent = `${topic.title} Quiz`;
    quizSub.textContent = `${topic.questions.length} question${topic.questions.length === 1 ? "" : "s"} • Flashcard mode`;

    showQuizView();
    renderQuestion();
  }

  function startFinal() {
    resetState();
    state.mode = "final";
    state.topicId = null;

    const all = [];
    topics.forEach(t => {
      t.questions.forEach(q => all.push({ ...q, topicId: t.id, topicTitle: t.title }));
    });

    state.questions = shuffle(all);
    quizTitle.textContent = "Final Test";
    quizSub.textContent = `${all.length} questions • All topics shuffled`;

    showQuizView();
    renderQuestion();
  }

  function resetCurrentQuiz() {
    if (state.mode === "hub") return;
    if (state.mode === "final") startFinal();
    else if (state.mode === "topic") startTopic(state.topicId);
  }

  function parseHash() {
    const h = location.hash || "";
    if (h.startsWith("#topic=")) {
      const topicId = decodeURIComponent(h.slice("#topic=".length));
      startTopic(topicId);
      return;
    }
    if (h === "#final") {
      startFinal();
      return;
    }
    // default
    hubView.classList.remove("hidden");
    quizView.classList.add("hidden");
  }

  // Event wiring
  finalBtn.addEventListener("click", () => { location.hash = "#final"; });
  homeBtn.addEventListener("click", showHub);
  backToHubBtn.addEventListener("click", showHub);
  doneHubBtn.addEventListener("click", showHub);
  resetBtn.addEventListener("click", resetCurrentQuiz);
  restartBtn.addEventListener("click", resetCurrentQuiz);

  submitBtn.addEventListener("click", () => {
    const q = state.questions[state.idx];
    if (!q) return;

    const selectedIdxs = getSelectedIdxs();
    const { ok, correctIdxs } = computeCorrectness(q, selectedIdxs);

    // Allow submit even if none selected, but count as incorrect and show back
    submitBtn.disabled = true;

    state.answered += 1;
    if (ok) state.correct += 1;
    else state.incorrect += 1;

    setStats();
    showBack(q, selectedIdxs, correctIdxs, ok);
  });

  nextBtn.addEventListener("click", () => {
    // advance
    state.idx += 1;
    renderQuestion();
  });

  // Routing
  window.addEventListener("hashchange", parseHash);

  // Init
  renderHub();
  parseHash();
})();
