/**
 * AI 답변을 구조화된 형태로 파싱하는 유틸리티
 */

export interface ParsedAnswer {
  summary: string;
  details: AnswerSection[];
  examples: string[];
  ruleType: 'basic' | 'exception' | 'tip';
  importance: 'high' | 'medium' | 'low';
}

export interface AnswerSection {
  title: string;
  content: string;
  type: 'basic' | 'exception' | 'tip';
}

/**
 * AI 답변을 파싱하여 구조화된 형태로 변환
 */
export function parseAnswer(rawAnswer: string): ParsedAnswer {
  // 기본 구조 초기화
  const parsed: ParsedAnswer = {
    summary: '',
    details: [],
    examples: [],
    ruleType: 'basic',
    importance: 'medium'
  };

  // 답변을 줄 단위로 분할
  const lines = rawAnswer.split('\n').map(line => line.trim()).filter(line => line);
  
  if (lines.length === 0) {
    return parsed;
  }

  // 첫 번째 문단을 요약으로 사용
  const firstParagraphEnd = lines.findIndex((line, index) => 
    index > 0 && (line.startsWith('##') || line.startsWith('**') || line === '')
  );
  
  const summaryLines = firstParagraphEnd === -1 ? lines.slice(0, 2) : lines.slice(0, firstParagraphEnd);
  parsed.summary = summaryLines.join(' ').replace(/\*\*/g, '');

  // 섹션 파싱
  let currentSection: AnswerSection | null = null;
  let inExampleSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 예시 섹션 감지 (더 포괄적으로)
    if (line.includes('📝예시') || line.includes('예시') || line.includes('예제') || 
        line.includes('Example') || line.includes('📝 예시') || 
        line.match(/^예시[:\s]*/) || line.match(/^📝\s*예시/)) {
      inExampleSection = true;
      // 예시 섹션이 시작되면 이전 섹션을 종료
      if (currentSection) {
        parsed.details.push(currentSection);
        currentSection = null;
      }
      continue;
    }

    // 새로운 섹션이 시작되면 예시 섹션 종료
    if (line.startsWith('##') || line.startsWith('**') || line.startsWith('📋')) {
      inExampleSection = false;
      
      // 이전 섹션 저장
      if (currentSection) {
        parsed.details.push(currentSection);
      }

      // 새 섹션 시작
      const title = line.replace(/^##\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '').replace(/^📋\s*/, '');
      const sectionType = detectSectionType(title, line);
      
      currentSection = {
        title,
        content: '',
        type: sectionType
      };
      continue;
    }

    // 예시 수집 (더 포괄적으로)
    if (inExampleSection) {
      // 빈 줄이나 구분선은 건너뛰기
      if (line === '' || line === '--' || line === '---') {
        continue;
      }
      
      // 예시 항목 감지
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || 
          line.match(/^\d+\./) || line.length > 5) { // 최소 길이 체크로 의미있는 내용만
        let exampleText = line.replace(/^[•\-\*\d\.]\s*/, '').trim();
        if (exampleText && exampleText !== '--') {
          parsed.examples.push(exampleText);
        }
      }
      continue;
    }

    // 섹션 내용 추가
    if (currentSection) {
      if (currentSection.content) {
        currentSection.content += ' ';
      }
      currentSection.content += line;
    }
  }

  // 마지막 섹션 저장
  if (currentSection) {
    parsed.details.push(currentSection);
  }

  // 예시가 비어있거나 의미없는 내용만 있다면 기본 예시 추가
  if (parsed.examples.length === 0 || parsed.examples.every(ex => ex === '' || ex === '--')) {
    // 답변 내용에서 구체적인 예시를 찾아서 추가
    const exampleCandidates = extractExamplesFromContent(rawAnswer);
    parsed.examples = exampleCandidates;
  }

  // 규칙 타입 및 중요도 결정
  parsed.ruleType = determineRuleType(rawAnswer);
  parsed.importance = determineImportance(rawAnswer);

  return parsed;
}

/**
 * 답변 내용에서 구체적인 예시를 추출
 */
function extractExamplesFromContent(content: string): string[] {
  const examples: string[] = [];
  
  // 게임 셋업 관련 구체적인 예시 패턴 찾기
  const patterns = [
    /첫 번째 시험관[:\s]*[^\.]+\./g,
    /두 번째 시험관[:\s]*[^\.]+\./g,
    /세 번째 시험관[:\s]*[^\.]+\./g,
    /예를 들어[:\s]*[^\.]+\./g,
    /구체적으로[:\s]*[^\.]+\./g,
    /\d+인 게임에서[:\s]*[^\.]+\./g,
  ];

  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.trim().replace(/^[:\s]*/, '');
        if (cleaned.length > 10) { // 의미있는 길이의 예시만
          examples.push(cleaned);
        }
      });
    }
  });

  // 하드코딩된 예시 제거 - AI가 생성한 예시만 사용

  return examples.slice(0, 3); // 최대 3개까지만
}

/**
 * 섹션 타입 감지
 */
function detectSectionType(title: string, content: string): 'basic' | 'exception' | 'tip' {
  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();

  // 예외 규칙 키워드
  if (lowerTitle.includes('예외') || lowerTitle.includes('특수') || 
      lowerTitle.includes('exception') || lowerContent.includes('하지만') ||
      lowerContent.includes('단,') || lowerContent.includes('except')) {
    return 'exception';
  }

  // 팁 키워드
  if (lowerTitle.includes('팁') || lowerTitle.includes('주의') || 
      lowerTitle.includes('tip') || lowerTitle.includes('참고') ||
      lowerContent.includes('💡') || lowerContent.includes('⚠️')) {
    return 'tip';
  }

  return 'basic';
}

/**
 * 전체 답변의 규칙 타입 결정
 */
function determineRuleType(answer: string): 'basic' | 'exception' | 'tip' {
  const lower = answer.toLowerCase();
  
  // 예외 규칙 비중 계산
  const exceptionKeywords = ['예외', '특수', '하지만', '단,', 'exception', 'however'];
  const exceptionCount = exceptionKeywords.reduce((count, keyword) => 
    count + (lower.match(new RegExp(keyword, 'g')) || []).length, 0
  );

  // 팁 키워드 비중 계산
  const tipKeywords = ['팁', '주의', '참고', 'tip', '💡', '⚠️'];
  const tipCount = tipKeywords.reduce((count, keyword) => 
    count + (lower.match(new RegExp(keyword, 'g')) || []).length, 0
  );

  if (exceptionCount > tipCount && exceptionCount > 0) {
    return 'exception';
  } else if (tipCount > 0) {
    return 'tip';
  }

  return 'basic';
}

/**
 * 답변의 중요도 결정
 */
function determineImportance(answer: string): 'high' | 'medium' | 'low' {
  const lower = answer.toLowerCase();
  
  // 높은 중요도 키워드
  const highImportanceKeywords = [
    '중요', '필수', '반드시', '주의', '경고', 
    'important', 'critical', 'must', 'warning', '⚠️', '🚨'
  ];
  
  const highCount = highImportanceKeywords.reduce((count, keyword) => 
    count + (lower.match(new RegExp(keyword, 'g')) || []).length, 0
  );

  // 답변 길이도 중요도에 영향
  const wordCount = answer.split(/\s+/).length;

  if (highCount > 2 || (highCount > 0 && wordCount > 200)) {
    return 'high';
  } else if (wordCount > 100 || highCount > 0) {
    return 'medium';
  }

  return 'low';
}

/**
 * 마크다운 텍스트를 HTML로 간단 변환
 */
export function simpleMarkdownToHtml(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}