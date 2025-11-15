// script.js
import { loadQuizzes } from './parser.js';

// --- 전역 상태 ---
let allQuizData = [];
let currentQuizSet = [];
let currentQuestionIndex = 0;

// --- DOM 캐시 ---
const screens = document.querySelectorAll('.screen');
const startScreen = document.getElementById('start-screen');
const selectionScreen = document.getElementById('selection-screen');
const quizScreen = document.getElementById('quiz-screen');

const quizCard = document.getElementById('quiz-card');
const questionText = document.getElementById('question-text');
const answerText = document.getElementById('answer-text');
const quizCounter = document.getElementById('quiz-counter');

const btnStartCustom = document.getElementById('btn-start-custom');
const selectionListsContainer = document.getElementById('selection-lists');
const categoryButtonsContainer = document.getElementById(
  'selection-category-buttons'
);

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    allQuizData = await loadQuizzes();

    setupStartScreen();
    setupSelectionScreen();
  } catch (error) {
    console.error('퀴즈 데이터를 불러오는 중 오류:', error);
    alert('input.txt 또는 gicul.txt 를 불러오는 중 오류가 발생했습니다.');
  }
});

// --- 시작 화면 설정 ---
function setupStartScreen() {
  const total = allQuizData.length;
  const techCount = allQuizData.filter((q) => q.category === '2').length;
  const rulesCount = allQuizData.filter((q) => q.category === '3').length;
  const giculCount = allQuizData.filter((q) => q.category === 'gicul').length;

  // 버튼 텍스트 갱신
  document.querySelector('.btn-menu[data-mode="all"]').textContent =
    `1. 전체 (${total})`;
  document.querySelector('.btn-menu[data-mode="2"]').textContent =
    `2. 기술 (${techCount})`;
  document.querySelector('.btn-menu[data-mode="3"]').textContent =
    `3. 규정 (${rulesCount})`;
  document.querySelector('.btn-menu[data-mode="gicul"]').textContent =
    `4. 기출 (${giculCount})`;

  // 메뉴 버튼 클릭 핸들러
  document.querySelectorAll('.btn-menu').forEach((button) => {
    button.addEventListener('click', (e) => {
      const mode = e.target.getAttribute('data-mode');
      if (mode === 'select') {
        showScreen(selectionScreen);
      } else {
        startQuiz(mode);
      }
    });
  });
}

// --- 선택 화면 설정 ---
function setupSelectionScreen() {
  // 카테고리별 리스트 DOM
  const techList = selectionListsContainer.querySelector(
    '.selection-list-inner[data-cat="2"]'
  );
  const ruleList = selectionListsContainer.querySelector(
    '.selection-list-inner[data-cat="3"]'
  );
  const giculList = selectionListsContainer.querySelector(
    '.selection-list-inner[data-cat="gicul"]'
  );

  // 초기 리스트 비우기
  techList.innerHTML = '';
  ruleList.innerHTML = '';
  giculList.innerHTML = '';

  // 문제 항목 생성
  allQuizData.forEach((quiz) => {
    const item = document.createElement('div');
    item.className = 'selection-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'selection-checkbox';
    checkbox.value = quiz.id;

    const label = document.createElement('label');
    label.textContent = quiz.question || quiz.id;

    item.appendChild(checkbox);
    item.appendChild(label);

    // label 클릭 시 체크 토글
    label.addEventListener('click', () => {
      checkbox.checked = !checkbox.checked;
      updateCustomButton();
    });

    checkbox.addEventListener('change', updateCustomButton);

    // 카테고리별로 분배
    if (quiz.category === '2') {
      techList.appendChild(item);
    } else if (quiz.category === '3') {
      ruleList.appendChild(item);
    } else if (quiz.category === 'gicul') {
      giculList.appendChild(item);
    }
  });

  // 카테고리 헤더 버튼 클릭 -> 해당 블록 열기/닫기
  categoryButtonsContainer
    .querySelectorAll('.select-category-btn')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat');
        toggleCategoryBlock(cat);

        // 버튼 active 상태
        categoryButtonsContainer
          .querySelectorAll('.select-category-btn')
          .forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

  // 각 카테고리 블록의 h2 클릭으로도 열고 닫기
  selectionListsContainer
    .querySelectorAll('.selection-category-block')
    .forEach((block) => {
      const h2 = block.querySelector('h2');
      const cat = block.getAttribute('data-cat');
      h2.addEventListener('click', () => {
        toggleCategoryBlock(cat);
      });
    });

  // 커스텀 시작 버튼
  btnStartCustom.addEventListener('click', () => {
    const checkedInputs = selectionListsContainer.querySelectorAll(
      '.selection-checkbox:checked'
    );
    const selectedIds = Array.from(checkedInputs).map((input) => input.value);

    if (selectedIds.length === 0) {
      alert('최소 1개 이상의 문제를 선택해 주세요.');
      return;
    }

    currentQuizSet = allQuizData.filter((quiz) =>
      selectedIds.includes(quiz.id)
    );

    // 랜덤 섞기
    shuffleArray(currentQuizSet);
    currentQuestionIndex = 0;
    displayQuestion();
    showScreen(quizScreen);
  });

  // 메뉴로 돌아가기
  document
    .getElementById('btn-back-to-menu-select')
    .addEventListener('click', () => {
      showScreen(startScreen);
    });

  // 초기 버튼 텍스트
  updateCustomButton();
}

