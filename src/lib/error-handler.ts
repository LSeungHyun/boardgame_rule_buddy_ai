/**
 * 애플리케이션 에러 타입 정의
 */
export enum ErrorType {
    NETWORK = 'NETWORK',
    DATABASE = 'DATABASE',
    VALIDATION = 'VALIDATION',
    API = 'API',
    UNKNOWN = 'UNKNOWN'
}

/**
 * 구조화된 에러 클래스
 */
export class AppError extends Error {
    public readonly type: ErrorType;
    public readonly code?: string;
    public readonly statusCode?: number;
    public readonly context?: Record<string, unknown>;

    constructor(
        message: string,
        type: ErrorType = ErrorType.UNKNOWN,
        code?: string,
        statusCode?: number,
        context?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'AppError';
        this.type = type;
        this.code = code;
        this.statusCode = statusCode;
        this.context = context;
    }
}

/**
 * 에러 로깅 인터페이스
 */
interface ErrorLogger {
    error: (message: string, context?: Record<string, unknown>) => void;
    warn: (message: string, context?: Record<string, unknown>) => void;
}

/**
 * 개발 환경용 콘솔 로거
 */
const consoleLogger: ErrorLogger = {
    error: (message: string, context?: Record<string, unknown>) => {
        console.error(`[ERROR] ${message}`, context ? { context } : '');
    },
    warn: (message: string, context?: Record<string, unknown>) => {
        console.warn(`[WARN] ${message}`, context ? { context } : '');
    }
};

/**
 * 현재 환경에 적합한 로거 선택
 */
const logger: ErrorLogger = consoleLogger; // 추후 운영환경용 로거로 교체 가능

/**
 * 안전한 에러 핸들링 유틸리티
 */
export const errorHandler = {
    /**
     * 에러를 안전하게 처리하고 로깅합니다
     */
    handle: (error: unknown, context?: Record<string, unknown>): AppError => {
        if (error instanceof AppError) {
            logger.error(error.message, { ...error.context, ...context });
            return error;
        }

        if (error instanceof Error) {
            const appError = new AppError(
                error.message,
                ErrorType.UNKNOWN,
                undefined,
                undefined,
                context
            );
            logger.error(appError.message, appError.context);
            return appError;
        }

        const unknownError = new AppError(
            '알 수 없는 오류가 발생했습니다',
            ErrorType.UNKNOWN,
            undefined,
            undefined,
            { originalError: error, ...context }
        );
        logger.error(unknownError.message, unknownError.context);
        return unknownError;
    },

    /**
     * 네트워크 관련 에러 생성
     */
    network: (message: string, statusCode?: number, context?: Record<string, unknown>): AppError => {
        return new AppError(message, ErrorType.NETWORK, 'NETWORK_ERROR', statusCode, context);
    },

    /**
     * 데이터베이스 관련 에러 생성
     */
    database: (message: string, code?: string, context?: Record<string, unknown>): AppError => {
        return new AppError(message, ErrorType.DATABASE, code, undefined, context);
    },

    /**
     * API 관련 에러 생성
     */
    api: (message: string, statusCode?: number, context?: Record<string, unknown>): AppError => {
        return new AppError(message, ErrorType.API, 'API_ERROR', statusCode, context);
    },

    /**
     * 사용자 친화적 에러 메시지 생성
     */
    getUserMessage: (error: AppError): string => {
        switch (error.type) {
            case ErrorType.NETWORK:
                return '네트워크 연결을 확인해주세요.';
            case ErrorType.DATABASE:
                return '데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.';
            case ErrorType.API:
                return '서비스에 일시적인 문제가 발생했습니다.';
            case ErrorType.VALIDATION:
                return error.message; // 검증 에러는 사용자에게 직접 표시
            default:
                return '문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
        }
    }
}; 