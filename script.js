// --- 전역 변수 및 DOM 요소 ---

let allQuizData = []; // 로드된 모든 퀴즈

let currentQuizSet = []; // 현재 풀고 있는 퀴즈 세트

let currentQuestionIndex = 0; // 현재 문제 번호

const screens = document.querySelectorAll('.screen');

const startScreen = document.getElementById('start-screen');

const selectionScreen = document.getElementById('selection-screen');

const quizScreen = document.getElementById('quiz-screen');

const quizCard = document.getElementById('quiz-card');

const questionText = document.getElementById('question-text');

const answerText = document.getElementById('answer-text');

const quizCounter = document.getElementById('quiz-counter');

const selectionList = document.getElementById('selection-list');

const btnStartCustom = document.getElementById('btn-start-custom');

// --- 1. 초기화 ---

// 페이지 로드가 완료되면 퀴즈 데이터를 불러옵니다.
document.addEventListener('DOMContentLoaded', async () => {
    try {
        allQuizData = await loadQuizzes(); // parser.js의 함수 호출

        setupStartScreen();
        setupSelectionScreen();
    } catch (error) {
        console.error("퀴즈 로딩 실패:", error);
        alert("input.txt 파일을 불러오는 데 실패했습니다. 파일이 같은 폴더에 있는지, 로컬 서버가 실행 중인지 확인하세요.");
    }
});

/**
 * 시작 화면의 버튼들에 퀴즈 개수를 표시하고 이벤트 리스너를 설정합니다.
 */
function setupStartScreen() {
    const total = allQuizData.length;
    const techCount = allQuizData.filter(q => q.category === '기술').length;
    const rulesCount = allQuizData.filter(q => q.category === '규정').length;
    const summaryCount = allQuizData.filter(q => q.category === '요약').length;

    document.querySelector('.btn-menu[data-mode="all"]').textContent = `1. 전체 (${total}개)`;
    document.querySelector('.btn-menu[data-mode="기술"]').textContent = `2. 기술 (${techCount}개)`;
    document.querySelector('.btn-menu[data-mode="규정"]').textContent = `3. 규정 (${rulesCount}개)`;
    document.querySelector('.btn-menu[data-mode="요약"]').textContent = `4. 요약 (${summaryCount}개)`;

    // 메뉴 버튼 클릭 이벤트
    document.querySelectorAll('.btn-menu').forEach(button => {
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

/**
 * '직접 선택' 화면의 퀴즈 목록을 동적으로 생성합니다.
 */
function setupSelectionScreen() {
    allQuizData.forEach((quiz, index) => {
        const item = document.createElement('div');
        item.className = 'selection-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `q-${quiz.id}`;
        checkbox.value = quiz.id;
        checkbox.addEventListener('change', updateCustomButton);

        const label = document.createElement('label');
        label.htmlFor = `q-${quiz.id}`;
        label.textContent = quiz.question;

        item.appendChild(checkbox);
        item.appendChild(label);

        // 레이블 클릭 시 체크박스 토글
        label.addEventListener('click', () => {
            checkbox.checked = !checkbox.checked;
            updateCustomButton();
        });

        selectionList.appendChild(item);
    });

    // '선택 완료' 버튼
    btnStartCustom.addEventListener('click', () => {
        const selectedIds = Array.from(selectionList.querySelectorAll('input:checked'))
            .map(input => input.value);

        if (selectedIds.length === 0) {
            alert("하나 이상의 문제를 선택하세요.");
            return;
        }

        // 선택된 ID를 기반으로 퀴즈 세트 생성
        currentQuizSet = allQuizData.filter(quiz => selectedIds.includes(quiz.id));
        startQuiz('custom');
    });

    // '뒤로가기' 버튼
    document.getElementById('btn-back-to-menu-select').addEventListener('click', () => showScreen(startScreen));

    // '직접 선택' 버튼의 카운트 업데이트
    function updateCustomButton() {
        const count = selectionList.querySelectorAll('input:checked').length;
        btnStartCustom.textContent = `선택 완료 (${count}개)`;
    }
}

/**
 * 배열을 셔플합니다 (Fisher-Yates Shuffle).
 * @param {Array} array - 셔플할 배열
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * 선택한 모드로 퀴즈를 시작합니다.
 */
function startQuiz(mode) {
    currentQuestionIndex = 0;

    if (mode === 'all') {
        currentQuizSet = [...allQuizData];
    } else if (mode === '기술' || mode === '규정' || mode === '요약') {
        currentQuizSet = allQuizData.filter(q => q.category === mode);
    }
    // 'custom' 모드는 currentQuizSet이 이미 설정되었으므로 별도 처리 안 함

    // 퀴즈 순서 섞기
    shuffleArray(currentQuizSet);

    displayQuestion();

    showScreen(quizScreen);
}

/**
 * 현재 인덱스의 퀴즈를 화면에 표시합니다.
 */
function displayQuestion() {
    // 카드가 뒤집혀 있다면 원상태로
    quizCard.classList.remove('is-flipped');

    const quiz = currentQuizSet[currentQuestionIndex];

    questionText.textContent = quiz.question;
    answerText.textContent = quiz.answer.length > 0 ? quiz.answer : "(답변 내용이 없습니다)";

    quizCounter.textContent = `${currentQuestionIndex + 1} / ${currentQuizSet.length}`;
}

/**
 * 다음 문제로 넘어갑니다.
 */
function showNextQuestion() {
    // ✅ 답이 보이는 상태에서 바로 다음 문제 앞면만 보이게 하기 위해
    // flip 상태를 먼저 강제로 해제한 뒤 인덱스를 증가시키고 새 문제를 띄운다.
    quizCard.classList.remove('is-flipped');

    currentQuestionIndex++;

    // 마지막 문제에 도달하면 다시 섞어서 처음부터
    if (currentQuestionIndex >= currentQuizSet.length) {
        shuffleArray(currentQuizSet);
        currentQuestionIndex = 0;
    }

    // 다음 문제 표시
    displayQuestion();
}

// --- 3. 화면 전환 및 이벤트 리스너 ---

/**
 * 특정 화면만 활성화(active)하고 나머지는 숨깁니다.
 * @param {HTMLElement} screenToShow
 */
function showScreen(screenToShow) {
    screens.forEach(screen => screen.classList.remove('active'));
    screenToShow.classList.add('active');
}

// 퀴즈 카드 클릭 시 뒤집기
quizCard.addEventListener('click', () => {
    quizCard.classList.toggle('is-flipped');
});

// '다음 문제' 버튼
document.getElementById('btn-next').addEventListener('click', showNextQuestion);

// 퀴즈 화면에서 '메뉴로' 버튼
document.getElementById('btn-back-to-menu-quiz').addEventListener('click', () => {
    showScreen(startScreen);

    // 선택 화면의 체크박스 초기화
    selectionList.querySelectorAll('input:checked').forEach(input => (input.checked = false));
    // 버튼 텍스트 초기화
    btnStartCustom.textContent = '선택 완료 (0개)';
});
