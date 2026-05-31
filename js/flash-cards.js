const STORAGE_KEY = 'rumo_flashcards_quality_registration_v1';
function getFlashcardsRoot() { return document.getElementById('flashcardsAppRoot') || document.body; }
const PROGRESS_KEY = 'rumo_flashcards_quality_progress_v1';
const STUDENT_AREA_OPTIONS = ['Dormente de concreto', 'Dormente de madeira', 'AMV', 'Brita', 'Subcomponentes'];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const state = {
  registration: null,
  selectedArea: 'all',
  cards: [],
  quiz: [],
  currentCardIndex: 0,
  flipped: false,
  graded: false,
};

const elements = {
  themeToggle: $('#themeToggle'),
  landingPanels: $('#landingPanels'),
  registrationPanel: $('#registrationPanel'),
  registrationForm: $('#registrationForm'),
  studentName: $('#studentName'),
  studentArea: $('#studentArea'),
  trainingArea: $('#trainingArea'),
  coursePanel: $('#coursePanel'),
  studentBadge: $('#studentBadge'),
  studentSubline: $('#studentSubline'),
  cardsMetric: $('#cardsMetric'),
  areaMetric: $('#areaMetric'),
  documentMetric: $('#documentMetric'),
  progressMetric: $('#progressMetric'),
  flashcard: $('#flashcard'),
  cardCategoryFront: $('#cardCategoryFront'),
  cardCategoryBack: $('#cardCategoryBack'),
  cardQuestion: $('#cardQuestion'),
  cardAnswer: $('#cardAnswer'),
  cardCounter: $('#cardCounter'),
  cardProgressBar: $('#cardProgressBar'),
  prevCardBtn: $('#prevCardBtn'),
  flipCardBtn: $('#flipCardBtn'),
  nextCardBtn: $('#nextCardBtn'),
  goQuizBtn: $('#goQuizBtn'),
  studyPanel: $('#studyPanel'),
  quizPanel: $('#quizPanel'),
  quizForm: $('#quizForm'),
  gradeQuizBtn: $('#gradeQuizBtn'),
  clearQuizBtn: $('#clearQuizBtn'),
  backToCardsBtn: $('#backToCardsBtn'),
  resultPanel: $('#resultPanel'),
  resultSummary: $('#resultSummary'),
  answerReview: $('#answerReview'),
  printResultBtn: $('#printResultBtn'),
  retryQuizBtn: $('#retryQuizBtn'),
  restartCourseBtn: $('#restartCourseBtn'),
  backToRegisterBtn: $('#backToRegisterBtn'),
  resetAllBtn: $('#resetAllBtn'),
};

function init() {
  hydrateTheme();
  renderStudentAreaOptions();
  renderAreaOptions();
  attachEvents();
  restoreRegistration();
}

function hydrateTheme() {
  const storedTheme = localStorage.getItem('rumo_flashcards_theme') || 'light';
  getFlashcardsRoot().setAttribute('data-flash-theme', storedTheme);
  if (elements.themeToggle) elements.themeToggle.textContent = storedTheme === 'dark' ? '☀️ Tema claro' : '🌙 Tema escuro';
}

