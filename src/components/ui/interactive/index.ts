/**
 * 인터랙티브 UI 컴포넌트 내보내기
 * 다이어그램, 시각화, 상호작용 컴포넌트들
 */

// 다이어그램 컴포넌트
export { InteractiveDiagram } from '../interactive-diagram';
export { default as VisualDiagram } from '../visual-diagram';
export { GAME_DIAGRAM_TEMPLATES, generatePlayerSpecificDiagram, getGameViewBox } from '../diagram-templates';

// 보드 레이아웃 컴포넌트
export { default as InteractiveBoardLayout } from '../interactive-board-layout';

// 아코디언 관련 컴포넌트
export { AccordionSection } from '../accordion-section';