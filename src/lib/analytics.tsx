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

// Microsoft Clarity 프로젝트 ID
export const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

// Microsoft Clarity 타입 정의
declare global {
  interface Window {
    clarity: {
      (command: 'init', projectId: string): void;
      (command: 'identify', customId: string, customSessionId?: string, customPageId?: string, friendlyName?: string): void;
      (command: 'setTag', key: string, value: string | string[]): void;
      (command: 'event', eventName: string): void;
      (command: 'consent', consent?: boolean): void;
      (command: 'upgrade', reason: string): void;
      q?: any[];
    };
  }
}

/**
 * Microsoft Clarity 메서드를 안전하게 호출하는 래퍼 함수
 */
const safeCallClarity = (
  command: string,
  ...args: any[]
): boolean => {
  try {
    if (typeof window === 'undefined') {
      console.log('🧪 [Clarity 시뮬레이션 - SSR]', { command, args });
      return false;
    }

    // Clarity 객체가 존재하는지 확인
    if (!window.clarity) {
      console.warn('⚠️ [Clarity] 객체가 아직 로드되지 않았습니다:', command);
      return false;
    }

    // 함수인지 확인
    if (typeof window.clarity !== 'function') {
      console.warn('⚠️ [Clarity] 올바른 함수가 아닙니다:', typeof window.clarity);
      return false;
    }

    // 메서드 호출
    window.clarity(command as any, ...args);
    console.log('✅ [Clarity 호출 성공]', { command, args });
    return true;
  } catch (error) {
    console.error('❌ [Clarity 호출 실패]', { command, args, error });

    // 개발 환경에서 시뮬레이션으로 처리
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 [Clarity 시뮬레이션 폴백]', { command, args });
    }

    return false;
  }
};

/**
 * Clarity가 완전히 준비될 때까지 대기하는 함수
 */
const waitForClarityReady = (timeout: number = 5000): Promise<boolean> => {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkReady = () => {
      // 타임아웃 체크
      if (Date.now() - startTime > timeout) {
        console.warn('⚠️ [Clarity] 로드 타임아웃');
        resolve(false);
        return;
      }

      // Clarity 객체와 기본 메서드들이 준비되었는지 확인
      if (
        window.clarity &&
        typeof window.clarity === 'function'
      ) {
        // 추가 초기화 시간 대기 (Clarity 내부 메서드 준비)
        setTimeout(() => {
          console.log('✅ [Clarity] 완전 로드 확인됨');
          resolve(true);
        }, 500);
      } else {
        // 100ms 후 다시 체크
        setTimeout(checkReady, 100);
      }
    };

    checkReady();
  });
};

// Analytics 컨텍스트 타입 정의
interface AnalyticsContextType {
  isEnabled: boolean;
  isLoaded: boolean;
  isClarityLoaded: boolean;
  trackPageView: (path: string, title?: string) => void;
  trackEvent: (eventName: string, parameters?: Record<string, any>) => void;
  setUserProperties: (properties: Record<string, any>) => void;
  // Microsoft Clarity 메서드들
  clarityIdentify: (customId: string, customSessionId?: string, customPageId?: string, friendlyName?: string) => void;
  claritySetTag: (key: string, value: string | string[]) => void;
  clarityEvent: (eventName: string) => void;
  clarityConsent: (consent?: boolean) => void;
  clarityUpgrade: (reason: string) => void;
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
  isClarityLoaded: false,
  trackPageView: () => { },
  trackEvent: () => { },
  setUserProperties: () => { },
  clarityIdentify: () => { },
  claritySetTag: () => { },
  clarityEvent: () => { },
  clarityConsent: () => { },
  clarityUpgrade: () => { }
};

// Analytics 컨텍스트 생성
const AnalyticsContext = createContext<AnalyticsContextType>(defaultContext);

// Analytics Provider Props
interface AnalyticsProviderProps {
  children: ReactNode;
  config?: AnalyticsConfig;
}

/**
 * Microsoft Clarity 스크립트를 동적으로 로드합니다
 */
const loadMicrosoftClarity = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !CLARITY_PROJECT_ID) {
      resolve();
      return;
    }

    // 이미 로드된 경우 스킵
    if (window.clarity) {
      resolve();
      return;
    }

    try {
      // Clarity 인라인 스크립트 추가 (공식 방식)
      const inlineScript = document.createElement('script');
      inlineScript.innerHTML = `
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
      `;

      document.head.appendChild(inlineScript);

      // Clarity가 완전히 로드될 때까지 대기
      waitForClarityReady().then((isReady) => {
        if (isReady) {
          console.log('✅ Microsoft Clarity 로드 및 초기화 완료');
          resolve();
        } else {
          console.warn('⚠️ Microsoft Clarity 로드 완료했으나 일부 기능이 준비되지 않을 수 있습니다');
          resolve(); // 부분적으로라도 사용 가능하도록 resolve
        }
      });

    } catch (error) {
      console.error('❌ Microsoft Clarity 초기화 오류:', error);
      reject(error);
    }
  });
};

