/**
 * 의존성 주입 컨테이너
 * Clean Architecture - Infrastructure Layer
 */

import { GeminiAdapter } from '../ai/adapters/gemini-adapter';
import { AIOrchestrator } from '../ai/orchestrators/ai-orchestrator';
import { DefaultGameCategoryInferenceService } from '@/domain/services/game-category-inference.service';
import { GameRepositoryAdapter } from '@/adapters/game-repository-adapter';
import { ConversationContextSystem } from '@/lib/conversation-context-system';
import { PerformanceMonitor } from '../monitoring/performance-monitor';

interface ServiceFactory<T> {
  create(): T;
  singleton?: boolean;
}

class DIContainer {
  private static instance: DIContainer;
  private services: Map<string, any> = new Map();
  private factories: Map<string, ServiceFactory<any>> = new Map();

  private constructor() {
    this.registerDefaultServices();
  }

  public static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * 기본 서비스들을 등록합니다.
   */
  private registerDefaultServices(): void {
    // AI Services
    this.register('GeminiAdapter', {
      create: () => new GeminiAdapter(),
      singleton: true
    });

    this.register('AIOrchestrator', {
      create: () => new AIOrchestrator(this.get('GeminiAdapter')),
      singleton: true
    });

    // Domain Services
    this.register('GameCategoryInferenceService', {
      create: () => new DefaultGameCategoryInferenceService(),
      singleton: true
    });

    // Repository Adapters
    this.register('GameRepositoryAdapter', {
      create: () => new GameRepositoryAdapter(this.get('GameCategoryInferenceService')),
      singleton: true
    });

    // Context Systems
    this.register('ConversationContextSystem', {
      create: () => ConversationContextSystem.getInstance(),
      singleton: true
    });

    // Monitoring Systems
    this.register('PerformanceMonitor', {
      create: () => PerformanceMonitor.getInstance(),
      singleton: true
    });
  }

  /**
   * 서비스를 등록합니다.
   */
  public register<T>(name: string, factory: ServiceFactory<T>): void {
    this.factories.set(name, factory);
    
    // 싱글톤이 아닌 경우 기존 인스턴스 제거
    if (!factory.singleton) {
      this.services.delete(name);
    }
  }

  /**
   * 서비스를 조회합니다.
   */
  public get<T>(name: string): T {
    const factory = this.factories.get(name);
    
    if (!factory) {
      throw new Error(`Service '${name}' is not registered`);
    }

    // 싱글톤인 경우 기존 인스턴스 반환
    if (factory.singleton) {
      if (!this.services.has(name)) {
        this.services.set(name, factory.create());
      }
      return this.services.get(name);
    }

    // 싱글톤이 아닌 경우 새 인스턴스 생성
    return factory.create();
  }

  /**
   * 서비스 등록을 해제합니다.
   */
  public unregister(name: string): void {
    this.factories.delete(name);
    this.services.delete(name);
  }

  /**
   * 모든 서비스를 초기화합니다 (테스트용).
   */
  public clear(): void {
    this.services.clear();
    this.factories.clear();
    this.registerDefaultServices();
  }

  /**
   * 목 서비스를 등록합니다 (테스트용).
   */
  public registerMock<T>(name: string, mockInstance: T): void {
    this.register(name, {
      create: () => mockInstance,
      singleton: true
    });
  }

  /**
   * 등록된 서비스 목록을 반환합니다.
   */
  public getRegisteredServices(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * 서비스가 등록되어 있는지 확인합니다.
   */
  public isRegistered(name: string): boolean {
    return this.factories.has(name);
  }
}

export default DIContainer; 