function toggleTheme() {
  const current = getFlashcardsRoot().getAttribute('data-flash-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  getFlashcardsRoot().setAttribute('data-flash-theme', next);
  localStorage.setItem('rumo_flashcards_theme', next);
  if (elements.themeToggle) elements.themeToggle.textContent = next === 'dark' ? '☀️ Tema claro' : '🌙 Tema escuro';
}

function renderAreaOptions() {
  elements.trainingArea.innerHTML = '';
  const all = document.createElement('option');
  all.value = 'all';
  all.textContent = 'Todas as áreas disponíveis';
  elements.trainingArea.appendChild(all);

  TRAINING_DATA.forEach((area) => {
    const option = document.createElement('option');
    option.value = area.id;
    option.textContent = area.area;
    elements.trainingArea.appendChild(option);
  });
}

function renderStudentAreaOptions() {
  elements.studentArea.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Selecione...';
  elements.studentArea.appendChild(placeholder);

  STUDENT_AREA_OPTIONS.forEach((area) => {
    const option = document.createElement('option');
    option.value = area;
    option.textContent = area;
    elements.studentArea.appendChild(option);
  });
}

function attachEvents() {
  if (elements.themeToggle) elements.themeToggle.addEventListener('click', toggleTheme);
  elements.registrationForm.addEventListener('submit', handleRegistration);
  elements.flashcard.addEventListener('click', flipCard);
  elements.flipCardBtn.addEventListener('click', flipCard);
  elements.prevCardBtn.addEventListener('click', () => moveCard(-1));
  elements.nextCardBtn.addEventListener('click', () => moveCard(1));
  elements.goQuizBtn.addEventListener('click', showQuiz);
  elements.backToCardsBtn.addEventListener('click', showCards);
  elements.gradeQuizBtn.addEventListener('click', gradeQuiz);
  elements.clearQuizBtn.addEventListener('click', clearQuizAnswers);
  elements.printResultBtn.addEventListener('click', () => window.print());
  elements.retryQuizBtn.addEventListener('click', retryQuiz);
  elements.restartCourseBtn.addEventListener('click', restartCourse);
  elements.backToRegisterBtn.addEventListener('click', backToRegister);
  elements.resetAllBtn.addEventListener('click', resetAll);
}

function handleRegistration(event) {
  event.preventDefault();
  const registration = {
    name: elements.studentName.value.trim(),
    studentArea: elements.studentArea.value,
    trainingArea: elements.trainingArea.value,
    startedAt: new Date().toISOString(),
  };

  if (!registration.name || !registration.studentArea || !registration.trainingArea) {
    alert('Preencha nome, área de atuação e área para estudo.');
    return;
  }

  state.registration = registration;
  state.selectedArea = registration.trainingArea;
  state.currentCardIndex = 0;
  state.flipped = false;
  state.graded = false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registration));
  localStorage.removeItem(PROGRESS_KEY);
  startCourse();
}

function restoreRegistration() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;

  try {
    const registration = JSON.parse(stored);
    if (!registration?.name || !registration?.studentArea || !registration?.trainingArea) return;
    state.registration = registration;
    state.selectedArea = registration.trainingArea;
    elements.studentName.value = registration.name;
    elements.studentArea.value = registration.studentArea;
    elements.trainingArea.value = registration.trainingArea;

    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    state.currentCardIndex = Number.isInteger(progress.currentCardIndex) ? progress.currentCardIndex : 0;
    startCourse();
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROGRESS_KEY);
  }
}

function startCourse() {
  const content = getSelectedContent(state.selectedArea);
  state.cards = content.cards;
  state.quiz = content.quiz.slice(0, 10);
  state.currentCardIndex = Math.min(state.currentCardIndex, Math.max(state.cards.length - 1, 0));
  state.flipped = false;

  elements.landingPanels.classList.add('hidden');
  elements.registrationPanel.classList.add('hidden');
  elements.coursePanel.classList.remove('hidden');
  elements.studyPanel.classList.remove('hidden');
  elements.quizPanel.classList.add('hidden');
  elements.resultPanel.classList.add('hidden');

  elements.studentBadge.textContent = `Fiscal: ${state.registration.name}`;
  elements.studentSubline.textContent = `Área de atuação: ${state.registration.studentArea} • Área do teste: ${content.areaLabel}`;
  elements.cardsMetric.textContent = String(state.cards.length);
  elements.areaMetric.textContent = content.areaLabel;
  elements.documentMetric.textContent = content.documentLabel;

  renderCard();
  renderQuiz();
}

