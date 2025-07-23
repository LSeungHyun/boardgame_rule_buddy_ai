'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface DiagramElement {
  id: string;
  type: 'board' | 'card' | 'token' | 'player' | 'component';
  position: { x: number; y: number };
  size: { width: number; height: number };
  label: string;
  description?: string;
  color?: string;
  isHighlighted?: boolean;
  isActive?: boolean;
  step?: number;
}

export interface DiagramProps {
  elements: DiagramElement[];
  currentStep: number;
  onElementClick?: (element: DiagramElement) => void;
  className?: string;
  viewBox?: string;
  showLabels?: boolean;
  animationDelay?: number;
}

const VisualDiagram: React.FC<DiagramProps> = ({
  elements,
  currentStep,
  onElementClick,
  className,
  viewBox = "0 0 400 300",
  showLabels = true,
  animationDelay = 0.1
}) => {
  const [activeElements, setActiveElements] = useState<DiagramElement[]>([]);

  useEffect(() => {
    // 현재 단계에 해당하는 요소들만 활성화
    const stepElements = elements.filter(
      element => !element.step || element.step <= currentStep
    );
    setActiveElements(stepElements);
  }, [elements, currentStep]);

  const getElementColor = (element: DiagramElement): string => {
    if (element.isHighlighted) return '#3b82f6'; // blue-500
    if (element.color) return element.color;
    
    switch (element.type) {
      case 'board': return '#8b5cf6'; // violet-500
      case 'card': return '#10b981'; // emerald-500
      case 'token': return '#f59e0b'; // amber-500
      case 'player': return '#ef4444'; // red-500
      case 'component': return '#6b7280'; // gray-500
      default: return '#6b7280';
    }
  };

  const renderElement = (element: DiagramElement, index: number) => {
    const color = getElementColor(element);
    const isVisible = element.step ? element.step <= currentStep : true;

    return (
      <motion.g
        key={element.id}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: isVisible ? 1 : 0.3, 
          scale: isVisible ? 1 : 0.8 
        }}
        transition={{ 
          delay: index * animationDelay,
          duration: 0.3,
          ease: "easeOut"
        }}
        style={{ cursor: onElementClick ? 'pointer' : 'default' }}
        onClick={() => onElementClick?.(element)}
      >
        {/* 요소 배경 */}
        <rect
          x={element.position.x}
          y={element.position.y}
          width={element.size.width}
          height={element.size.height}
          fill={color}
          fillOpacity={element.isHighlighted ? 0.8 : 0.6}
          stroke={color}
          strokeWidth={element.isHighlighted ? 3 : 2}
          rx={element.type === 'card' ? 8 : 4}
          className={cn(
            "transition-all duration-200",
            element.isHighlighted && "drop-shadow-lg"
          )}
        />
        
        {/* 하이라이트 효과 */}
        {element.isHighlighted && (
          <motion.rect
            x={element.position.x - 2}
            y={element.position.y - 2}
            width={element.size.width + 4}
            height={element.size.height + 4}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            rx={element.type === 'card' ? 10 : 6}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}

        {/* 라벨 텍스트 */}
        {showLabels && (
          <text
            x={element.position.x + element.size.width / 2}
            y={element.position.y + element.size.height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="12"
            fontWeight="600"
            className="pointer-events-none select-none"
          >
            {element.label}
          </text>
        )}

        {/* 단계 번호 표시 */}
        {element.step && element.step <= currentStep && (
          <circle
            cx={element.position.x + element.size.width - 8}
            cy={element.position.y + 8}
            r="8"
            fill="#10b981"
            stroke="white"
            strokeWidth="2"
          />
        )}
        {element.step && element.step <= currentStep && (
          <text
            x={element.position.x + element.size.width - 8}
            y={element.position.y + 8}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="10"
            fontWeight="bold"
            className="pointer-events-none select-none"
          >
            {element.step}
          </text>
        )}
      </motion.g>
    );
  };

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={viewBox}
        className="w-full h-auto border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
        style={{ minHeight: '200px' }}
      >
        <AnimatePresence>
          {activeElements.map((element, index) => renderElement(element, index))}
        </AnimatePresence>
        
        {/* 격자 배경 (선택적) */}
        <defs>
          <pattern
            id="grid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="0.5"
              opacity="0.3"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
};

export { VisualDiagram };
export default VisualDiagram;