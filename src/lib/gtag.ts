/**
 * Google Analytics 4 (GA4) gtag 래퍼 함수
 * Next.js 환경에서 최적화된 GA4 통합을 제공합니다.
 */

// GA4 측정 ID
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// gtag 함수 타입 정의
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: any
    ) => void;
    dataLayer: any[];
  }
}

/**
 * Google Analytics 스크립트를 동적으로 로드합니다
 */
export const loadGoogleAnalytics = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) {
      resolve();
      return;
    }

    // 이미 로드된 경우 스킵
    if (window.gtag) {
      resolve();
      return;
    }

    try {
      // dataLayer 초기화
      window.dataLayer = window.dataLayer || [];
      
      // gtag 함수 정의
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };

      // 현재 시간 설정
      window.gtag('js', new Date());

      // GA4 스크립트 동적 로드
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      
      script.onload = () => {
        // GA4 초기 설정
        window.gtag('config', GA_MEASUREMENT_ID, {
          anonymize_ip: true,
          allow_google_signals: false,
          allow_ad_personalization_signals: false,
          cookie_flags: 'SameSite=Strict;Secure'
        });
        
        console.log('✅ Google Analytics 4 로드 완료');
        resolve();
      };
      
      script.onerror = () => {
        console.error('❌ Google Analytics 4 로드 실패');
        reject(new Error('GA4 스크립트 로드 실패'));
      };

      document.head.appendChild(script);
    } catch (error) {
      console.error('❌ Google Analytics 초기화 오류:', error);
      reject(error);
    }
  });
};

/**
 * 페이지뷰 이벤트를 전송합니다
 */
export const trackPageView = (path: string, title?: string): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_MEASUREMENT_ID) {
    return;
  }

  try {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title || document.title,
      page_location: window.location.href
    });

    console.log('📊 [GA4 페이지뷰]', { path, title });
  } catch (error) {
    console.error('❌ [GA4 페이지뷰 오류]', error);
  }
};

/**
 * 커스텀 이벤트를 전송합니다
 */
export const trackEvent = (
  eventName: string,
  parameters: Record<string, any> = {}
): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_MEASUREMENT_ID) {
    return;
  }

  try {
    // 개인정보 필터링
    const sanitizedParameters = sanitizeEventParameters(parameters);
    
    window.gtag('event', eventName, sanitizedParameters);

    console.log('📊 [GA4 이벤트]', { eventName, parameters: sanitizedParameters });
  } catch (error) {
    console.error('❌ [GA4 이벤트 오류]', error);
  }
};

/**
 * 사용자 속성을 설정합니다
 */
export const setUserProperties = (properties: Record<string, any>): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_MEASUREMENT_ID) {
    return;
  }

  try {
    const sanitizedProperties = sanitizeEventParameters(properties);
    
    window.gtag('set', 'user_properties', sanitizedProperties);

    console.log('📊 [GA4 사용자 속성]', sanitizedProperties);
  } catch (error) {
    console.error('❌ [GA4 사용자 속성 오류]', error);
  }
};

/**
 * 이벤트 파라미터에서 개인정보를 제거합니다
 */
const sanitizeEventParameters = (parameters: Record<string, any>): Record<string, any> => {
  const sanitized = { ...parameters };

  // 개인정보 패턴 제거
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitized[key]
        .replace(/\b\d{3}-\d{4}-\d{4}\b/g, '[PHONE]')
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
        .replace(/\b\d{6}-\d{7}\b/g, '[ID]');
    }
  });

  return sanitized;
};

/**
 * GA4가 활성화되어 있는지 확인합니다
 */
export const isGoogleAnalyticsEnabled = (): boolean => {
  return !!(
    typeof window !== 'undefined' &&
    window.gtag &&
    GA_MEASUREMENT_ID &&
    process.env.NODE_ENV === 'production'
  );
};

/**
 * 개발 환경에서 GA4 이벤트를 시뮬레이션합니다
 */
export const simulateEvent = (eventName: string, parameters: Record<string, any> = {}): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🧪 [GA4 시뮬레이션]', {
      event: eventName,
      parameters,
      timestamp: new Date().toISOString()
    });
  }
};