// 카테고리 블록 토글
function toggleCategoryBlock(cat) {
  const block = selectionListsContainer.querySelector(
    `.selection-category-block[data-cat="${cat}"]`
  );
  if (!block) return;

  const isOpen = block.classList.contains('open');
  if (isOpen) {
    block.classList.remove('open');
  } else {
    block.classList.add('open');
  }
}

// 커스텀 시작 버튼 텍스트 업데이트
function updateCustomButton() {
  const count = selectionListsContainer.querySelectorAll(
    '.selection-checkbox:checked'
  ).length;
  btnStartCustom.textContent = `선택한 문제로 시작 (${count}개)`;
}

// --- 퀴즈 로직 ---

// Fisher-Yates Shuffle
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function startQuiz(mode) {
  currentQuestionIndex = 0;

  if (mode === 'all') {
    currentQuizSet = [...allQuizData];
  } else if (mode === '2' || mode === '3' || mode === 'gicul') {
    currentQuizSet = allQuizData.filter((q) => q.category === mode);
  } else {
    // 기타 모드는 현재 없음
    currentQuizSet = [...allQuizData];
  }

  if (currentQuizSet.length === 0) {
    alert('선택한 모드에 해당하는 문제가 없습니다.');
    return;
  }

  shuffleArray(currentQuizSet);
  displayQuestion();
  showScreen(quizScreen);
}

function displayQuestion() {
  quizCard.classList.remove('is-flipped');

  const quiz = currentQuizSet[currentQuestionIndex];
  questionText.textContent = quiz.question || '';
  answerText.textContent = quiz.answer && quiz.answer.length > 0
    ? quiz.answer
    : '';

  quizCounter.textContent = `${currentQuestionIndex + 1} / ${currentQuizSet.length}`;
}

function showNextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex >= currentQuizSet.length) {
    alert('마지막 문제입니다! 처음으로 돌아갑니다.');
    shuffleArray(currentQuizSet);
    currentQuestionIndex = 0;
  }
  displayQuestion();
}

// 화면 전환
function showScreen(screenToShow) {
  screens.forEach((screen) => screen.classList.remove('active'));
  screenToShow.classList.add('active');
}

// 카드 클릭시 앞/뒤 뒤집기
quizCard.addEventListener('click', () => {
  quizCard.classList.toggle('is-flipped');
});

// 다음 버튼
document.getElementById('btn-next').addEventListener('click', showNextQuestion);

// 퀴즈 화면에서 메뉴로 돌아가기
document
  .getElementById('btn-back-to-menu-quiz')
  .addEventListener('click', () => {
    showScreen(startScreen);
    // 선택 화면 체크 해제는 유지해도 되고 필요하면 초기화 가능
  });
