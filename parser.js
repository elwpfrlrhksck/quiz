// parser.js

// input.txt와 gicul.txt를 읽어서 통합 퀴즈 배열을 반환
// 구조: { id, question, answer, category }
// category: '2' = 기술, '3' = 규정, 'gicul-tech' / 'gicul-rule' 등은 필요시 확장 가능

async function loadQuizzes() {
  // 1. input.txt 읽기
  const inputResponse = await fetch('input.txt');
  const inputText = await inputResponse.text();

  // 2. gicul.txt 읽기
  const giculResponse = await fetch('gicul.txt');
  const giculText = await giculResponse.text();

  const inputQuizzes = parseInputTxt(inputText);
  const giculQuizzes = parseGiculTxt(giculText);

  // 통합 배열
  const all = [...inputQuizzes, ...giculQuizzes];

  console.log('Parser:', all.length, 'quizzes loaded (input + gicul)');
  return all;
}

/**
 * input.txt 파서 (기존 로직을 함수화)
 * - "1-1. ..." 형태의 라인에서 질문 시작
 * - 그 이후 빈 줄 전까지를 answer로 모은다
 * - category는 id 시작 번호로 구분
 */
function parseInputTxt(text) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l);

  const quizzes = [];
  let currentQuestion = null;
  let currentAnswerLines = [];
  let lastId = null;

  // "1-1. ..." 같이 번호와 점으로 시작하는 라인
  const questionRegex = /^(\d+-\d+)\.\s*(.*)$/;
  // "1-1." 처럼 번호만 있는 라인 (필요시)
  const idRegex = /^(\d+-\d+)\.$/;

  for (const line of lines) {
    const qMatch = line.match(questionRegex);
    const idMatch = line.match(idRegex);

    if (qMatch) {
      // 새로운 문제 시작
      if (currentQuestion) {
        quizzes.push(createInputQuizObject(currentQuestion, currentAnswerLines));
      }
      const id = qMatch[1];
      const textPart = qMatch[2] || '';
      currentQuestion = {
        id,
        text: textPart.trim(),
      };
      currentAnswerLines = [];
      lastId = null;
    } else if (idMatch) {
      // 번호만 있는 줄 처리용 (필요 시)
      if (currentQuestion) {
        quizzes.push(createInputQuizObject(currentQuestion, currentAnswerLines));
      }
      const id = idMatch[1];
      lastId = id;
      currentQuestion = null;
      currentAnswerLines = [];
    } else if (lastId) {
      // 바로 뒤에 오는 줄이 질문 텍스트가 될 수 있음
      currentQuestion = {
        id: lastId,
        text: line.trim(),
      };
      lastId = null;
      currentAnswerLines = [];
    } else if (currentQuestion) {
      currentAnswerLines.push(line);
    }
  }

  if (currentQuestion) {
    quizzes.push(createInputQuizObject(currentQuestion, currentAnswerLines));
  }

  return quizzes;
}

// input.txt용 객체 생성
function createInputQuizObject(question, answerLines) {
  const id = question.id;
  const questionText = question.text;
  const answerText = answerLines.join('\n').trim();

  // category 판별: 1-xx = 기술, 2-xx = 규정 이라고 가정
  let category = '2'; // 기본: 기술
  if (id.startsWith('2-')) {
    category = '3'; // 규정
  }

  return {
    id,
    question: questionText,
    answer: answerText,
    category, // '2' or '3'
  };
}

/**
 * gicul.txt 파서
 * - "숫자. 제목" 으로 시작하면 새로운 문제
 * - 그 다음 "숫자. " 로 시작하는 다음 문제 직전까지를 answer로 모음
 * - 보여질 question에는 앞의 "숫자. " 제거된 제목만 사용
 * - answer는 그 아래 내용 전체
 */
function parseGiculTxt(text) {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/\r/g, '').trim());

  const quizzes = [];

  // 예: "22. 단변 취급법(단변으로 제동 체결시 체결과정)"
  const giculQuestionRegex = /^(\d+(?:-\d+)?)\.\s*(.*)$/;

  let currentId = null;
  let currentTitle = null;
  let currentAnswerLines = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    const qMatch = line.match(giculQuestionRegex);

    if (qMatch) {
      // 새로운 기출 문제 시작
      if (currentId !== null) {
        quizzes.push({
          id: `G-${currentId}`,
          question: currentTitle || '',
          answer: currentAnswerLines.join('\n').trim(),
          category: 'gicul', // 새 기출 카테고리
        });
      }

      currentId = qMatch[1]; // "22" 또는 "5-1" 같은 번호
      currentTitle = qMatch[2] || ''; // "단변 취급법..." 등
      currentAnswerLines = [];
    } else {
      // 현재 문제의 답변 내용으로 축적
      if (currentId !== null) {
        currentAnswerLines.push(line);
      }
    }
  }

  // 마지막 문제 push
  if (currentId !== null) {
    quizzes.push({
      id: `G-${currentId}`,
      question: currentTitle || '',
      answer: currentAnswerLines.join('\n').trim(),
      category: 'gicul',
    });
  }

  return quizzes;
}

export { loadQuizzes };
