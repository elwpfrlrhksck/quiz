// --- 전역 변수 및 DOM 요소 ---
let allQuizData = []; // 로드된 모든 퀴즈
let currentQuizSet = []; // 현재 풀고 있는 퀴즈 세트
let lastQuizSet_unshuffled = []; // [기능 1] 최근 퀴즈 목록 (섞기 전 원본)
let currentQuestionIndex = 0; // 현재 문제 번호
let activePresetSlot = null; // [기능 2 개선] 현재 선택된 프리셋 슬롯 번호

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

// [기능 2] 프리셋 저장을 위한 키 접두사
const PRESET_KEY_PREFIX = 'quiz_preset_';

// --- 1. 초기화 ---

document.addEventListener('DOMContentLoaded', async () => {
    try {
        allQuizData = await loadQuizzes(); // parser.js의 함수 호출
        setupStartScreen();
        setupSelectionScreen();
    } catch (error) {
        console.error("퀴즈 로딩 실패:", error);
        alert("input.txt 파일을 불러오는 데 실패했습니다.");
    }
});

/**
 * 시작 화면 버튼 설정
 */
function setupStartScreen() {
    const total = allQuizData.length;
    const techCount = allQuizData.filter(q => q.category === '기술').length;
    const rulesCount = allQuizData.filter(q => q.category === '규정').length;

    document.querySelector('.btn-menu[data-mode="all"]').textContent = `1. 전체 (${total}개)`;
    document.querySelector('.btn-menu[data-mode="기술"]').textContent = `2. 기술 (${techCount}개)`;
    document.querySelector('.btn-menu[data-mode="규정"]').textContent = `3. 규정 (${rulesCount}개)`;
    document.querySelector('.btn-menu[data-mode="recent"]').textContent = `5. 최근 문제 바로 시작 (0개)`;

    // 메뉴 버튼 클릭 이벤트
    document.querySelectorAll('.btn-menu').forEach(button => {
        button.addEventListener('click', (e) => {
            const mode = e.target.getAttribute('data-mode');
            if (mode === 'select') {
                showScreen(selectionScreen);
            } else if (mode === 'recent') {
                startRecentQuiz(); // [기능 1]
            } else {
                startQuiz(mode);
            }
        });
    });
}

/**
 * '직접 선택' 화면 설정
 */
function setupSelectionScreen() {
    // 퀴즈 목록 동적 생성
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
        label.addEventListener('click', (e) => {
            e.preventDefault(); 
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
        
        currentQuizSet = allQuizData.filter(quiz => selectedIds.includes(quiz.id));
        startQuiz('custom'); 
    });
    
    // '뒤로가기' 버튼
    document.getElementById('btn-back-to-menu-select').addEventListener('click', () => showScreen(startScreen));

    // [기능 2 개선] 프리셋 UI 로직
    const slotButtons = document.querySelectorAll('.btn-slot');
    slotButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // 다른 버튼의 active 클래스 제거
            slotButtons.forEach(s => s.classList.remove('active'));
            // 현재 버튼에 active 클래스 추가
            btn.classList.add('active');
            // 활성 슬롯 번호 저장
            activePresetSlot = btn.dataset.slot;
        });
    });

    // '불러오기' 버튼
    document.getElementById('btn-preset-load').addEventListener('click', () => {
        if (!activePresetSlot) {
            alert("먼저 불러올 슬롯('문제 1' ~ '문제 4')을 선택하세요.");
            return;
        }
        loadPreset(activePresetSlot);
    });

    // '저장하기' 버튼
    document.getElementById('btn-preset-save').addEventListener('click', () => {
        if (!activePresetSlot) {
            alert("먼저 저장할 슬롯('문제 1' ~ '문제 4')을 선택하세요.");
            return;
        }
        savePreset(activePresetSlot);
    });
}

// '직접 선택' 버튼의 카운트 업데이트
function updateCustomButton() {
    const count = selectionList.querySelectorAll('input:checked').length;
    btnStartCustom.textContent = `선택 완료 (${count}개)`;
}

// --- 2. 퀴즈 진행 ---

/**
 * 배열을 셔플합니다 (Fisher-Yates Shuffle).
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * 선택한 모드로 퀴즈를 시작합니다. (all, 기술, 규정, custom)
 */
