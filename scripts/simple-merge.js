const fs = require('fs');
const path = require('path');

console.log('🚀 아크노바 데이터 합치기 시작...');

// 파일 경로
const gptPath = path.join(__dirname, '../src/data/game-terms-json/331_ArkNova-gpt.json');
const outputPath = path.join(__dirname, '../src/data/game-terms-json/331_ArkNova.json');

try {
    // GPT 데이터만 일단 사용 (구조가 더 깔끔함)
    const gptData = JSON.parse(fs.readFileSync(gptPath, 'utf8'));
    console.log('✅ GPT 데이터 로드 완료');

    // 메타데이터 업데이트
    const mergedData = {
        metadata: {
            game_id: 331,
            game_name_korean: "아크노바",
            game_name_english: "Ark Nova",
            publisher_korean: "코리아보드게임즈",
            publisher_original: "Feuerland Spiele",
            edition: "Korean First Edition",
            year: 2021,
            bgg_link: "https://boardgamegeek.com/boardgame/342942",
            official_site: "https://capstone-games.com/board-games/ark-nova/",
            rulebook_source: "공식 한국어 룰북",
            research_date: "2025-01-23",
            term_count: 50,
            complexity_level: "Complex",
            sources: "GPT Research (Gemini merge pending)"
        },
        game_specific_terms: gptData.game_specific_terms || {},
        // Gemini 데이터는 나중에 추가
        expansion_ready: true
    };

    // 파일 저장
    fs.writeFileSync(outputPath, JSON.stringify(mergedData, null, 2), 'utf8');

    console.log('✅ 아크노바 데이터 생성 완료!');
    console.log(`📁 파일: ${outputPath}`);
    console.log('📊 현재: GPT 데이터만 포함 (Gemini는 별도 처리 예정)');

} catch (error) {
    console.error('❌ 오류:', error.message);
} 