function getSelectedContent(areaId) {
  const selected = areaId === 'all'
    ? TRAINING_DATA
    : TRAINING_DATA.filter((item) => item.id === areaId);

  const cards = selected.flatMap((item) => item.flashcards.map((card) => ({ ...card, area: item.area, document: item.document })));
  const quizPools = selected.map((item) => item.quiz.map((question) => ({ ...question, area: item.area, document: item.document })));
  const quiz = selected.length > 1 ? interleaveQuiz(quizPools) : (quizPools[0] || []);

  const areaLabel = areaId === 'all' ? 'Todas as áreas disponíveis' : (selected[0]?.area || 'Área não encontrada');
  const documentLabel = selected.length === 1 ? `${selected[0].document} • ${selected[0].sourceLabel}` : `${selected.length} documentos selecionados`;

  return { cards, quiz, areaLabel, documentLabel };
}

function interleaveQuiz(pools) {
  const output = [];
  const maxLength = Math.max(...pools.map((pool) => pool.length), 0);
  for (let index = 0; index < maxLength; index += 1) {
    pools.forEach((pool) => {
      if (pool[index]) output.push(pool[index]);
    });
  }
  return output;
}

function renderCard() {
  const card = state.cards[state.currentCardIndex];
  if (!card) return;

  elements.flashcard.classList.toggle('flipped', state.flipped);
  elements.cardCategoryFront.textContent = `${card.area} • ${card.category}`;
  elements.cardCategoryBack.textContent = `${card.document} • Resposta`;
  elements.cardQuestion.textContent = card.front;
  elements.cardAnswer.textContent = card.back;
  elements.cardCounter.textContent = `Card ${state.currentCardIndex + 1} de ${state.cards.length}`;

  const progress = state.cards.length ? ((state.currentCardIndex + 1) / state.cards.length) * 100 : 0;
  elements.cardProgressBar.style.width = `${progress}%`;
  elements.progressMetric.textContent = `${Math.round(progress)}%`;
  elements.prevCardBtn.disabled = state.currentCardIndex === 0;
  elements.nextCardBtn.disabled = state.currentCardIndex === state.cards.length - 1;

  persistProgress();
}

function flipCard(event) {
  event.preventDefault();
  state.flipped = !state.flipped;
  elements.flashcard.classList.toggle('flipped', state.flipped);
}

function moveCard(direction) {
  const next = state.currentCardIndex + direction;
  if (next < 0 || next >= state.cards.length) return;
  state.currentCardIndex = next;
  state.flipped = false;
  renderCard();
}

function persistProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify({ currentCardIndex: state.currentCardIndex }));
}

function renderQuiz() {
  elements.quizForm.innerHTML = '';
  state.quiz.forEach((question, questionIndex) => {
    const card = document.createElement('article');
    card.className = 'question-card';
    card.dataset.questionIndex = questionIndex;

    const title = document.createElement('h3');
    title.textContent = `${questionIndex + 1}. ${question.question}`;
    card.appendChild(title);

    const options = document.createElement('div');
    options.className = 'options';

    question.options.forEach((option, optionIndex) => {
      const id = `q${questionIndex}_o${optionIndex}`;
      const label = document.createElement('label');
      label.className = 'option-label';
      label.setAttribute('for', id);

      const input = document.createElement('input');
      input.id = id;
      input.type = 'radio';
      input.name = `question_${questionIndex}`;
      input.value = String(optionIndex);

      const span = document.createElement('span');
      span.textContent = option;

      label.appendChild(input);
      label.appendChild(span);
      options.appendChild(label);
    });

    card.appendChild(options);
    elements.quizForm.appendChild(card);
  });
}

