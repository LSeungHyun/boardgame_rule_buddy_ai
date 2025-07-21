'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DiagramInfo, InteractiveElement } from '@/types/game-setup';

interface InteractiveDiagramProps {
  diagram: DiagramInfo;
  className?: string;
  onElementClick?: (elementId: string) => void;
  highlightedElements?: string[];
  autoPlay?: boolean;
  playSpeed?: number;
}

export function InteractiveDiagram({
  diagram,
  className,
  onElementClick,
  highlightedElements = [],
  autoPlay = false,
  playSpeed = 2000
}: InteractiveDiagramProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const [autoPlayIndex, setAutoPlayIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 자동 재생 로직
  useEffect(() => {
    if (autoPlay && diagram.interactiveElements) {
      const elements = diagram.interactiveElements.filter(el => el.trigger === 'auto');
      
      if (elements.length > 0) {
        autoPlayTimerRef.current = setInterval(() => {
          const currentElement = elements[autoPlayIndex];
          if (currentElement) {
            setCurrentAnimation(currentElement.id);
            setTimeout(() => {
              setCurrentAnimation(null);
            }, currentElement.delay || 1000);
          }
          
          setAutoPlayIndex((prev) => (prev + 1) % elements.length);
        }, playSpeed);
      }
    }

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
    };
  }, [autoPlay, autoPlayIndex, playSpeed, diagram.interactiveElements]);

  const handleElementInteraction = (element: InteractiveElement, action: 'hover' | 'click') => {
    if (element.trigger === action || element.trigger === 'auto') {
      switch (element.type) {
        case 'tooltip':
          if (action === 'hover') {
            setActiveTooltip(element.id);
          } else if (action === 'click') {
            setActiveTooltip(activeTooltip === element.id ? null : element.id);
          }
          break;
        case 'highlight':
          setCurrentAnimation(element.id);
          setTimeout(() => setCurrentAnimation(null), element.delay || 1000);
          break;
        case 'animation':
          setCurrentAnimation(element.id);
          setTimeout(() => setCurrentAnimation(null), element.delay || 2000);
          break;
      }
      
      onElementClick?.(element.id);
    }
  };

  const renderImageDiagram = () => (
    <div className="relative">
      <img
        src={diagram.src}
        alt={diagram.caption || '게임 셋업 다이어그램'}
        className="w-full h-auto rounded-lg shadow-lg"
      />
      {diagram.interactiveElements?.map(element => (
        <InteractiveElementOverlay
          key={element.id}
          element={element}
          isActive={currentAnimation === element.id}
          isHighlighted={highlightedElements.includes(element.id)}
          showTooltip={activeTooltip === element.id}
          onInteraction={(action) => handleElementInteraction(element, action)}
        />
      ))}
    </div>
  );

  const renderSVGDiagram = () => (
    <div 
      className="relative"
      dangerouslySetInnerHTML={{ __html: diagram.svgContent || '' }}
    />
  );

  const renderInteractiveDiagram = () => (
    <div className="relative bg-game-table-dark rounded-lg p-6 border border-amber-400/20">
      <svg
        viewBox="0 0 800 600"
        className="w-full h-auto"
        style={{ maxHeight: '400px' }}
      >
        {/* 기본 보드 배경 */}
        <rect
          x="50"
          y="50"
          width="700"
          height="500"
          fill="rgba(139, 111, 74, 0.3)"
          stroke="rgba(212, 175, 55, 0.5)"
          strokeWidth="2"
          rx="10"
        />
        
        {/* 예시: 아크 노바 보드 레이아웃 */}
        <g id="main-board">
          {/* 중앙 보드 */}
          <rect
            x="300"
            y="200"
            width="200"
            height="200"
            fill="rgba(75, 52, 37, 0.8)"
            stroke="rgba(212, 175, 55, 0.8)"
            strokeWidth="2"
            rx="8"
          />
          <text
            x="400"
            y="310"
            textAnchor="middle"
            fill="rgba(245, 245, 220, 0.9)"
            fontSize="14"
            fontWeight="bold"
          >
            메인 보드
          </text>
        </g>

        {/* 플레이어 보드들 */}
        {[1, 2, 3, 4].map((player, index) => {
          const angle = (index * 90) * (Math.PI / 180);
          const radius = 250;
          const x = 400 + Math.cos(angle) * radius - 60;
          const y = 300 + Math.sin(angle) * radius - 40;
          
          return (
            <g key={player} id={`player-${player}-board`}>
              <rect
                x={x}
                y={y}
                width="120"
                height="80"
                fill="rgba(107, 78, 61, 0.8)"
                stroke="rgba(212, 175, 55, 0.6)"
                strokeWidth="1"
                rx="4"
              />
              <text
                x={x + 60}
                y={y + 45}
                textAnchor="middle"
                fill="rgba(245, 245, 220, 0.8)"
                fontSize="12"
              >
                플레이어 {player}
              </text>
            </g>
          );
        })}

        {/* 인터랙티브 요소들 */}
        {diagram.interactiveElements?.map(element => (
          <g key={element.id}>
            <circle
              cx={element.position.x}
              cy={element.position.y}
              r="8"
              fill={currentAnimation === element.id ? "rgba(212, 175, 55, 0.8)" : "rgba(212, 175, 55, 0.4)"}
              stroke="rgba(212, 175, 55, 1)"
              strokeWidth="2"
              className="cursor-pointer transition-all duration-300"
              onClick={() => handleElementInteraction(element, 'click')}
              onMouseEnter={() => handleElementInteraction(element, 'hover')}
              onMouseLeave={() => setActiveTooltip(null)}
            />
            {(currentAnimation === element.id || highlightedElements.includes(element.id)) && (
              <motion.circle
                cx={element.position.x}
                cy={element.position.y}
                r="8"
                fill="none"
                stroke="rgba(212, 175, 55, 1)"
                strokeWidth="3"
                initial={{ r: 8, opacity: 1 }}
                animate={{ r: 20, opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </g>
        ))}
      </svg>

      {/* 툴팁 */}
      <AnimatePresence>
        {activeTooltip && diagram.interactiveElements && (
          <TooltipOverlay
            element={diagram.interactiveElements.find(el => el.id === activeTooltip)!}
            containerRef={containerRef}
            onClose={() => setActiveTooltip(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {diagram.type === 'image' && renderImageDiagram()}
      {diagram.type === 'svg' && renderSVGDiagram()}
      {diagram.type === 'interactive' && renderInteractiveDiagram()}
      
      {/* 캡션 */}
      {diagram.caption && (
        <p className="text-sm text-amber-200/80 text-center mt-3 italic">
          {diagram.caption}
        </p>
      )}

      {/* 컨트롤 패널 */}
      {diagram.interactiveElements && diagram.interactiveElements.length > 0 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setAutoPlayIndex(0)}
            className="btn-game-secondary px-3 py-1 text-sm rounded-lg"
          >
            🔄 리셋
          </button>
          
          {diagram.interactiveElements.filter(el => el.trigger === 'click').map(element => (
            <button
              key={element.id}
              onClick={() => handleElementInteraction(element, 'click')}
              className={cn(
                'px-3 py-1 text-sm rounded-lg transition-all',
                currentAnimation === element.id || highlightedElements.includes(element.id)
                  ? 'btn-game-primary'
                  : 'btn-game-secondary'
              )}
            >
              {element.content.split(' ')[0]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 인터랙티브 요소 오버레이 컴포넌트
interface InteractiveElementOverlayProps {
  element: InteractiveElement;
  isActive: boolean;
  isHighlighted: boolean;
  showTooltip: boolean;
  onInteraction: (action: 'hover' | 'click') => void;
}

function InteractiveElementOverlay({
  element,
  isActive,
  isHighlighted,
  showTooltip,
  onInteraction
}: InteractiveElementOverlayProps) {
  return (
    <>
      <motion.div
        className={cn(
          'absolute cursor-pointer',
          element.type === 'highlight' && 'border-2 border-amber-400 bg-amber-400/20',
          element.type === 'tooltip' && 'w-4 h-4 bg-amber-400 rounded-full'
        )}
        style={{
          left: `${element.position.x}%`,
          top: `${element.position.y}%`,
          width: element.position.width ? `${element.position.width}%` : '16px',
          height: element.position.height ? `${element.position.height}%` : '16px'
        }}
        animate={{
          scale: isActive || isHighlighted ? 1.2 : 1,
          opacity: isActive ? 0.8 : 1
        }}
        transition={{ duration: 0.3 }}
        onClick={() => onInteraction('click')}
        onMouseEnter={() => onInteraction('hover')}
        onMouseLeave={() => {}}
      />

      {/* 툴팁 */}
      <AnimatePresence>
        {showTooltip && element.type === 'tooltip' && (
          <motion.div
            className="absolute z-10 bg-black/90 text-white p-2 rounded-lg text-sm max-w-xs"
            style={{
              left: `${element.position.x}%`,
              top: `${element.position.y - 10}%`
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {element.content}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// 툴팁 오버레이 컴포넌트
interface TooltipOverlayProps {
  element: InteractiveElement;
  containerRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
}

function TooltipOverlay({ element, containerRef, onClose }: TooltipOverlayProps) {
  return (
    <motion.div
      className="absolute z-20 bg-black/95 text-white p-4 rounded-xl shadow-2xl max-w-sm border border-amber-400/30"
      style={{
        left: `${element.position.x}%`,
        top: `${element.position.y}%`,
        transform: 'translate(-50%, -100%)'
      }}
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-relaxed text-amber-100">
          {element.content}
        </p>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-amber-300 hover:text-amber-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* 화살표 */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-black/95" />
    </motion.div>
  );
}