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

// ㅊ 항목의 R값과 속도 매핑
const R_MAP = {
    '400R': 90, '500R': 100, '600R': 110, '700R': 115,
    '800R': 125, '900R': 130, '1000R': 135, '1200R이상': 140
};

/**
 * 7번 문제의 서브 퀴즈를 생성하고 원본 퀴즈 객체를 업데이트합니다.
 */
function create7thSubQuizzes(originalQuiz) {
    const lines = originalQuiz.answer.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const itemMap = {}; // 항목별 데이터 저장 (ㄱ, ㄴ, ... ㅊ)
    const availableKeys = []; // 퀴즈 출제 가능한 키 목록 (ㄱ, ㄴ, ..., ㅌ)

    // 항목을 파싱하여 맵에 저장
    lines.forEach(line => {
        const match = line.match(/^([ㄱ-ㅎ]\.)\s*(.*)/);
        if (match) {
            const key = match[1].replace('.', '');
            const content = match[2].trim();
            itemMap[key] = content;
            if (key !== 'ㅊ') {
                availableKeys.push(key);
            }
        } else if (line.startsWith('ㅊ.')) {
            // ㅊ. 항목은 특별 처리 (R_MAP 사용)
            availableKeys.push('ㅊ');
        }
    });
    
    // 5개의 퀴즈를 생성하기 위한 항목을 랜덤으로 중복 없이 선택
    const selectedKeys = new Set();
    while (selectedKeys.size < 5 && availableKeys.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableKeys.length);
        const randomKey = availableKeys.splice(randomIndex, 1)[0]; // 선택 후 배열에서 제거
        selectedKeys.add(randomKey);
    }

    const subQuizzes = [];
    selectedKeys.forEach(key => {
        let question, answer, subId;
        
        if (key === 'ㅊ') {
            // ㅊ 항목 처리: R값 중 하나 랜덤 선택
            const R_keys = Object.keys(R_MAP);
            const randomRKey = R_keys[Math.floor(Math.random() * R_keys.length)];
            const speed = R_MAP[randomRKey];
            
            question = `곡선 ${randomRKey}의 제한 속도는 얼마인가?`;
            answer = `시속 ${speed}키로 이하입니다.`;
            subId = `${originalQuiz.id}-${key}-${randomRKey.replace('R', '').replace('이상', 'p')}`;

        } else {
            // 일반 항목 처리: 항목 내용 추출
            const content = itemMap[key];
            const contentMatch = content.match(/^(.*) :\s*(시속\s*(\d+)키로 이하입니다\.)/);
            
            if (contentMatch) {
                const condition = contentMatch[1].trim();
                const speedText = contentMatch[2].trim();
                
                question = `${condition}의 제한 속도는 얼마인가?`;
                answer = speedText;
                subId = `${originalQuiz.id}-${key}`;
            } else {
                 // 파싱 실패 대비 임시 처리
                question = `(랜덤 퀴즈) ${content.substring(0, 20)} 제한 속도는?`;
                answer = "확인 필요";
                subId = `${originalQuiz.id}-${key}-err`;
            }
        }

        subQuizzes.push({
            id: subId,
            question: question,
            answer: `예, ${answer}`, // 문제 형식에 맞게 '예,' 추가
            category: '기출',
            isSubQuiz: true // 서브 퀴즈임을 표시
        });
    });

    originalQuiz.subQuizzes = subQuizzes;
}


/**
 * 기출.txt 파일 내용을 파싱하여 퀴즈 객체를 생성합니다.
 * (문제마다 엔터로 구분된 새로운 형식에 맞게 수정)
 */
function parseKichulTxt(text) {
    // 퀴즈 블록을 구분합니다 (두 개 이상의 줄바꿈으로 구분)
    const quizBlocks = text.split(/\n\s*\n/g).map(block => block.trim()).filter(block => block.length > 0);
    const quizzes = [];

    // 문제 번호와 source 태그를 제거하는 정규식
    const questionCleanRegex = /^(?:\\s*)?(\d+[-]?\d*)\.\s*(.*)/;

    for (const block of quizBlocks) {
        const lines = block.split('\n').map(l => l.trim());
        if (lines.length === 0) continue;

        // 1. 질문 추출 및 번호 제거
        let questionLine = lines[0];
        let questionText = questionLine;
        let quizId = `K-temp`;
        let is7thQuestion = false;

        const match = questionLine.match(questionCleanRegex);
        if (match) {
            questionText = match[2].trim(); // 질문 내용만 추출
            quizId = `K-${match[1]}`; // 문제 번호로 ID 사용
            if (match[1] === '7') {
                is7thQuestion = true;
            }
        } else if (questionLine.startsWith('OOO')) {
             // 7번 문제 원본 질문을 위한 예외 처리
            questionText = questionLine;
            quizId = `K-7`;
            is7thQuestion = true;
        }

        // 2. 답변 라인 추출 (첫 줄 제외)
        const answerLines = lines.slice(1);
        
        const currentQuestion = { id: quizId, text: questionText };
        
        // 7번 문제일 경우, 먼저 일반 파싱 후 서브 퀴즈 생성 로직 호출
        const createdQuiz = createQuizObject(currentQuestion, answerLines, '기출');
        
        if (is7thQuestion) {
            create7thSubQuizzes(createdQuiz);
        }

        quizzes.push(createdQuiz);
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
        category: category,
        subQuizzes: null // 서브 퀴즈를 위한 필드 추가
    };
}
