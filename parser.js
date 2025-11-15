// parser.js

// input.txt + gicul.txt 를 같이 읽어서 퀴즈 배열 반환
// 구조: { id, question, answer, category }
// category: '기술', '규정', '기출'

async function loadQuizzes() {
  // 1. input.txt 읽기
  const inputRes = await fetch('input.txt');
  const inputText = await inputRes.text();

  // 2. gicul.txt 읽기
  const giculRes = await fetch('gicul.txt');
  const giculText = await giculRes.text();

  const inputQuizzes = parseInputTxt(inputText);
  const giculQuizzes = parseGiculTxt(giculText);

  const all = [...inputQuizzes, ...giculQuizzes];

  console.log('퀴즈 로딩 완료:', all.length, '문제 (input + gicul)');
  return all;
}

/** input.txt 파서 (기존 로직을 함수로 재구성) */
function parseInputTxt(text) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l);

  const quizzes = [];
  let currentQuestion = null;
  let currentAnswerLines = [];
  let lastId = null;

  // "1-1. 질문내용" 형태
  const questionRegex = /^(\d+-\d+)\.\s*(.*)$/;
  // "1-1." 형태 (질문이 다음 줄에 있는 경우)
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
      currentQuestion = { id, text: textPart.trim() };
      currentAnswerLines = [];
      lastId = null;
    } else if (idMatch) {
      // 번호만 있는 줄
      if (currentQuestion) {
        quizzes.push(createInputQuizObject(currentQuestion, currentAnswerLines));
      }
      const id = idMatch[1];
      lastId = id;
      currentQuestion = null;
      currentAnswerLines = [];
    } else if (lastId) {
      // 번호만 있는 줄 뒤의 줄이 질문 텍스트인 경우
      currentQuestion = { id: lastId, text: line.trim() };
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

function createInputQuizObject(question, answerLines) {
  const id = question.id;
  const questionText = question.text;
  const answerText = answerLines.join('\n').trim();

  // id 앞자리로 카테고리 추정 (예: 1-xx = 기술, 2-xx = 규정)
  let category = '기술';
  if (id.startsWith('2-')) {
    category = '규정';
  }

  return {
    id,
    question: questionText,
    answer: answerText,
    category,
  };
}

/** gicul.txt 파서
 *  - "22. 단변 취급법(…)" → question: "단변 취급법(…)"
 *  - 그 아래 줄부터 다음 번호 나올 때까지 전부 answer
 *  - 화면에는 번호가 보이지 않게 제목만 사용
 */
function parseGiculTxt(text) {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/\r/g, '').trim());

  const quizzes = [];
  const qRegex = /^(\d+(?:-\d+)?)\.\s*(.*)$/; // "22. 제목", "5-1. 제목" 등

  let currentId = null;
  let currentTitle = null;
  let currentAnswerLines = [];

  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(qRegex);

    if (m) {
      // 새 기출 문제 시작
      if (currentId !== null) {
        quizzes.push({
          id: `G-${currentId}`,
          question: currentTitle || '',
          answer: currentAnswerLines.join('\n').trim(),
          category: '기출',
        });
      }
      currentId = m[1];    // "22"
      currentTitle = m[2]; // "단변 취급법(…)"
      currentAnswerLines = [];
    } else {
      if (currentId !== null) {
        currentAnswerLines.push(line);
      }
    }
  }

  // 마지막 문제
  if (currentId !== null) {
    quizzes.push({
      id: `G-${currentId}`,
      question: currentTitle || '',
      answer: currentAnswerLines.join('\n').trim(),
      category: '기출',
    });
  }

  return quizzes;
}

export { loadQuizzes };
