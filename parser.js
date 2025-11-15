/**
 * input.txt 파일을 읽어와 퀴즈 데이터 배열로 파싱합니다.
 * @returns {Promise<Array<Object>>} 퀴즈 데이터 배열
 */
async function loadQuizzes() {
    // 1. input.txt 파일 가져오기
    const response = await fetch('input.txt');
    const text = await response.text();
    
    // 2. 줄바꿈으로 나누고, 빈 줄 제거
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    const quizzes = [];
    let currentQuestion = null;
    let currentAnswerLines = [];
    let lastId = null; // "1-2." 처럼 ID만 따로 있는 경우를 대비

    const questionRegex = /^(\d+-\d+)\. (.*)/; // "1-1. 질문 내용" 형식
    const idRegex = /^(\d+-\d+)\.$/;       // "1-2." 형식

    // 3. 한 줄씩 읽으면서 퀴즈 객체 만들기
    for (const line of lines) {
        const qMatch = line.match(questionRegex); // ID와 질문이 같이 있는 줄
        const idMatch = line.match(idRegex);      // ID만 있는 줄

        if (qMatch) { // 예: "1-1. 통전시험이란..."
            // 이전에 처리 중이던 퀴즈가 있다면 저장
            if (currentQuestion) {
                quizzes.push(createQuizObject(currentQuestion, currentAnswerLines));
            }
            // 새 퀴즈 시작
            currentQuestion = { id: qMatch[1], text: line };
            currentAnswerLines = [];
            lastId = null;

        } else if (idMatch) { // 예: "1-2."
            // 이전에 처리 중이던 퀴즈가 있다면 저장
            if (currentQuestion) {
                quizzes.push(createQuizObject(currentQuestion, currentAnswerLines));
            }
            // ID를 임시 저장하고 다음 줄에서 질문 텍스트를 기다림
            lastId = idMatch[1];
            currentQuestion = null;
            currentAnswerLines = [];

        } else if (lastId) { // ID가 임시 저장된 상태에서 텍스트가 들어온 경우
            // 예: "통전시험을 할 때..."
            currentQuestion = { id: lastId, text: `${lastId}. ${line}` };
            lastId = null;

        } else if (currentQuestion) { // 현재 퀴즈의 답변 라인
            currentAnswerLines.push(line);
        }
    }

    // 4. 마지막 퀴즈 저장
    if (currentQuestion) {
        quizzes.push(createQuizObject(currentQuestion, currentAnswerLines));
    }

    console.log(`[Parser] 퀴즈 ${quizzes.length}개 로드 완료.`);
    return quizzes;
}

/**
 * 퀴즈 객체를 생성하고 분류합니다.
 */
function createQuizObject(question, answerLines) {
    return {
        id: question.id,
        question: question.text,
        answer: answerLines.join('\n').trim(), // 답변의 줄바꿈 유지
        category: question.id.startsWith('1-') ? '기술' : '규정'
    };
}
