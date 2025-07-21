/**
 * 게임 셋업 가이드 서비스
 */

import { GameSetupGuide, SetupStep, SetupProgress, GameVariant } from '@/types/game-setup';

class GameSetupService {
  private static instance: GameSetupService;
  private setupGuides: Map<number, GameSetupGuide> = new Map();

  private constructor() {
    this.initializeDefaultGuides();
  }

  public static getInstance(): GameSetupService {
    if (!GameSetupService.instance) {
      GameSetupService.instance = new GameSetupService();
    }
    return GameSetupService.instance;
  }

  /**
   * 기본 게임 가이드 초기화
   */
  private initializeDefaultGuides(): void {
    // 아크 노바 셋업 가이드
    const arkNovaGuide: GameSetupGuide = {
      gameId: 331,
      gameTitle: '아크 노바',
      playerCounts: [1, 2, 3, 4],
      difficulty: 'intermediate',
      estimatedTime: 15,
      setupSteps: [
        {
          id: 'ark-nova-board',
          title: '게임 보드 준비',
          description: '메인 보드를 테이블 중앙에 놓고, 각 플레이어에게 개인 보드를 나누어 줍니다.',
          order: 1,
          category: 'board',
          isRequired: true,
          components: [
            { name: '메인 보드', quantity: 1, description: '중앙 보드' },
            { name: '개인 보드', quantity: '플레이어 수만큼', description: '각 플레이어의 동물원 보드' }
          ],
          estimatedTime: 2,
          commonMistakes: ['개인 보드의 앞뒤를 확인하지 않음', '메인 보드 위치가 모든 플레이어에게 접근하기 어려움']
        },
        {
          id: 'ark-nova-cards',
          title: '카드 준비',
          description: '동물 카드와 프로젝트 카드를 각각 섞어서 덱을 만듭니다.',
          order: 2,
          category: 'cards',
          isRequired: true,
          dependencies: ['ark-nova-board'],
          components: [
            { name: '동물 카드', quantity: 255, description: '동물원에 배치할 동물들' },
            { name: '프로젝트 카드', quantity: 129, description: '보존 프로젝트와 후원자 카드' }
          ],
          estimatedTime: 3,
          commonMistakes: ['카드를 충분히 섞지 않음', '카드 종류를 구분하지 않음']
        },
        {
          id: 'ark-nova-tokens',
          title: '토큰 및 마커 배치',
          description: '각종 토큰과 마커를 메인 보드의 해당 위치에 배치합니다.',
          order: 3,
          category: 'tokens',
          isRequired: true,
          dependencies: ['ark-nova-board'],
          components: [
            { name: '보존 마커', quantity: 1, description: '보존 트랙용' },
            { name: '어필 마커', quantity: 1, description: '어필 트랙용' },
            { name: '돈 토큰', quantity: '다수', description: '게임 내 화폐' }
          ],
          estimatedTime: 4
        },
        {
          id: 'ark-nova-player-setup',
          title: '플레이어 초기 설정',
          description: '각 플레이어의 초기 자원과 카드를 배분합니다.',
          order: 4,
          category: 'preparation',
          isRequired: true,
          dependencies: ['ark-nova-cards', 'ark-nova-tokens'],
          playerCountSpecific: {
            1: { description: '솔로 플레이 특별 규칙 적용' },
            2: { description: '2인 플레이 시 일부 카드 제거' },
            3: { description: '표준 3인 플레이' },
            4: { description: '표준 4인 플레이' }
          },
          estimatedTime: 5
        },
        {
          id: 'ark-nova-final-check',
          title: '최종 확인',
          description: '모든 구성 요소가 올바르게 배치되었는지 확인합니다.',
          order: 5,
          category: 'final',
          isRequired: true,
          dependencies: ['ark-nova-player-setup'],
          estimatedTime: 1
        }
      ],
      variants: [
        {
          id: 'ark-nova-beginner',
          name: '초보자 변형',
          description: '처음 플레이하는 사람들을 위한 간소화된 규칙',
          difficulty: 'easier',
          playerCounts: [2, 3, 4],
          modifications: [
            {
              stepId: 'ark-nova-cards',
              type: 'modify',
              description: '복잡한 카드들을 제거하고 기본 카드만 사용'
            }
          ]
        }
      ],
      tips: [
        '첫 게임에서는 초보자 변형을 사용하는 것을 권장합니다.',
        '카드를 미리 분류해두면 게임 진행이 더 원활합니다.',
        '각 플레이어가 자신의 개인 보드를 잘 볼 수 있도록 배치하세요.'
      ]
    };

    this.setupGuides.set(331, arkNovaGuide);
  }

