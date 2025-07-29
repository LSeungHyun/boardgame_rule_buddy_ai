/**
 * Golden Dataset 시드 데이터 생성 스크립트
 * ARK NOVA 룰북 기반 고품질 질문-답변 쌍을 생성합니다.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 환경 변수 검증
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ 환경 변수 ${envVar}가 설정되지 않았습니다.`);
    process.exit(1);
  }
}

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Golden Dataset 샘플 데이터
const GOLDEN_DATASET = [
  {
    game_id: 'ARK_NOVA',
    question: 'ARK NOVA 게임의 목표는 무엇인가요?',
    ideal_answer: 'ARK NOVA의 목표는 동물원을 운영하여 가장 많은 점수를 얻는 것입니다. 점수는 어필 포인트(Appeal Points)와 보존 포인트(Conservation Points)를 통해 획득할 수 있으며, 게임 종료 시 두 점수 중 낮은 점수가 최종 점수가 됩니다.',
    ideal_context: [
      'ARK NOVA는 동물원 테마의 전략 보드게임입니다.',
      '플레이어는 동물원을 건설하고 운영하여 점수를 획득합니다.',
      '어필 포인트와 보존 포인트 두 가지 점수 트랙이 있습니다.',
      '게임 종료 시 두 점수 중 낮은 점수가 최종 점수가 됩니다.'
    ],
    category: 'game_objective',
    difficulty_level: 'easy',
    tags: ['목표', '점수', '어필포인트', '보존포인트']
  },
  {
    game_id: 'ARK_NOVA',
    question: '액션 카드는 어떻게 사용하나요?',
    ideal_answer: '액션 카드는 플레이어의 턴에 하나씩 선택하여 사용합니다. 각 액션 카드는 고유한 효과를 가지고 있으며, 사용 후에는 카드의 강도가 감소합니다. 카드를 사용한 후에는 해당 카드를 맨 오른쪽으로 이동시키고, 나머지 카드들을 왼쪽으로 한 칸씩 이동시킵니다.',
    ideal_context: [
      '각 플레이어는 5장의 액션 카드를 가지고 시작합니다.',
      '턴마다 하나의 액션 카드를 선택하여 실행합니다.',
      '액션 카드의 위치에 따라 강도가 결정됩니다.',
      '사용된 카드는 맨 오른쪽으로 이동하고 강도가 0이 됩니다.'
    ],
    category: 'game_mechanics',
    difficulty_level: 'easy',
    tags: ['액션카드', '턴', '강도', '카드이동']
  },
  {
    game_id: 'ARK_NOVA',
    question: '동물 카드를 배치할 때 주의해야 할 점은 무엇인가요?',
    ideal_answer: '동물 카드를 배치할 때는 다음 사항들을 주의해야 합니다: 1) 동물의 크기에 맞는 인클로저가 필요합니다. 2) 동물의 서식지 요구사항을 만족해야 합니다. 3) 일부 동물은 특별한 배치 조건이 있을 수 있습니다. 4) 인클로저의 크기와 동물의 크기가 정확히 일치해야 합니다.',
    ideal_context: [
      '동물 카드에는 크기와 서식지 정보가 표시되어 있습니다.',
      '인클로저는 동물의 크기에 맞게 건설되어야 합니다.',
      '서식지 요구사항을 만족하지 않으면 동물을 배치할 수 없습니다.',
      '일부 동물은 특별한 배치 규칙이 적용됩니다.'
    ],
    category: 'animal_placement',
    difficulty_level: 'medium',
    tags: ['동물카드', '인클로저', '서식지', '배치규칙']
  },
  {
    game_id: 'ARK_NOVA',
    question: '스폰서 카드의 효과는 언제 적용되나요?',
    ideal_answer: '스폰서 카드의 효과는 카드를 획득하는 즉시 적용됩니다. 대부분의 스폰서 카드는 즉시 효과를 제공하며, 일부는 게임 종료까지 지속되는 영구 효과를 가집니다. 스폰서 카드는 보존 프로젝트를 완료하거나 특정 조건을 만족할 때 획득할 수 있습니다.',
    ideal_context: [
      '스폰서 카드는 즉시 효과와 영구 효과로 구분됩니다.',
      '카드 획득 시 즉시 효과가 적용됩니다.',
      '영구 효과는 게임 종료까지 지속됩니다.',
      '보존 프로젝트 완료 시 스폰서 카드를 획득할 수 있습니다.'
    ],
    category: 'sponsor_cards',
    difficulty_level: 'medium',
    tags: ['스폰서카드', '즉시효과', '영구효과', '보존프로젝트']
  },
  {
    game_id: 'ARK_NOVA',
    question: '브레이크 토큰은 어떤 역할을 하나요?',
    ideal_answer: '브레이크 토큰은 게임의 종료 조건과 관련된 중요한 요소입니다. 플레이어가 특정 조건을 만족하면 브레이크 토큰을 획득하고, 이는 게임 종료를 앞당길 수 있습니다. 브레이크 토큰을 가진 플레이어는 추가 점수를 얻을 수도 있습니다.',
    ideal_context: [
      '브레이크 토큰은 게임 종료 조건과 연관됩니다.',
      '특정 조건 달성 시 브레이크 토큰을 획득합니다.',
      '브레이크 토큰은 게임 종료를 촉진할 수 있습니다.',
      '브레이크 토큰 보유자는 추가 혜택을 받을 수 있습니다.'
    ],
    category: 'game_mechanics',
    difficulty_level: 'hard',
    tags: ['브레이크토큰', '게임종료', '종료조건', '추가점수']
  },
  {
    game_id: 'ARK_NOVA',
    question: '보존 프로젝트는 어떻게 완료하나요?',
    ideal_answer: '보존 프로젝트를 완료하려면 카드에 명시된 요구사항을 모두 만족해야 합니다. 일반적으로 특정 대륙의 동물들이나 특정 아이콘을 가진 동물들을 동물원에 배치해야 합니다. 프로젝트 완료 시 보존 포인트와 스폰서 카드를 획득할 수 있습니다.',
    ideal_context: [
      '보존 프로젝트 카드에는 완료 조건이 명시되어 있습니다.',
      '대부분 특정 동물들의 배치가 요구됩니다.',
      '프로젝트 완료 시 보존 포인트를 획득합니다.',
      '완료된 프로젝트는 스폰서 카드도 제공합니다.'
    ],
    category: 'conservation_projects',
    difficulty_level: 'medium',
    tags: ['보존프로젝트', '완료조건', '보존포인트', '스폰서카드']
  },
  {
    game_id: 'ARK_NOVA',
    question: 'X-토큰은 무엇이고 어떻게 사용하나요?',
    ideal_answer: 'X-토큰은 다양한 용도로 사용할 수 있는 범용 자원입니다. 동물 구매, 인클로저 건설, 액션 강화 등에 사용할 수 있습니다. X-토큰은 특정 액션이나 카드 효과를 통해 획득할 수 있으며, 게임 중 전략적으로 활용해야 하는 중요한 자원입니다.',
    ideal_context: [
      'X-토큰은 게임의 범용 자원입니다.',
      '동물 구매, 건설, 액션 강화 등에 사용됩니다.',
      '특정 액션이나 카드 효과로 획득할 수 있습니다.',
      '전략적 자원 관리가 중요합니다.'
    ],
    category: 'resources',
    difficulty_level: 'easy',
    tags: ['X토큰', '자원', '동물구매', '인클로저건설']
  },
  {
    game_id: 'ARK_NOVA',
    question: '게임은 언제 종료되나요?',
    ideal_answer: '게임은 다음 조건 중 하나가 만족되면 종료됩니다: 1) 한 플레이어의 어필 포인트와 보존 포인트 마커가 만나거나 지나칠 때, 2) 동물 카드 더미가 떨어질 때, 3) 보존 프로젝트 카드 더미가 떨어질 때. 게임 종료 조건이 만족되면 현재 라운드를 완료한 후 게임이 끝납니다.',
    ideal_context: [
      '게임 종료 조건은 세 가지가 있습니다.',
      '어필 포인트와 보존 포인트 마커가 만나면 종료됩니다.',
      '동물 카드나 보존 프로젝트 카드가 떨어져도 종료됩니다.',
      '종료 조건 만족 시 현재 라운드를 완료합니다.'
    ],
    category: 'game_end',
    difficulty_level: 'easy',
    tags: ['게임종료', '종료조건', '어필포인트', '보존포인트']
  },
  {
    game_id: 'ARK_NOVA',
    question: '최종 점수는 어떻게 계산하나요?',
    ideal_answer: '최종 점수는 어필 포인트와 보존 포인트 중 낮은 점수로 결정됩니다. 예를 들어, 어필 포인트가 15점이고 보존 포인트가 12점이라면 최종 점수는 12점입니다. 따라서 두 점수를 균형 있게 발전시키는 것이 중요합니다.',
    ideal_context: [
      '최종 점수는 두 점수 중 낮은 점수입니다.',
      '어필 포인트와 보존 포인트를 모두 고려해야 합니다.',
      '균형 잡힌 점수 발전이 승리의 열쇠입니다.',
      '한쪽 점수만 높아서는 승리할 수 없습니다.'
    ],
    category: 'scoring',
    difficulty_level: 'easy',
    tags: ['최종점수', '어필포인트', '보존포인트', '균형']
  },
  {
    game_id: 'ARK_NOVA',
    question: '솔로 게임은 어떻게 진행하나요?',
    ideal_answer: '솔로 게임에서는 AI 상대와 경쟁합니다. AI는 자동화된 규칙에 따라 행동하며, 플레이어는 AI보다 높은 점수를 얻어야 승리합니다. 솔로 게임에는 여러 난이도 레벨이 있어 도전의 정도를 조절할 수 있습니다.',
    ideal_context: [
      '솔로 게임에서는 AI 상대와 경쟁합니다.',
      'AI는 정해진 규칙에 따라 자동으로 행동합니다.',
      '플레이어는 AI보다 높은 점수를 얻어야 합니다.',
      '여러 난이도 레벨을 선택할 수 있습니다.'
    ],
    category: 'solo_game',
    difficulty_level: 'medium',
    tags: ['솔로게임', 'AI상대', '난이도', '자동화규칙']
  }
];

/**
 * Golden Dataset을 Supabase에 삽입
 */
