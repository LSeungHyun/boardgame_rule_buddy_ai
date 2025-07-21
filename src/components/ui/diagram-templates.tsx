'use client';

import { DiagramElement } from './visual-diagram';
import { BoardLayoutStep } from './interactive-board-layout';

// 게임별 다이어그램 템플릿 정의
export const GAME_DIAGRAM_TEMPLATES = {
  'ark-nova': {
    name: 'Ark Nova',
    steps: [
      {
        id: 'setup-1',
        title: '개인 보드 배치',
        description: '각 플레이어는 개인 보드와 시작 카드들을 받습니다.',
        instructions: [
          '개인 보드를 앞에 놓으세요',
          '시작 동물원 카드 8장을 받으세요',
          '액션 카드 5장을 받아 개인 보드에 배치하세요'
        ],
        tips: [
          '액션 카드는 나중에 업그레이드할 수 있습니다',
          '개인 보드의 트랙을 잘 확인해두세요'
        ],
        elements: [
          {
            id: 'player-board',
            type: 'board',
            position: { x: 50, y: 50 },
            size: { width: 120, height: 80 },
            label: '개인 보드',
            description: '플레이어의 메인 보드',
            step: 1
          },
          {
            id: 'zoo-cards',
            type: 'card',
            position: { x: 200, y: 50 },
            size: { width: 60, height: 40 },
            label: '동물원 카드',
            description: '시작 동물원 카드 8장',
            step: 1
          },
          {
            id: 'action-cards',
            type: 'card',
            position: { x: 200, y: 110 },
            size: { width: 60, height: 40 },
            label: '액션 카드',
            description: '액션 카드 5장',
            step: 1
          }
        ]
      },
      {
        id: 'setup-2',
        title: '중앙 보드 설정',
        description: '게임 보드를 중앙에 놓고 공용 카드들을 배치합니다.',
        instructions: [
          '게임 보드를 테이블 중앙에 놓으세요',
          '동물 카드를 섞어 보드 옆에 놓으세요',
          '프로젝트 카드를 섞어 보드 옆에 놓으세요',
          '후원자 카드를 섞어 보드 옆에 놓으세요'
        ],
        tips: [
          '카드 더미들을 구분하기 쉽게 배치하세요',
          '점수 트랙을 잘 보이는 곳에 놓으세요'
        ],
        elements: [
          {
            id: 'main-board',
            type: 'board',
            position: { x: 100, y: 80 },
            size: { width: 200, height: 140 },
            label: '메인 보드',
            description: '중앙 게임 보드',
            step: 2,
            isHighlighted: true
          },
          {
            id: 'animal-deck',
            type: 'card',
            position: { x: 320, y: 80 },
            size: { width: 50, height: 35 },
            label: '동물 카드',
            description: '동물 카드 덱',
            step: 2
          },
          {
            id: 'project-deck',
            type: 'card',
            position: { x: 320, y: 125 },
            size: { width: 50, height: 35 },
            label: '프로젝트',
            description: '프로젝트 카드 덱',
            step: 2
          },
          {
            id: 'sponsor-deck',
            type: 'card',
            position: { x: 320, y: 170 },
            size: { width: 50, height: 35 },
            label: '후원자',
            description: '후원자 카드 덱',
            step: 2
          }
        ]
      },
      {
        id: 'setup-3',
        title: '토큰 및 마커 배치',
        description: '게임에 필요한 토큰들과 마커들을 배치합니다.',
        instructions: [
          '돈 토큰을 보드 옆에 놓으세요',
          '각 플레이어의 마커를 트랙에 놓으세요',
          'X 토큰들을 준비하세요'
        ],
        elements: [
          {
            id: 'money-tokens',
            type: 'token',
            position: { x: 30, y: 200 },
            size: { width: 40, height: 25 },
            label: '돈 토큰',
            description: '게임 화폐',
            step: 3
          },
          {
            id: 'player-markers',
            type: 'player',
            position: { x: 100, y: 30 },
            size: { width: 30, height: 15 },
            label: '플레이어 마커',
            description: '점수 트랙용 마커',
            step: 3
          },
          {
            id: 'x-tokens',
            type: 'token',
            position: { x: 320, y: 30 },
            size: { width: 35, height: 20 },
            label: 'X 토큰',
            description: '특수 액션 토큰',
            step: 3
          }
        ]
      }
    ]
  },
  'wingspan': {
    name: 'Wingspan',
    steps: [
      {
        id: 'wingspan-setup-1',
        title: '개인 영역 설정',
        description: '각 플레이어의 개인 서식지 보드를 설정합니다.',
        instructions: [
          '서식지 보드를 앞에 놓으세요',
          '시작 새 카드 5장을 받으세요',
          '시작 보너스 카드 2장을 받으세요',
          '음식 토큰 5개를 받으세요'
        ],
        elements: [
          {
            id: 'habitat-board',
            type: 'board',
            position: { x: 50, y: 100 },
            size: { width: 150, height: 60 },
            label: '서식지 보드',
            description: '개인 서식지 보드',
            step: 1
          },
          {
            id: 'bird-cards',
            type: 'card',
            position: { x: 220, y: 80 },
            size: { width: 50, height: 35 },
            label: '새 카드',
            description: '시작 새 카드 5장',
            step: 1
          },
          {
            id: 'bonus-cards',
            type: 'card',
            position: { x: 220, y: 125 },
            size: { width: 50, height: 35 },
            label: '보너스 카드',
            description: '시작 보너스 카드 2장',
            step: 1
          },
          {
            id: 'food-tokens',
            type: 'token',
            position: { x: 290, y: 100 },
            size: { width: 40, height: 25 },
            label: '음식 토큰',
            description: '시작 음식 5개',
            step: 1
          }
        ]
      }
    ]
  }
};

// 플레이어 수에 따른 동적 다이어그램 생성
export const generatePlayerSpecificDiagram = (
  gameId: string, 
  playerCount: number
): BoardLayoutStep[] => {
  const baseTemplate = GAME_DIAGRAM_TEMPLATES[gameId as keyof typeof GAME_DIAGRAM_TEMPLATES];
  
  if (!baseTemplate) {
    return [];
  }

  // 플레이어 수에 따라 다이어그램 요소 조정
  return baseTemplate.steps.map(step => ({
    ...step,
    elements: step.elements.map(element => {
      // 플레이어별 요소 복제 (예: 개인 보드)
      if (element.type === 'player' || element.id.includes('player')) {
        const playerElements: DiagramElement[] = [];
        for (let i = 0; i < playerCount; i++) {
          playerElements.push({
            ...element,
            id: `${element.id}-${i + 1}`,
            label: `${element.label} ${i + 1}`,
            position: {
              x: element.position.x + (i * 40),
              y: element.position.y + (i * 20)
            },
            color: getPlayerColor(i)
          });
        }
        return playerElements;
      }
      return [element];
    }).flat()
  }));
};

// 플레이어별 색상 할당
const getPlayerColor = (playerIndex: number): string => {
  const colors = [
    '#ef4444', // red-500
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899'  // pink-500
  ];
  return colors[playerIndex % colors.length];
};

// 게임별 기본 viewBox 설정
export const getGameViewBox = (gameId: string): string => {
  const viewBoxes = {
    'ark-nova': '0 0 400 250',
    'wingspan': '0 0 350 200',
    'terraforming-mars': '0 0 450 300',
    'gloomhaven': '0 0 500 350'
  };
  
  return viewBoxes[gameId as keyof typeof viewBoxes] || '0 0 400 300';
};