  /**
   * 게임 ID로 셋업 가이드 조회
   */
  public getSetupGuide(gameId: number): GameSetupGuide | null {
    return this.setupGuides.get(gameId) || null;
  }

  /**
   * 플레이어 수에 맞는 셋업 단계 조회
   */
  public getSetupStepsForPlayerCount(gameId: number, playerCount: number): SetupStep[] {
    const guide = this.getSetupGuide(gameId);
    if (!guide) return [];

    return guide.setupSteps
      .filter(step => step.isRequired || !step.playerCountSpecific || step.playerCountSpecific[playerCount])
      .sort((a, b) => a.order - b.order);
  }

  /**
   * 셋업 진행률 계산
   */
  public calculateProgress(progress: SetupProgress, totalSteps: SetupStep[]): number {
    if (totalSteps.length === 0) return 0;
    return (progress.completedSteps.size / totalSteps.length) * 100;
  }

  /**
   * 다음 단계 결정
   */
  public getNextStep(progress: SetupProgress, allSteps: SetupStep[]): SetupStep | null {
    const availableSteps = allSteps.filter(step => {
      // 이미 완료된 단계는 제외
      if (progress.completedSteps.has(step.id)) return false;

      // 의존성 확인
      if (step.dependencies) {
        return step.dependencies.every(depId => progress.completedSteps.has(depId));
      }

      return true;
    });

    // 순서가 가장 빠른 단계 반환
    return availableSteps.sort((a, b) => a.order - b.order)[0] || null;
  }

  /**
   * 단계 완료 처리
   */
  public completeStep(progress: SetupProgress, stepId: string): SetupProgress {
    const newCompletedSteps = new Set(progress.completedSteps);
    newCompletedSteps.add(stepId);

    return {
      ...progress,
      completedSteps: newCompletedSteps,
      currentStep: undefined // 다음 단계는 getNextStep으로 결정
    };
  }

  /**
   * 단계 완료 취소
   */
  public uncompleteStep(progress: SetupProgress, stepId: string): SetupProgress {
    const newCompletedSteps = new Set(progress.completedSteps);
    newCompletedSteps.delete(stepId);

    return {
      ...progress,
      completedSteps: newCompletedSteps
    };
  }

  /**
   * 예상 완료 시간 계산
   */
  public estimateCompletionTime(progress: SetupProgress, allSteps: SetupStep[]): Date {
    const remainingSteps = allSteps.filter(step => !progress.completedSteps.has(step.id));
    const remainingTime = remainingSteps.reduce((total, step) => total + (step.estimatedTime || 2), 0);
    
    const now = new Date();
    return new Date(now.getTime() + remainingTime * 60 * 1000);
  }

  /**
   * 게임별 변형 규칙 조회
   */
  public getVariants(gameId: number): GameVariant[] {
    const guide = this.getSetupGuide(gameId);
    return guide?.variants || [];
  }

  /**
   * 변형 규칙 적용
   */
  public applyVariant(steps: SetupStep[], variant: GameVariant): SetupStep[] {
    let modifiedSteps = [...steps];

    variant.modifications.forEach(mod => {
      const stepIndex = modifiedSteps.findIndex(step => step.id === mod.stepId);
      if (stepIndex === -1) return;

      switch (mod.type) {
        case 'modify':
          modifiedSteps[stepIndex] = {
            ...modifiedSteps[stepIndex],
            description: `${modifiedSteps[stepIndex].description}\n\n**${variant.name}**: ${mod.description}`,
            components: mod.newComponents ? 
              [...(modifiedSteps[stepIndex].components || []), ...mod.newComponents] :
              modifiedSteps[stepIndex].components
          };
          break;
        case 'remove':
          modifiedSteps = modifiedSteps.filter(step => step.id !== mod.stepId);
          break;
        case 'add':
          // 새로운 단계 추가 로직 (필요시 구현)
          break;
      }
    });

    return modifiedSteps;
  }

  /**
   * 셋업 가이드 검색
   */
  public searchSetupGuides(query: string): GameSetupGuide[] {
    const results: GameSetupGuide[] = [];
    const lowerQuery = query.toLowerCase();

    this.setupGuides.forEach(guide => {
      if (guide.gameTitle.toLowerCase().includes(lowerQuery)) {
        results.push(guide);
      }
    });

    return results;
  }
}

export const gameSetupService = GameSetupService.getInstance();