function startQuiz(mode) {
    currentQuestionIndex = 0;
    
    if (mode === 'all') {
        currentQuizSet = [...allQuizData];
    } else if (mode === '기술' || mode === '규정') {
        currentQuizSet = allQuizData.filter(q => q.category === mode);
    }
    
    lastQuizSet_unshuffled = [...currentQuizSet];
    document.querySelector('.btn-menu[data-mode="recent"]').textContent = `5. 최근 문제 바로 시작 (${lastQuizSet_unshuffled.length}개)`;

    shuffleArray(currentQuizSet);

    displayQuestion();
    showScreen(quizScreen);
}

/**
 * [기능 1] '최근 문제'를 다시 시작합니다.
 */
function startRecentQuiz() {
    if (lastQuizSet_unshuffled.length === 0) {
        alert("최근에 푼 문제가 없습니다. 먼저 퀴즈를 한 번 풀어주세요.");
        return;
    }
    
    currentQuizSet = [...lastQuizSet_unshuffled];
    currentQuestionIndex = 0;
    
    shuffleArray(currentQuizSet);
    
    displayQuestion();
    showScreen(quizScreen);
}


/**
 * 현재 인덱스의 퀴즈를 화면에 표시합니다.
 */
function displayQuestion() {
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
    currentQuestionIndex++;
    
    if (currentQuestionIndex >= currentQuizSet.length) {
        shuffleArray(currentQuizSet);
        currentQuestionIndex = 0;
    }
    
    displayQuestion();
}

// --- 3. 화면 전환 및 이벤트 리스너 ---

/**
 * 특정 화면만 활성화(active)하고 나머지는 숨깁니다.
 */
function showScreen(screenToShow) {
    screens.forEach(screen => screen.classList.remove('active'));
    screenToShow.classList.add('active');
}

quizCard.addEventListener('click', () => {
    quizCard.classList.toggle('is-flipped');
});

document.getElementById('btn-next').addEventListener('click', showNextQuestion);

document.getElementById('btn-back-to-menu-quiz').addEventListener('click', () => {
    showScreen(startScreen);
    // 선택 화면 상태 초기화
    selectionList.querySelectorAll('input:checked').forEach(input => input.checked = false);
    updateCustomButton();
    document.querySelectorAll('.btn-slot').forEach(s => s.classList.remove('active'));
    activePresetSlot = null;
});

// --- 4. [기능 2] 프리셋 저장/불러오기 (함수 내용은 변경 없음) ---

/**
 * 선택한 프리셋(슬롯)을 불러와 체크박스에 적용합니다.
 */
function loadPreset(slot) {
    const key = PRESET_KEY_PREFIX + slot;
    const data = localStorage.getItem(key);

    if (!data) {
        alert(`저장된 '문제 ${slot}'이(가) 없습니다.`);
        return;
    }

    const presetIds = JSON.parse(data);
    
    // 1. 모든 체크박스 해제
    selectionList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });

    // 2. 불러온 ID에 해당하는 체크박스만 선택
    presetIds.forEach(id => {
        const checkbox = document.getElementById(`q-${id}`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });

    alert(`'문제 ${slot}' (${presetIds.length}개)을(를) 불러왔습니다.`);
    updateCustomButton(); // 선택된 개수 업데이트
}

/**
 * 현재 선택된 퀴즈들을 프리셋(슬롯)에 저장합니다.
 */
function savePreset(slot) {
    const selectedIds = Array.from(selectionList.querySelectorAll('input:checked'))
                             .map(input => input.value);

    if (selectedIds.length === 0) {
        alert("저장할 문제를 하나 이상 선택해주세요.");
        return;
    }

    const key = PRESET_KEY_PREFIX + slot;
    const data = JSON.stringify(selectedIds);
    
    try {
        localStorage.setItem(key, data);
        alert(`'문제 ${slot}'에 현재 선택된 ${selectedIds.length}개의 문제를 저장했습니다.`);
    } catch (e) {
        console.error("localStorage 저장 실패:", e);
        alert("프리셋 저장에 실패했습니다. (브라우저 용량 초과 또는 시크릿 모드일 수 있습니다.)");
    }
}
