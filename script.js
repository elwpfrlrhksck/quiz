// --- 전역 변수 및 DOM 요소 ---
let allQuizData = []; // 로드된 모든 퀴즈
let groupedQuizzes = {}; // 카테고리별로 그룹화된 퀴즈
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

const selectionCategoryList = document.getElementById('selection-category-list');
const btnStartCustom = document.getElementById('btn-start-custom');

// --- 1. 초기화 ---

// 페이지 로드가 완료되면 퀴즈 데이터를 불러옵니다.
document.addEventListener('DOMContentLoaded', async () => {
    try {
        allQuizData = await loadQuizzes(); // parser.js의 함수 호출
        
        // 카테고리별로 퀴즈 그룹화
        groupedQuizzes = allQuizData.reduce((acc, quiz) => {
            acc[quiz.category] = acc[quiz.category] || [];
            acc[quiz.category].push(quiz);
            return acc;
        }, {});
        
        setupStartScreen();
        setupSelectionScreen();
    } catch (error) {
        console.error("퀴즈 로딩 실패:", error);
        alert("퀴즈 파일을 불러오는 데 실패했습니다. 파일이 같은 폴더에 있는지, 로컬 서버가 실행 중인지 확인하세요.");
    }
});

/**
 * 시작 화면의 버튼들에 퀴즈 개수를 표시하고 이벤트 리스너를 설정합니다.
 */
