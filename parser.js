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
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const quizzes = [];
    let currentQuestion = null;
    let currentAnswerLines = [];
    let tempIdCounter = 1; // 기출 문제용 임시 ID 카운터

    // "숫자. 질문 내용" 또는 "숫자-숫자. 질문 내용" 또는 "질문 내용"으로 시작하는 패턴
    // 문제 앞에 붙은 숫자와 구분자(.)를 제거하는 것이 핵심
    const questionRegex = /^(?:(\d+[.-]?\d*)\. )?(.*)/; 
    
    for (const line of lines) {
        // '예,'로 시작하거나 괄호 안에 있는 설명 줄은 무시
        if (line.startsWith('예,') || line.startsWith('(') || line.startsWith('----') || line.startsWith('이상입니다!')) {
            // 답변 라인의 일부일 수 있으므로 답변 라인에 추가는 하되,
            // 새 문제를 시작하는 조건으로는 사용하지 않음.
            if (currentQuestion && !line.startsWith('이상입니다!')) {
                currentAnswerLines.push(line);
            }
            continue;
        }

        const match = line.match(questionRegex);
        if (!match) continue; 
        
        // 문제로 간주할만한 라인인지 확인
        // 대문자 A-Z로 시작하거나, '숫자.' 패턴 다음에 오는 라인, 또는 문제 같아 보이는 라인
        const isNewQuestion = match[1] || line.length > 10; 

        if (isNewQuestion) {
            // 이전에 처리 중이던 퀴즈가 있다면 저장
            if (currentQuestion) {
                quizzes.push(createQuizObject(currentQuestion, currentAnswerLines, '기출'));
            }

            // 문제 텍스트 추출 시, 앞에 붙은 '숫자.' 패턴을 제거
            let questionText = line;
            if (match[1]) {
                // 숫자. 또는 숫자-숫자. 패턴을 제거
                questionText = match[2].trim();
            } else {
                 // 숫자가 없는 경우 그대로 사용 (예: "총괄제어시 피제어차의 기기취급법과 운전보안장치 취급법")
            }
            
            // 새 퀴즈 시작
            currentQuestion = { id: `K-${tempIdCounter++}`, text: questionText };
            currentAnswerLines = [];
        } else if (currentQuestion) { 
            // 답변 라인
            currentAnswerLines.push(line);
        }
    }

    // 마지막 퀴즈 저장
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
    if (source === '기출') {
        category = '기출';
    } else {
        // input.txt의 기존 분류 로직 유지
        category = question.id.startsWith('1-') ? '기술' : '규정';
    }

    // 답변 정리: '예,'나 '이상입니다!' 줄 제거 및 불필요한 공백 제거
    const cleanedAnswer = answerLines
        .filter(line => !line.startsWith('예,') && !line.startsWith('이상입니다!') && !line.startsWith('('))
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n'); // 답변의 줄바꿈 유지

    return {
        id: question.id,
        // input.txt에서 온 경우 id까지 포함된 text를, 기출.txt에서 온 경우 정리된 text만 사용
        question: source === 'input' ? question.text : question.text, 
        answer: cleanedAnswer, 
        category: category
    };
}
