'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AccordionSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  icon?: string;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  variant?: 'default' | 'compact' | 'bordered';
}

const variants = {
  default: {
    header: 'p-4 md:p-5',
    content: 'px-4 md:px-5 pb-4 md:pb-5',
    container: 'glass-card rounded-xl border border-amber-400/20'
  },
  compact: {
    header: 'p-3 md:p-4',
    content: 'px-3 md:px-4 pb-3 md:pb-4',
    container: 'glass-card rounded-lg border border-amber-400/15'
  },
  bordered: {
    header: 'p-4 md:p-5 border-b border-amber-400/20',
    content: 'px-4 md:px-5 pb-4 md:pb-5',
    container: 'glass-card rounded-xl border-2 border-amber-400/30'
  }
};

export function AccordionSection({
  title,
  children,
  defaultExpanded = false,
  icon = '📋',
  className,
  headerClassName,
  contentClassName,
  variant = 'default'
}: AccordionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contentRef = useRef<HTMLDivElement>(null);
  const variantStyles = variants[variant];

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={cn(variantStyles.container, className)}>
      {/* 헤더 */}
      <button
        onClick={toggleExpanded}
        className={cn(
          'w-full text-left transition-all duration-200 hover:bg-amber-500/5 focus:outline-none focus:ring-2 focus:ring-amber-400/50 rounded-t-xl',
          'min-h-[44px] flex items-center', // 터치 친화적 높이
          variantStyles.header,
          headerClassName
        )}
        aria-expanded={isExpanded}
        aria-controls={`accordion-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <span className="text-xl flex-shrink-0">{icon}</span>
            <h3 className="font-semibold text-amber-100 text-base md:text-lg">
              {title}
            </h3>
          </div>
          
          {/* 펼침/접힘 아이콘 */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="flex-shrink-0 ml-2"
          >
            <svg 
              className="w-5 h-5 text-amber-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 9l-7 7-7-7" 
              />
            </svg>
          </motion.div>
        </div>
      </button>

      {/* 콘텐츠 */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={`accordion-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
            ref={contentRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: 'auto', 
              opacity: 1,
              transition: {
                height: { duration: 0.3, ease: 'easeInOut' },
                opacity: { duration: 0.2, delay: 0.1, ease: 'easeOut' }
              }
            }}
            exit={{ 
              height: 0, 
              opacity: 0,
              transition: {
                height: { duration: 0.3, ease: 'easeInOut' },
                opacity: { duration: 0.1, ease: 'easeIn' }
              }
            }}
            style={{ overflow: 'hidden' }}
          >
            <div className={cn(variantStyles.content, contentClassName)}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 여러 AccordionSection을 그룹으로 관리하는 컴포넌트
interface AccordionGroupProps {
  children: React.ReactNode;
  allowMultiple?: boolean;
  className?: string;
}

export function AccordionGroup({ 
  children, 
  allowMultiple = true, 
  className 
}: AccordionGroupProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const handleToggle = (itemId: string) => {
    if (allowMultiple) {
      const newExpanded = new Set(expandedItems);
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        newExpanded.add(itemId);
      }
      setExpandedItems(newExpanded);
    } else {
      setExpandedItems(expandedItems.has(itemId) ? new Set() : new Set([itemId]));
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child) && child.type === AccordionSection) {
          const itemId = `accordion-${index}`;
          const isExpanded = expandedItems.has(itemId);
          
          return React.cloneElement(child as React.ReactElement<AccordionSectionProps>, {
            ...(child.props as AccordionSectionProps),
            defaultExpanded: isExpanded,
            key: itemId
          });
        }
        return child;
      })}
    </div>
  );
}