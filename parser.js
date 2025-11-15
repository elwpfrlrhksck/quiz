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
 * (문제마다 엔터로 구분된 새로운 형식에 맞게 수정)
 */
function parseKichulTxt(text) {
    // 퀴즈 블록을 구분합니다 (두 개 이상의 줄바꿈으로 구분)
    const quizBlocks = text.split(/\n\s*\n/g).map(block => block.trim()).filter(block => block.length > 0);
    const quizzes = [];
    let tempIdCounter = 1; 

    // 문제 번호와 source 태그를 제거하는 정규식
    const questionCleanRegex = /^(?:\\s*)?(\d+[-]?\d*)\.\s*(.*)/;

    for (const block of quizBlocks) {
        const lines = block.split('\n').map(l => l.trim());
        if (lines.length === 0) continue;

        // 1. 질문 추출 및 번호 제거
        let questionLine = lines[0];
        let questionText = questionLine;
        let quizId = `K-${tempIdCounter++}`;

        const match = questionLine.match(questionCleanRegex);
        if (match) {
            questionText = match[2].trim(); // 질문 내용만 추출
            quizId = `K-${match[1]}`; // 문제 번호로 ID 사용
        }

        // 2. 답변 라인 추출 (첫 줄 제외)
        const answerLines = lines.slice(1);
        
        const currentQuestion = { id: quizId, text: questionText };
        
        quizzes.push(createQuizObject(currentQuestion, answerLines, '기출'));
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
    } else {
        // input.txt의 기존 분류 로직 유지
        category = question.id.startsWith('1-') ? '기술' : '규정';
        // input.txt의 경우 질문 앞에 ID. 를 붙인 원본 텍스트를 사용
    }

    // 답변 정리: '예,', '이상입니다!' 등의 불필요한 라인과 괄호 안의 주석 제거 및 포맷팅
    const cleanedAnswer = answerLines
        .filter(line => line.length > 0)
        .filter(line => !line.startsWith('예,') && !line.startsWith('이상입니다!') && !line.startsWith('(') && !line.startsWith('----'))
        .map(line => line.trim())
        .join('\n'); // 답변의 줄바꿈 유지

    return {
        id: question.id,
        question: processedQuestion,
        answer: cleanedAnswer, 
        category: category
    };
}
