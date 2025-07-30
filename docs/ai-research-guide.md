Rule Buddy를 위한 실제 웹 리서치 기능 구현 매뉴얼
1. 개요 (Overview)
본 문서는 'Rule Buddy' 애플리케이션에 실시간 웹 리서치 기능을 통합하기 위한 기술적인 구현 가이드를 제공합니다. 이 기능의 목표는 AI가 복잡하거나 최신 정보가 필요한 규칙 질문을 받았을 때, 외부 웹사이트의 정보를 실시간으로 검색 및 분석하여 답변의 정확도를 획기적으로 향상시키는 것입니다.
2. 핵심 아키텍처 (Core Architecture)
안전하고 효율적인 웹 리서치 기능 구현을 위해, 프론트엔드와 백엔드를 분리하는 구조를 사용합니다.
프론트엔드 (Frontend):
역할: 사용자 인터페이스(UI) 제공, 사용자 입력 처리, 백엔드에 검색 요청 전송, 최종 결과 표시.
기술: 현재와 동일한 HTML, React, Tailwind CSS.
백엔드 (Backend):
역할: 프론트엔드의 요청을 받아 실제 웹 검색 API 호출, 검색 결과의 웹페이지 스크래핑, 정보 추출 및 가공, 정제된 데이터를 프론트엔드에 전달.
기술: Node.js 와 Express 프레임워크를 사용한 경량 서버.
3. 구현 단계 (Implementation Steps)
1단계: 백엔드 서버 구축 (Node.js & Express)
백엔드 서버는 검색 API 키와 같은 민감한 정보를 안전하게 관리하고, 웹 스크래핑 시 발생할 수 있는 CORS(Cross-Origin Resource Sharing) 정책 문제를 해결하는 핵심적인 역할을 합니다.
A. 프로젝트 설정
mkdir rule-master-backend
cd rule-master-backend
npm init -y
npm install express axios cheerio dotenv cors


express: 서버 구축을 위한 프레임워크
axios: 외부 API(Google Search) 호출
cheerio: 웹페이지 HTML을 분석하고 데이터 추출 (스크래핑)
dotenv: API 키를 환경 변수로 안전하게 관리
cors: 프론트엔드와 백엔드 간의 요청 허용
B. API 엔드포인트 생성 (server.js)
프로젝트 루트에 server.js 파일을 생성하고 아래 코드를 작성합니다.
// server.js

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 설정: 프론트엔드 주소에서의 요청을 허용합니다.
// 개발 환경에서는 'http://localhost:3000' 와 같은 주소를 사용합니다.
app.use(cors()); 
app.use(express.json());

// /api/search 엔드포인트
app.post('/api/search', async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: '검색어가 필요합니다.' });
    }

    try {
        // 1. Google Custom Search API 호출하여 관련 URL 목록 가져오기
        const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
        const apiKey = process.env.GOOGLE_API_KEY;
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`;
        
        const searchResponse = await axios.get(searchUrl);
        const items = searchResponse.data.items;

        if (!items || items.length === 0) {
            return res.json({ researchData: "관련 정보를 찾을 수 없습니다." });
        }

        // 2. 신뢰도 높은 사이트(boardgamegeek.com 등) 우선으로 URL 1~2개 선택
        const targetUrl = items[0].link; 

        // 3. 선택된 URL의 웹페이지 스크래핑
        const pageResponse = await axios.get(targetUrl);
        const $ = cheerio.load(pageResponse.data);
        
        // body 태그의 텍스트를 추출 (필요에 따라 더 정교한 선택자 사용 가능)
        const pageText = $('body').text();

        // 4. 추출된 텍스트 정제 (공백, 줄바꿈 제거 등)
        const cleanedText = pageText.replace(/\s\s+/g, ' ').trim().slice(0, 2000); // 2000자로 제한

        // 5. 정제된 데이터를 프론트엔드에 반환
        res.json({ 
            researchData: `출처: ${targetUrl}\n\n${cleanedText}`
        });

    } catch (error) {
        console.error('리서치 중 오류 발생:', error);
        res.status(500).json({ error: '내부 서버 오류' });
    }
});

app.listen(PORT, () => {
    console.log(`서버가 ${PORT}번 포트에서 실행 중입니다.`);
});


C. API 키 설정 (.env 파일)
프로젝트 루트에 .env 파일을 생성하고 Google API 키와 검색 엔진 ID를 추가합니다. 이 파일은 절대로 외부에 노출되어서는 안 됩니다.
# .env
GOOGLE_API_KEY="여기에_실제_Google_API_키를_입력하세요"
GOOGLE_SEARCH_ENGINE_ID="여기에_실제_검색_엔진_ID를_입력하세요"


참고: Google Custom Search Engine에서 특정 사이트(예: boardgamegeek.com)만 검색하도록 설정하여 검색의 정확도를 높일 수 있습니다.
2단계: 프론트엔드 수정 (HTML/React)
기존의 시뮬레이션 함수 performWebResearch를 실제 백엔드 API를 호출하도록 수정합니다.
// Rule Buddy HTML 파일 내 <script type="text/babel"> 부분

// 웹 리서치 함수 (수정됨)
const performWebResearch = async (query) => {
    try {
        // 로컬에서 실행 중인 백엔드 서버의 API 엔드포인트를 호출합니다.
        const response = await fetch('http://localhost:3001/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: query }),
        });

        if (!response.ok) {
            // API 호출 실패 시 null을 반환하여 리서치 없이 진행
            console.error('웹 리서치 API 호출에 실패했습니다.');
            return null;
        }

        const data = await response.json();
        return data.researchData; // 백엔드에서 가공된 텍스트 반환

    } catch (error) {
        console.error('웹 리서치 중 네트워크 오류 발생:', error);
        return null;
    }
};

// handleSend 함수는 수정할 필요 없이 그대로 사용합니다.
// ... 기존 handleSend 함수 로직 ...


4. 실행 및 테스트
백엔드 서버 실행:
node server.js


프론트엔드 실행:
기존 방식대로 HTML 파일을 브라우저에서 엽니다.
테스트:
'아크노바' 게임을 선택하고, "아크노바 코뿔소 카드 능력 알려줘"와 같이 복잡한 질문을 입력합니다.
프론트엔드에서 "심층 검색 중..." 메시지가 표시되고, 백엔드 콘솔에는 API 호출 및 스크래핑 로그가 나타납니다.
잠시 후, 실제 웹 검색 결과를 바탕으로 생성된 정확한 답변이 채팅창에 표시됩니다.
이 매뉴얼을 통해 개발자는 Rule Buddy에 강력한 실시간 웹 리서치 기능을 성공적으로 구현할 수 있을 것입니다.
