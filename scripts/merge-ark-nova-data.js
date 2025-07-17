const fs = require('fs');
const path = require('path');

// 파일 경로 설정
const geminiPath = path.join(__dirname, '../src/data/game-terms-json/331_ArkNova-gemini.json');
const gptPath = path.join(__dirname, '../src/data/game-terms-json/331_ArkNova-gpt.json');
const outputPath = path.join(__dirname, '../src/data/game-terms-json/331_ArkNova.json');

try {
    // GPT 파일 읽기
    const gptData = JSON.parse(fs.readFileSync(gptPath, 'utf8'));
    console.log('📖 GPT 데이터 읽기 완료');

    // Gemini 파일은 JSON 구조가 깨져있으므로 텍스트로 읽어서 수동 파싱
    const geminiText = fs.readFileSync(geminiPath, 'utf8');
    console.log('📖 Gemini 데이터 읽기 완료');

    // Gemini 데이터에서 용어 추출
    const geminiTerms = [];

    // JSON 오브젝트 패턴 매칭 (더 정확한 정규식)
    const objectPattern = /{\s*"term_ko":\s*"([^"]+)",\s*"term_en":\s*"([^"]+)",\s*"category":\s*"([^"]+)",\s*"definition_ko":\s*"([^"]+)",\s*"definition_en":\s*"([^"]+)",\s*"contextual_notes":\s*"([^"]+)"\s*}/g;

    let match;
    while ((match = objectPattern.exec(geminiText)) !== null) {
        const [, termKo, termEn, category, definitionKo, definitionEn, contextualNotes] = match;

        geminiTerms.push({
            korean: termKo,
            english: termEn,
            category: category || 'general',
            description: definitionKo || '',
            description_en: definitionEn || '',
            notes: contextualNotes || '',
            source: 'gemini'
        });
    }

    console.log(`🔍 Gemini에서 ${geminiTerms.length}개 용어 추출`);

    // GPT 데이터에서 용어 추출
    const gptTerms = [];

    function extractTermsFromObject(obj, categoryName = 'general') {
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null) {
                if (value.english) {
                    // 실제 용어 객체
                    gptTerms.push({
                        korean: key,
                        english: value.english,
                        category: categoryName,
                        description: value.description || '',
                        description_en: value.description_en || '',
                        notes: value.example || value.usage || value.notes || '',
                        source: 'gpt'
                    });
                } else {
                    // 중첩된 카테고리 처리
                    extractTermsFromObject(value, key);
                }
            }
        }
    }

    if (gptData.game_specific_terms) {
        extractTermsFromObject(gptData.game_specific_terms);
    }

    console.log(`🔍 GPT에서 ${gptTerms.length}개 용어 추출`);

    // 중복 제거 (한국어 기준)
    const allTermsMap = new Map();

    // GPT 용어를 먼저 추가 (더 체계적인 구조)
    gptTerms.forEach(term => {
        allTermsMap.set(term.korean, term);
    });

    // Gemini 용어 추가 (중복되지 않은 것만)
    let addedFromGemini = 0;
    let mergedFromGemini = 0;

    geminiTerms.forEach(term => {
        if (!allTermsMap.has(term.korean)) {
            allTermsMap.set(term.korean, term);
            addedFromGemini++;
        } else {
            // 중복된 용어의 경우 notes 병합
            const existing = allTermsMap.get(term.korean);
            if (term.notes && term.notes !== existing.notes) {
                existing.notes = existing.notes + (existing.notes ? ' | ' : '') + term.notes;
            }
            existing.source = 'both';
            mergedFromGemini++;
        }
    });

    const mergedTerms = Array.from(allTermsMap.values());

    // 카테고리별 분류
    const categorizedTerms = {};
    mergedTerms.forEach(term => {
        const category = term.category || 'general';
        if (!categorizedTerms[category]) {
            categorizedTerms[category] = {};
        }

        categorizedTerms[category][term.korean] = {
            english: term.english,
            description: term.description,
            description_en: term.description_en,
            notes: term.notes,
            source: term.source
        };
    });

    // 최종 데이터 구조 생성
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
            research_date: new Date().toISOString().split('T')[0],
            term_count: mergedTerms.length,
            complexity_level: "Complex",
            sources: "Gemini + GPT Research Combined"
        },
        game_specific_terms: categorizedTerms,
        summary: {
            total_terms: mergedTerms.length,
            gemini_original: geminiTerms.length,
            gpt_original: gptTerms.length,
            gemini_only: addedFromGemini,
            gpt_only: gptTerms.filter(t => !geminiTerms.some(g => g.korean === t.korean)).length,
            overlapping: mergedFromGemini,
            categories: Object.keys(categorizedTerms).sort()
        }
    };

    // 파일 저장
    fs.writeFileSync(outputPath, JSON.stringify(mergedData, null, 2), 'utf8');

    console.log('\n✅ 아크노바 데이터 합치기 완료!');
    console.log(`📁 저장 위치: ${outputPath}`);
    console.log(`📊 최종 용어 수: ${mergedData.summary.total_terms}개`);
    console.log(`📊 카테고리: ${mergedData.summary.categories.join(', ')}`);
    console.log(`📊 Gemini 원본: ${mergedData.summary.gemini_original}개`);
    console.log(`📊 GPT 원본: ${mergedData.summary.gpt_original}개`);
    console.log(`📊 Gemini 고유: ${mergedData.summary.gemini_only}개`);
    console.log(`📊 GPT 고유: ${mergedData.summary.gpt_only}개`);
    console.log(`📊 중복 병합: ${mergedData.summary.overlapping}개`);

} catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
} 