/**
 * Analytics Provider 컴포넌트
 * 애플리케이션 전체에 Google Analytics와 Microsoft Clarity 기능을 제공합니다
 */
export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({
  children,
  config = {}
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isClarityLoaded, setIsClarityLoaded] = useState(false);

  useEffect(() => {
    const initializeAnalytics = async () => {
      // GA4 초기화
      if (GA_MEASUREMENT_ID) {
        // 개발 환경에서는 설정에 따라 활성화
        if (process.env.NODE_ENV === 'development' && !config.enableDevelopment) {
          console.log('🧪 개발 환경에서 GA4 시뮬레이션 모드 활성화');
          setIsEnabled(true);
          setIsLoaded(true);
        } else {
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
        }
      } else {
        console.warn('⚠️ GA4 측정 ID가 설정되지 않았습니다');
      }

      // Microsoft Clarity 초기화
      if (CLARITY_PROJECT_ID) {
        if (process.env.NODE_ENV === 'development' && !config.enableDevelopment) {
          console.log('🧪 개발 환경에서 Microsoft Clarity 시뮬레이션 모드 활성화');
          setIsClarityLoaded(true);
        } else {
          try {
            await loadMicrosoftClarity();
            setIsClarityLoaded(true);
            console.log('✅ Microsoft Clarity 초기화 완료');
          } catch (error) {
            console.error('❌ Microsoft Clarity 초기화 실패:', error);
            setIsClarityLoaded(false);
          }
        }
      } else {
        console.warn('⚠️ Microsoft Clarity 프로젝트 ID가 설정되지 않았습니다');
      }
    };

    initializeAnalytics();
  }, [config.enableDevelopment]);

  // Microsoft Clarity 메서드들 (안전한 호출)
  const clarityIdentify = (customId: string, customSessionId?: string, customPageId?: string, friendlyName?: string) => {
    if (process.env.NODE_ENV === 'development' && !config.enableDevelopment) {
      console.log('🧪 [Clarity Identify 시뮬레이션]', { customId, customSessionId, customPageId, friendlyName });
    } else {
      safeCallClarity('identify', customId, customSessionId, customPageId, friendlyName);
    }
  };

  const claritySetTag = (key: string, value: string | string[]) => {
    if (process.env.NODE_ENV === 'development' && !config.enableDevelopment) {
      console.log('🧪 [Clarity SetTag 시뮬레이션]', { key, value });
    } else {
      safeCallClarity('setTag', key, value);
    }
  };

  const clarityEvent = (eventName: string) => {
    if (process.env.NODE_ENV === 'development' && !config.enableDevelopment) {
      console.log('🧪 [Clarity Event 시뮬레이션]', { eventName });
    } else {
      safeCallClarity('event', eventName);
    }
  };

  const clarityConsent = (consent: boolean = true) => {
    if (process.env.NODE_ENV === 'development' && !config.enableDevelopment) {
      console.log('🧪 [Clarity Consent 시뮬레이션]', { consent });
    } else {
      safeCallClarity('consent', consent);
    }
  };

  const clarityUpgrade = (reason: string) => {
    if (process.env.NODE_ENV === 'development' && !config.enableDevelopment) {
      console.log('🧪 [Clarity Upgrade 시뮬레이션]', { reason });
    } else {
      safeCallClarity('upgrade', reason);
    }
  };

  // 컨텍스트 값 생성
  const contextValue: AnalyticsContextType = {
    isEnabled,
    isLoaded,
    isClarityLoaded,
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
    },
    clarityIdentify,
    claritySetTag,
    clarityEvent,
    clarityConsent,
    clarityUpgrade
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
};