async function seedGoldenDataset() {
  console.log('🌱 Golden Dataset 시드 데이터 생성 시작\n');
  
  try {
    // 1. 기존 데이터 확인
    const { data: existingData, error: checkError } = await supabase
      .from('golden_dataset')
      .select('id')
      .eq('game_id', 'ARK_NOVA');
    
    if (checkError) {
      console.error('❌ 기존 데이터 확인 실패:', checkError.message);
      throw checkError;
    }
    
    if (existingData && existingData.length > 0) {
      console.log(`⚠️ 이미 ${existingData.length}개의 ARK NOVA 데이터가 존재합니다.`);
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question('기존 데이터를 삭제하고 새로 생성하시겠습니까? (y/N): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('❌ 작업이 취소되었습니다.');
        return;
      }
      
      // 기존 데이터 삭제
      const { error: deleteError } = await supabase
        .from('golden_dataset')
        .delete()
        .eq('game_id', 'ARK_NOVA');
      
      if (deleteError) {
        console.error('❌ 기존 데이터 삭제 실패:', deleteError.message);
        throw deleteError;
      }
      
      console.log('🗑️ 기존 데이터 삭제 완료');
    }
    
    // 2. 새 데이터 삽입
    console.log(`📝 ${GOLDEN_DATASET.length}개의 새로운 테스트 케이스 삽입 중...`);
    
    const { data, error } = await supabase
      .from('golden_dataset')
      .insert(GOLDEN_DATASET)
      .select();
    
    if (error) {
      console.error('❌ 데이터 삽입 실패:', error.message);
      throw error;
    }
    
    console.log(`✅ ${data.length}개의 테스트 케이스가 성공적으로 추가되었습니다.`);
    
    // 3. 삽입된 데이터 통계 출력
    const categoryStats = {};
    const difficultyStats = {};
    
    for (const item of data) {
      categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
      difficultyStats[item.difficulty_level] = (difficultyStats[item.difficulty_level] || 0) + 1;
    }
    
    console.log('\n📊 삽입된 데이터 통계:');
    console.log('카테고리별:');
    Object.entries(categoryStats).forEach(([category, count]) => {
      console.log(`  - ${category}: ${count}개`);
    });
    
    console.log('난이도별:');
    Object.entries(difficultyStats).forEach(([difficulty, count]) => {
      console.log(`  - ${difficulty}: ${count}개`);
    });
    
    console.log('\n🎉 Golden Dataset 시드 데이터 생성 완료!');
    console.log('\n💡 다음 단계:');
    console.log('1. npm run process-rulebook 실행하여 문서 임베딩 생성');
    console.log('2. npm run evaluate-rag 실행하여 평가 테스트');
    console.log('3. GitHub Actions 워크플로우 확인');
    
  } catch (error) {
    console.error('❌ Golden Dataset 생성 중 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * 추가 테스트 케이스 생성 도우미 함수
 */
function generateAdditionalTestCase(question, idealAnswer, idealContext, category, difficulty, tags) {
  return {
    game_id: 'ARK_NOVA',
    question,
    ideal_answer: idealAnswer,
    ideal_context: Array.isArray(idealContext) ? idealContext : [idealContext],
    category,
    difficulty_level: difficulty,
    tags: Array.isArray(tags) ? tags : [tags]
  };
}

/**
 * 메인 실행 함수
 */
async function main() {
  await seedGoldenDataset();
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = {
  seedGoldenDataset,
  generateAdditionalTestCase,
  GOLDEN_DATASET
};