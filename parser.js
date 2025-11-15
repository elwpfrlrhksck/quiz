/**
 * input.txt 파일을 읽어와 퀴즈 데이터 배열로 파싱합니다.
 * @returns {Promise<Array<Object>>} 퀴즈 데이터 배열
 */
async function loadQuizzes() {
    let allQuizzes = [];

    // 1. input.txt 파일 로드 및 파싱 (기술/규정)
    try {
        const response = await fetch('input.txt');
        const text = await response.text();
        const inputQuizzes = parseInputTxt(text);
        allQuizzes = allQuizzes.concat(inputQuizzes);
    } catch (error) {
        console.error("input.txt 로딩 실패:", error);
    }

    // 2. 기출.txt 파일 로드 및 파싱 (기출)
    try {
        const response = await fetch('기출.txt');
        const text = await response.text();
        const kichulQuizzes = parseKichulTxt(text);
        allQuizzes = allQuizzes.concat(kichulQuizzes);
    } catch (error) {
        // 기출.txt가 없을 수도 있으므로 경고만 하고 넘어가도 됨
        console.warn("기출.txt 로딩 실패:", error);
    }

    console.log(`[Parser] 총 ${allQuizzes.length}개 퀴즈 로드 완료.`);
    return allQuizzes;
}

/**
 * input.txt 파일 내용을 파싱하여 퀴즈 객체를 생성합니다. (기존 로직)
 */
function parseInputTxt(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const quizzes = [];
    let currentQuestion = null;
    let currentAnswerLines = [];
    let lastId = null; 

    const questionRegex = /^(\d+-\d+)\. (.*)/; // "1-1. 질문 내용" 형식
    const idRegex = /^(\d+-\d+)\.$/;       // "1-2." 형식

    for (const line of lines) {
        const qMatch = line.match(questionRegex); 
        const idMatch = line.match(idRegex);      

        if (qMatch) { 
            if (currentQuestion) {
                quizzes.push(createQuizObject(currentQuestion, currentAnswerLines, 'input'));
            }
            currentQuestion = { id: qMatch[1], text: line };
            currentAnswerLines = [];
            lastId = null;

        } else if (idMatch) { 
            if (currentQuestion) {
                quizzes.push(createQuizObject(currentQuestion, currentAnswerLines, 'input'));
            }
            lastId = idMatch[1];
            currentQuestion = null;
            currentAnswerLines = [];

        } else if (lastId) { 
            currentQuestion = { id: lastId, text: `${lastId}. ${line}` };
            lastId = null;

        } else if (currentQuestion) { 
            currentAnswerLines.push(line);
        }
    }

    if (currentQuestion) {
        quizzes.push(createQuizObject(currentQuestion, currentAnswerLines, 'input'));
    }

    return quizzes;
}

/**
 * 기출.txt 파일 내용을 파싱하여 퀴즈 객체를 생성합니다.
 */
function parseKichulTxt(text) {
    const lines = text.split('\n').map(l => l.trim()); // 빈 줄 포함
    const quizzes = [];
    let currentQuestion = null;
    let currentAnswerLines = [];
    let tempIdCounter = 1; 

    // 새로운 문제 시작 패턴: 숫자. 질문 내용
    const newQuestionRegex = /^\\s*(\d+[-]?\d*)\.\s*(.*)/;
    
    // 복잡한 답변 줄 구분을 위한 패턴들
    const answerStartRegex = /^예,/;
    const answerEndRegex = /이상입니다!/;
    
    let isParsingAnswer = false;

    for (const line of lines) {
        if (!line) continue; // 빈 줄은 무시

        const qMatch = line.match(newQuestionRegex);

        if (qMatch) {
            // 이전에 처리 중이던 퀴즈가 있다면 저장
            if (currentQuestion) {
                quizzes.push(createQuizObject(currentQuestion, currentAnswerLines, '기출'));
            }

            // 새 퀴즈 시작
            const quizNumber = qMatch[1]; // 예: 1, 5-1
            let questionText = qMatch[2].trim(); // 질문 내용
            
            // 질문 내용에 괄호로 묶인 부가 설명 제거 (옵션)
            // 예: "공기제동시험을 시행하는 경우는 언제인가? (제동관+주공기관 파열 조치 후 발차 시)" -> "공기제동시험을 시행하는 경우는 언제인가?"
            questionText = questionText.replace(/\s*\([^)]+\)$/, '').trim();

            currentQuestion = { id: `K-${quizNumber}`, text: questionText };
            currentAnswerLines = [];
            isParsingAnswer = false; // 답변 파싱 상태 초기화

        } else if (answerStartRegex.test(line)) {
            // 답변 시작: '예,'
            isParsingAnswer = true;
            
        } else if (answerEndRegex.test(line)) {
            // 답변 종료: '이상입니다!'
            if (currentQuestion) {
                // 현재 처리 중인 퀴즈에 마지막 답변 줄을 추가 (이상입니다! 자체는 제외)
                quizzes.push(createQuizObject(currentQuestion, currentAnswerLines, '기출'));
                currentQuestion = null;
                currentAnswerLines = [];
            }
            isParsingAnswer = false;

        } else if (currentQuestion && isParsingAnswer) {
            // 현재 문제의 답변을 모으는 중
            // 불필요한 주석/메모 제거
            if (!line.startsWith('(') && !line.startsWith('----')) {
                 currentAnswerLines.push(line);
            }
        }
    }

    // 마지막 퀴즈 저장 (이상입니다! 로 끝나지 않은 경우)
    if (currentQuestion) {
        quizzes.push(createQuizObject(currentQuestion, currentAnswerLines, '기출'));
    }

    return quizzes;
}

/**
 * 퀴즈 객체를 생성하고 분류합니다.
 */
function createQuizObject(question, answerLines, source) {
    let category = '';
    let processedQuestion = question.text;

    if (source === '기출') {
        category = '기출';
        // 기출 문제의 경우, 질문 텍스트에서 나 문제 번호를 제거 (이미 parseKichulTxt에서 처리됨)
        // 여기서는 최종적으로 정리된 질문을 사용
    } else {
        // input.txt의 기존 분류 로직 유지
        category = question.id.startsWith('1-') ? '기술' : '규정';
    }

    // 답변 정리: 불필요한 라인 제거 및 포맷팅
    const cleanedAnswer = answerLines
        .filter(line => line.length > 0)
        .map(line => line.trim())
        .join('\n'); // 답변의 줄바꿈 유지

    return {
        id: question.id,
        question: processedQuestion,
        answer: cleanedAnswer, 
        category: category
    };
}