function setupStartScreen() {
    const total = allQuizData.length;
    const techCount = (groupedQuizzes['기술'] || []).length;
    const rulesCount = (groupedQuizzes['규정'] || []).length;
    const kichulCount = (groupedQuizzes['기출'] || []).length;

    document.querySelector('.btn-menu[data-mode="all"]').textContent = `1. 전체 (${total}개)`;
    document.querySelector('.btn-menu[data-mode="기술"]').textContent = `2. 기술 (${techCount}개)`;
    document.querySelector('.btn-menu[data-mode="규정"]').textContent = `3. 규정 (${rulesCount}개)`;
    document.querySelector('.btn-menu[data-mode="기출"]').textContent = `4. 기출 (${kichulCount}개)`;
    document.querySelector('.btn-menu[data-mode="select"]').textContent = `5. 직접 선택`;

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
 * '직접 선택' 화면의 퀴즈 목록을 동적으로 생성하고 아코디언 로직을 설정합니다.
 */
function setupSelectionScreen() {
    selectionCategoryList.innerHTML = ''; // 기존 목록 초기화
    
    // 카테고리별로 아코디언 그룹 생성
    Object.keys(groupedQuizzes).forEach(category => {
        const categoryQuizzes = groupedQuizzes[category];
        
        const group = document.createElement('div');
        group.className = 'category-group';
        
        // 1. 카테고리 헤더
        const header = document.createElement('div');
        header.className = 'category-header';
        header.innerHTML = `<span>${category}</span> <span class="count">(${categoryQuizzes.length}개)</span>`;
        group.appendChild(header);
        
        // 2. 문제 목록 컨테이너 (접히는 부분)
        const content = document.createElement('div');
        content.className = 'selection-content';
        
        const list = document.createElement('div');
        list.className = 'selection-list';
        
        // 문제 항목 생성
        categoryQuizzes.forEach((quiz) => {
            // ★★★★★ 수정된 부분: K-7 퀴즈도 목록에 포함시킵니다. ★★★★★
            
            const item = document.createElement('div');
            item.className = 'selection-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `q-${quiz.id}`;
            checkbox.value = quiz.id;
            checkbox.dataset.category = category; // 카테고리 정보 저장
            checkbox.addEventListener('change', updateCustomButton);
            
            const label = document.createElement('label');
            label.htmlFor = `q-${quiz.id}`;
            
            // 질문 텍스트 정리 (input.txt의 경우 ID. 표시)
            let questionDisplay = quiz.question;
            if (quiz.category !== '기출') {
                const idRegex = new RegExp(`^${quiz.id}\\. `);
                questionDisplay = quiz.question.replace(idRegex, '');
                questionDisplay = `${quiz.id}. ${questionDisplay}`;
            }
            
            // ★★★★★ 수정된 부분: 7번 문제인 경우 (5문제) 표시 ★★★★★
            if (quiz.id === 'K-7') {
                questionDisplay = `${questionDisplay} (5문제)`;
            }

            label.textContent = questionDisplay;
            
            item.appendChild(checkbox);
            item.appendChild(label);
            list.appendChild(item);
        });

        content.appendChild(list);
        group.appendChild(content);
        selectionCategoryList.appendChild(group);
        
        // 아코디언 토글 기능
        header.addEventListener('click', () => {
            const isClosing = content.classList.contains('active');
            
            // 모든 아코디언 닫기
            document.querySelectorAll('.selection-content').forEach(c => {
                c.classList.remove('active');
                c.style.maxHeight = 0;
            });
            
            // 클릭된 아코디언 열기/닫기
            if (!isClosing) {
                content.classList.add('active');
                // 목록 높이를 계산하여 부드러운 애니메이션 적용
                content.style.maxHeight = list.scrollHeight + 40 + "px"; // padding 고려
            }
        });
    });


    // '선택 완료' 버튼
    btnStartCustom.addEventListener('click', () => {
        const selectedIds = Array.from(selectionCategoryList.querySelectorAll('input:checked'))
                                 .map(input => input.value);
        
        // ★★★★★ 수정된 부분: 7번 퀴즈만 선택되어도 문제가 출제되도록 별도 처리 불필요 ★★★★★
        
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
    
    // 초기 버튼 카운트 업데이트
    updateCustomButton();
}

// '직접 선택' 버튼의 카운트 업데이트
function updateCustomButton() {
    const count = selectionCategoryList.querySelectorAll('input:checked').length;
    btnStartCustom.textContent = `선택 완료 (${count}개)`;
}


// --- 2. 퀴즈 진행 ---

/**
 * 배열을 셔플합니다 (Fisher-Yates Shuffle).
 * @param {Array<any>} array - 셔플할 배열
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
    } else if (mode === '기술' || mode === '규정' || mode === '기출') {
        currentQuizSet = groupedQuizzes[mode] ? [...groupedQuizzes[mode]] : [];
    }
    // 'custom' 모드는 currentQuizSet이 이미 설정되었으므로 별도 처리 안 함
    
    if (currentQuizSet.length === 0) {
        alert("선택된 퀴즈가 없습니다.");
        showScreen(startScreen);
        return;
    }

    // 퀴즈 순서 섞기
    shuffleArray(currentQuizSet);
    
    // K-7 퀴즈를 서브 퀴즈 5개로 대체
    let tempQuizSet = [];
    currentQuizSet.forEach((quiz) => {
        if (quiz.id === 'K-7' && quiz.subQuizzes) {
            // K-7 원본 퀴즈를 서브 퀴즈 5개로 대체
            tempQuizSet = tempQuizSet.concat(quiz.subQuizzes);
        } else {
            tempQuizSet.push(quiz);
        }
    });

    currentQuizSet = tempQuizSet;
    
    // 서브 퀴즈로 대체된 후 다시 섞어줍니다. (선택적)
    shuffleArray(currentQuizSet);
    
    displayQuestion();
    showScreen(quizScreen);
}

/**
 * 현재 인덱스의 퀴즈를 화면에 표시합니다.
 */
function displayQuestion() {
    // 다음 문제로 넘어가기 전 카드 플립 상태를 강제 초기화 (애니메이션 문제 해결)
    
    // 1. 애니메이션 끄기
    quizCard.style.transition = 'none'; 
    quizCard.classList.remove('is-flipped');
    
    // 2. 내용 업데이트
    const quiz = currentQuizSet[currentQuestionIndex];
    
    questionText.textContent = quiz.question;
    answerText.textContent = quiz.answer.length > 0 ? quiz.answer : "(답변 내용이 없습니다)";
    quizCounter.textContent = `${currentQuestionIndex + 1} / ${currentQuizSet.length}`;
    
    // 3. 애니메이션 속성 복원 (다음 뒤집기 동작을 위해)
    setTimeout(() => {
        quizCard.style.transition = 'transform 0.6s';
    }, 50); 
}

/**
 * 다음 문제로 넘어갑니다.
 */
function showNextQuestion() {
    currentQuestionIndex++;
    
    // 마지막 문제에 도달하면
    if (currentQuestionIndex >= currentQuizSet.length) {
        
        // 1. 퀴즈를 다시 섞음
        shuffleArray(currentQuizSet);
        
        // 2. 인덱스를 0으로 리셋
        currentQuestionIndex = 0;
    }
    
    // 다음 문제 (또는 섞인 후의 첫 문제) 표시
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
    selectionCategoryList.querySelectorAll('input:checked').forEach(input => input.checked = false);
    updateCustomButton();
    
    // 아코디언 메뉴 모두 닫기
    document.querySelectorAll('.selection-content').forEach(c => {
        c.classList.remove('active');
        c.style.maxHeight = 0;
    });
});
