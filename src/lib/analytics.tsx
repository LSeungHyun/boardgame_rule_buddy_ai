/**
 * Google Analytics 4 Provider 및 React 훅
 * 전역 분석 컨텍스트를 제공하고 컴포넌트에서 쉽게 사용할 수 있도록 합니다.
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  loadGoogleAnalytics, 
  trackPageView, 
  trackEvent, 
  setUserProperties,
  isGoogleAnalyticsEnabled,
  simulateEvent,
  GA_MEASUREMENT_ID
} from './gtag';

// Analytics 컨텍스트 타입 정의
interface AnalyticsContextType {
  isEnabled: boolean;
  isLoaded: boolean;
  trackPageView: (path: string, title?: string) => void;
  trackEvent: (eventName: string, parameters?: Record<string, any>) => void;
  setUserProperties: (properties: Record<string, any>) => void;
}

// Analytics 설정 타입
interface AnalyticsConfig {
  enableDevelopment?: boolean;
  debugMode?: boolean;
}

// 기본 컨텍스트 값
const defaultContext: AnalyticsContextType = {
  isEnabled: false,
  isLoaded: false,
  trackPageView: () => {},
  trackEvent: () => {},
  setUserProperties: () => {}
};

// Analytics 컨텍스트 생성
const AnalyticsContext = createContext<AnalyticsContextType>(defaultContext);

// Analytics Provider Props
interface AnalyticsProviderProps {
  children: ReactNode;
  config?: AnalyticsConfig;
}

/**
 * Analytics Provider 컴포넌트
 * 애플리케이션 전체에 Google Analytics 기능을 제공합니다
 */
export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ 
  children, 
  config = {} 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const initializeAnalytics = async () => {
      // GA4 측정 ID가 없으면 비활성화
      if (!GA_MEASUREMENT_ID) {
        console.warn('⚠️ GA4 측정 ID가 설정되지 않았습니다');
        return;
      }

      // 개발 환경에서는 설정에 따라 활성화
      if (process.env.NODE_ENV === 'development' && !config.enableDevelopment) {
        console.log('🧪 개발 환경에서 GA4 시뮬레이션 모드 활성화');
        setIsEnabled(true);
        setIsLoaded(true);
        return;
      }

      try {
        await loadGoogleAnalytics();
        setIsEnabled(true);
        setIsLoaded(true);
        
        console.log('✅ Google Analytics 4 초기화 완료');
      } catch (error) {
        console.error('❌ Google Analytics 4 초기화 실패:', error);
        setIsEnabled(false);
        setIsLoaded(false);
      }
    };

    initializeAnalytics();
  }, [config.enableDevelopment]);

  // 컨텍스트 값 생성
  const contextValue: AnalyticsContextType = {
    isEnabled,
    isLoaded,
    trackPageView: (path: string, title?: string) => {
      if (isEnabled) {
        if (process.env.NODE_ENV === 'development' && !config.enableDevelopment) {
          simulateEvent('page_view', { page_path: path, page_title: title });
        } else {
          trackPageView(path, title);
        }
      }
    },
    trackEvent: (eventName: string, parameters: Record<string, any> = {}) => {
      if (isEnabled) {
        if (process.env.NODE_ENV === 'development' && !config.enableDevelopment) {
          simulateEvent(eventName, parameters);
        } else {
          trackEvent(eventName, parameters);
        }
      }
    },
    setUserProperties: (properties: Record<string, any>) => {
      if (isEnabled) {
        if (process.env.NODE_ENV === 'development' && !config.enableDevelopment) {
          console.log('🧪 [GA4 사용자 속성 시뮬레이션]', properties);
        } else {
          setUserProperties(properties);
        }
      }
    }
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
};

/**
 * Analytics 훅
 * 컴포넌트에서 Google Analytics 기능을 사용할 수 있게 해줍니다
 */
export const useAnalytics = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);
  
  if (!context) {
    throw new Error('useAnalytics는 AnalyticsProvider 내부에서 사용해야 합니다');
  }
  
  return context;
};

/**
 * 페이지뷰 자동 추적 훅
 * 컴포넌트 마운트 시 자동으로 페이지뷰를 추적합니다
 */
export const usePageView = (path: string, title?: string): void => {
  const { trackPageView } = useAnalytics();
  
  useEffect(() => {
    trackPageView(path, title);
  }, [path, title, trackPageView]);
};

/**
 * 게임 선택 이벤트 추적 훅
 */
export const useGameSelectionTracking = () => {
  const { trackEvent } = useAnalytics();
  
  return {
    trackGameSelection: (gameTitle: string, gameId: string, method: 'click' | 'search' = 'click') => {
      trackEvent('game_selection', {
        game_title: gameTitle,
        game_id: gameId,
        selection_method: method,
        timestamp: Date.now()
      });
    },
    
    trackGameSearch: (searchQuery: string, resultCount: number) => {
      trackEvent('game_search', {
        search_query: searchQuery.slice(0, 50), // 개인정보 보호를 위해 길이 제한
        result_count: resultCount,
        timestamp: Date.now()
      });
    },
    
    trackGameChange: (previousGame: string, newGame: string) => {
      trackEvent('game_change', {
        previous_game: previousGame,
        new_game: newGame,
        timestamp: Date.now()
      });
    }
  };
};

/**
 * 질문 및 대화 추적 훅
 */
export const useQuestionTracking = () => {
  const { trackEvent } = useAnalytics();
  
  return {
    trackQuestionSubmitted: (gameContext: string, questionLength: number, researchTriggered: boolean) => {
      trackEvent('question_submitted', {
        game_context: gameContext,
        question_length: Math.min(questionLength, 1000), // 길이 제한
        research_triggered: researchTriggered,
        timestamp: Date.now()
      });
    },
    
    trackResearchUsed: (gameTitle: string, complexityScore: number, duration: number) => {
      trackEvent('research_used', {
        game_title: gameTitle,
        complexity_score: complexityScore,
        research_duration: duration,
        timestamp: Date.now()
      });
    },
    
    trackAIResponse: (responseTime: number, wasSuccessful: boolean) => {
      trackEvent('ai_response', {
        response_time: responseTime,
        was_successful: wasSuccessful,
        timestamp: Date.now()
      });
    }
  };
};

/**
 * 사용자 참여도 추적 훅
 */
export const useEngagementTracking = () => {
  const { trackEvent } = useAnalytics();
  
  return {
    trackSessionStart: (sessionId: string) => {
      trackEvent('session_start', {
        session_id: sessionId,
        timestamp: Date.now()
      });
    },
    
    trackSessionEnd: (sessionId: string, duration: number, questionCount: number) => {
      trackEvent('session_end', {
        session_id: sessionId,
        session_duration: duration,
        question_count: questionCount,
        timestamp: Date.now()
      });
    },
    
    trackUserExit: (exitPoint: string, timeSpent: number) => {
      trackEvent('user_exit', {
        exit_point: exitPoint,
        time_spent: timeSpent,
        timestamp: Date.now()
      });
    },
    
    trackError: (errorType: string, errorMessage: string, context: string) => {
      trackEvent('error_occurred', {
        error_type: errorType,
        error_message: errorMessage.slice(0, 100), // 개인정보 보호
        context: context,
        timestamp: Date.now()
      });
    }
  };
};