function showQuiz() {
  elements.studyPanel.classList.add('hidden');
  elements.quizPanel.classList.remove('hidden');
  elements.resultPanel.classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showCards() {
  elements.studyPanel.classList.remove('hidden');
  elements.quizPanel.classList.add('hidden');
  elements.resultPanel.classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getSelectedAnswers() {
  return state.quiz.map((_, index) => {
    const checked = document.querySelector(`input[name="question_${index}"]:checked`);
    return checked ? Number(checked.value) : null;
  });
}

function gradeQuiz() {
  const answers = getSelectedAnswers();
  const unanswered = answers.filter((answer) => answer === null).length;
  if (unanswered > 0) {
    alert(`Ainda faltam ${unanswered} questão(ões). Responda tudo antes de corrigir.`);
    return;
  }

  const score = answers.reduce((total, answer, index) => total + (answer === state.quiz[index].answer ? 1 : 0), 0);
  state.graded = true;
  markQuestions(answers);
  renderResult(score, answers);
  elements.resultPanel.classList.remove('hidden');
  window.scrollTo({ top: elements.resultPanel.offsetTop - 12, behavior: 'smooth' });
}

function markQuestions(answers) {
  $$('.question-card').forEach((card, index) => {
    card.classList.remove('correct', 'wrong');
    card.classList.add(answers[index] === state.quiz[index].answer ? 'correct' : 'wrong');
  });
}

function renderResult(score, answers) {
  const total = state.quiz.length;
  const percentage = Math.round((score / total) * 100);
  const now = new Date();
  const content = getSelectedContent(state.selectedArea);
  const status = percentage >= 70 ? 'Aproveitamento satisfatório' : 'Recomenda-se reforço no estudo';

  elements.resultSummary.innerHTML = '';
  const summaryItems = [
    ['Fiscal', state.registration.name],
    ['Área de atuação', state.registration.studentArea],
    ['Área do teste', content.areaLabel],
    ['Data e hora', now.toLocaleString('pt-BR')],
    ['Resultado', `${score}/${total} acertos`],
    ['Aproveitamento', `${percentage}%`],
    ['Parecer', status],
    ['Procedimento base', content.documentLabel],
  ];

  summaryItems.forEach(([label, value]) => {
    const box = document.createElement('div');
    box.className = 'result-box';
    box.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    elements.resultSummary.appendChild(box);
  });

  elements.answerReview.innerHTML = '<h3>Correção comentada</h3>';
  state.quiz.forEach((question, index) => {
    const correct = answers[index] === question.answer;
    const row = document.createElement('div');
    row.className = `review-row ${correct ? 'correct' : 'wrong'}`;
    row.innerHTML = `
      <strong>${index + 1}. ${correct ? '✅ Correta' : '❌ Incorreta'} — ${question.question}</strong>
      <p class="muted">Resposta marcada: ${question.options[answers[index]]}</p>
      <p class="muted">Resposta correta: ${question.options[question.answer]}</p>
      <p class="muted">${question.explanation}</p>
    `;
    elements.answerReview.appendChild(row);
  });
}

function clearQuizAnswers() {
  $$('input[type="radio"]').forEach((input) => { input.checked = false; });
  $$('.question-card').forEach((card) => card.classList.remove('correct', 'wrong'));
  elements.resultPanel.classList.add('hidden');
}

function retryQuiz() {
  clearQuizAnswers();
  elements.quizPanel.classList.remove('hidden');
  elements.studyPanel.classList.add('hidden');
  window.scrollTo({ top: elements.quizPanel.offsetTop - 12, behavior: 'smooth' });
}

function backToRegister() {
  elements.landingPanels.classList.remove('hidden');
  elements.registrationPanel.classList.remove('hidden');
  elements.coursePanel.classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function restartCourse() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PROGRESS_KEY);
  state.registration = null;
  elements.registrationForm.reset();
  elements.trainingArea.value = 'all';
  backToRegister();
}

function resetAll() {
  const confirmed = confirm('Deseja limpar cadastro, progresso e respostas deste navegador?');
  if (!confirmed) return;
  restartCourse();
}

window.FlashCardsQualidade = { restartCourse, resetAll, toggleTheme, showCards, showQuiz };
init();