/**
 * Analytics 훅
 * 컴포넌트에서 Google Analytics와 Microsoft Clarity 기능을 사용할 수 있게 해줍니다
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
  const { trackEvent, clarityEvent, claritySetTag } = useAnalytics();

  return {
    trackGameSelection: (gameTitle: string, gameId: string, method: 'click' | 'search' = 'click') => {
      trackEvent('game_selection', {
        game_title: gameTitle,
        game_id: gameId,
        selection_method: method,
        timestamp: Date.now()
      });

      // Microsoft Clarity에도 동일한 이벤트 전송
      clarityEvent('game_selection');
      claritySetTag('selected_game', gameTitle);
    },

    trackGameSearch: (searchQuery: string, resultCount: number) => {
      trackEvent('game_search', {
        search_query: searchQuery.slice(0, 50), // 개인정보 보호를 위해 길이 제한
        result_count: resultCount,
        timestamp: Date.now()
      });

      clarityEvent('game_search');
    },

    trackGameChange: (previousGame: string, newGame: string) => {
      trackEvent('game_change', {
        previous_game: previousGame,
        new_game: newGame,
        timestamp: Date.now()
      });

      clarityEvent('game_change');
      claritySetTag('previous_game', previousGame);
      claritySetTag('current_game', newGame);
    }
  };
};

/**
 * 질문 및 대화 추적 훅
 */
export const useQuestionTracking = () => {
  const { trackEvent, clarityEvent, claritySetTag } = useAnalytics();

  return {
    trackQuestionSubmitted: (gameContext: string, questionLength: number, researchTriggered: boolean) => {
      trackEvent('question_submitted', {
        game_context: gameContext,
        question_length: Math.min(questionLength, 1000), // 길이 제한
        research_triggered: researchTriggered,
        timestamp: Date.now()
      });

      clarityEvent('question_submitted');
      claritySetTag('game_context', gameContext);
      claritySetTag('research_triggered', researchTriggered.toString());
    },

    trackResearchUsed: (gameTitle: string, complexityScore: number, duration: number) => {
      trackEvent('research_used', {
        game_title: gameTitle,
        complexity_score: complexityScore,
        research_duration: duration,
        timestamp: Date.now()
      });

      clarityEvent('research_used');
      claritySetTag('complexity_score', complexityScore.toString());
    },

    trackAIResponse: (responseTime: number, wasSuccessful: boolean) => {
      trackEvent('ai_response', {
        response_time: responseTime,
        was_successful: wasSuccessful,
        timestamp: Date.now()
      });

      clarityEvent('ai_response');
      claritySetTag('response_success', wasSuccessful.toString());
    }
  };
};

/**
 * 사용자 참여도 추적 훅
 */
export const useEngagementTracking = () => {
  const { trackEvent, clarityEvent, claritySetTag, clarityIdentify } = useAnalytics();

  return {
    trackSessionStart: (sessionId: string) => {
      trackEvent('session_start', {
        session_id: sessionId,
        timestamp: Date.now()
      });

      clarityEvent('session_start');
      clarityIdentify(sessionId, sessionId); // Clarity에 세션 식별자 전달
    },

    trackSessionEnd: (sessionId: string, duration: number, questionCount: number) => {
      trackEvent('session_end', {
        session_id: sessionId,
        session_duration: duration,
        question_count: questionCount,
        timestamp: Date.now()
      });

      clarityEvent('session_end');
      claritySetTag('session_duration', duration.toString());
      claritySetTag('question_count', questionCount.toString());
    },

    trackUserExit: (exitPoint: string, timeSpent: number) => {
      trackEvent('user_exit', {
        exit_point: exitPoint,
        time_spent: timeSpent,
        timestamp: Date.now()
      });

      clarityEvent('user_exit');
      claritySetTag('exit_point', exitPoint);
    },

    trackError: (errorType: string, errorMessage: string, context: string) => {
      trackEvent('error_occurred', {
        error_type: errorType,
        error_message: errorMessage.slice(0, 100), // 개인정보 보호
        context: context,
        timestamp: Date.now()
      });

      clarityEvent('error_occurred');
      claritySetTag('error_type', errorType);
    }
  };
};

/**
 * Microsoft Clarity 전용 추적 훅
 */
export const useClarityTracking = () => {
  const { clarityEvent, claritySetTag, clarityIdentify, clarityUpgrade } = useAnalytics();

  return {
    trackUserBehavior: (behaviorType: string, details?: Record<string, string>) => {
      clarityEvent(`user_behavior_${behaviorType}`);
      if (details) {
        Object.entries(details).forEach(([key, value]) => {
          claritySetTag(key, value);
        });
      }
    },

    identifyUser: (userId: string, sessionId?: string, pageId?: string, friendlyName?: string) => {
      clarityIdentify(userId, sessionId, pageId, friendlyName);
    },

    upgradeSession: (reason: string) => {
      clarityUpgrade(reason);
    },

    setCustomTag: (key: string, value: string | string[]) => {
      claritySetTag(key, value);
    }
  };
};