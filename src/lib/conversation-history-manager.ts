import { supabase } from './supabase';
import {
  ConversationContext,
  QuestionHistoryItem,
  DatabaseConversationSession,
  DatabaseQuestionHistory,
  InsertConversationSession,
  InsertQuestionHistory,
  UpdateConversationSession,
  SessionFilter,
  QuestionHistoryFilter,
  TopicChangeDetection
} from '@/types';

/**
 * 대화 히스토리 매니저
 * 세션별 대화 맥락과 질문 히스토리를 관리합니다.
 */
export class ConversationHistoryManager {
  private static instance: ConversationHistoryManager;
  private memoryCache = new Map<string, ConversationContext>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30분

  private constructor() {}

  static getInstance(): ConversationHistoryManager {
    if (!ConversationHistoryManager.instance) {
      ConversationHistoryManager.instance = new ConversationHistoryManager();
    }
    return ConversationHistoryManager.instance;
  }

  /**
   * 세션 컨텍스트 조회
   */
  async getContext(sessionId: string): Promise<ConversationContext | null> {
    try {
      // 1. 메모리 캐시 확인
      const cached = this.memoryCache.get(sessionId);
      if (cached && this.isCacheValid(cached)) {
        return cached;
      }

      // 2. 데이터베이스에서 세션 조회
      const { data: sessionData, error: sessionError } = await supabase
        .from('conversation_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        return null;
      }

      // 3. 질문 히스토리 조회
      const { data: historyData, error: historyError } = await supabase
        .from('question_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('turn_number', { ascending: true });

      if (historyError) {
        console.error('Failed to fetch question history:', historyError);
        return null;
      }

      // 4. 컨텍스트 구성
      const context: ConversationContext = {
        sessionId: sessionData.session_id,
        userId: sessionData.user_id || undefined,
        currentTopic: sessionData.current_topic || '',
        gameContext: sessionData.game_context || undefined,
        topicStartTurn: sessionData.topic_start_turn,
        questionHistory: (historyData || []).map(this.mapHistoryFromDb),
        lastUpdated: new Date(sessionData.updated_at)
      };

      // 5. 캐시에 저장
      this.memoryCache.set(sessionId, context);
      return context;

    } catch (error) {
      console.error('Error getting conversation context:', error);
      return null;
    }
  }

  /**
   * 세션 컨텍스트 업데이트
   */
  async updateContext(sessionId: string, item: QuestionHistoryItem): Promise<void> {
    try {
      // 1. 기존 컨텍스트 조회
      let context = await this.getContext(sessionId);
      
      if (!context) {
        // 새 세션 생성
        context = await this.createNewSession(sessionId, item);
      }

      // 2. 주제 변경 감지
      const topicChange = await this.detectTopicChange(item.question, context);
      
      // 3. 세션 업데이트
      const updateData: UpdateConversationSession = {
        current_topic: topicChange.hasChanged ? topicChange.newTopic : context.currentTopic,
        game_context: item.topic,
        topic_start_turn: topicChange.hasChanged ? item.turnNumber : context.topicStartTurn
      };

      const { error: sessionError } = await supabase
        .from('conversation_sessions')
        .update(updateData)
        .eq('session_id', sessionId);

      if (sessionError) {
        throw new Error(`Failed to update session: ${sessionError.message}`);
      }

      // 4. 질문 히스토리 추가
      const historyData: InsertQuestionHistory = {
        session_id: sessionId,
        turn_number: item.turnNumber,
        question: item.question,
        answer: item.answer,
        topic: item.topic,
        confidence: item.confidence,
        was_researched: item.wasResearched,
        context_analysis: item.contextAnalysis,
        intent_analysis: item.intentAnalysis
      };

      const { error: historyError } = await supabase
        .from('question_history')
        .insert(historyData);

      if (historyError) {
        throw new Error(`Failed to insert question history: ${historyError.message}`);
      }

      // 5. 메모리 캐시 업데이트
      context.questionHistory.push(item);
      context.currentTopic = updateData.current_topic || context.currentTopic;
      context.gameContext = updateData.game_context || context.gameContext;
      context.topicStartTurn = updateData.topic_start_turn || context.topicStartTurn;
      context.lastUpdated = new Date();
      
      this.memoryCache.set(sessionId, context);

    } catch (error) {
      console.error('Error updating conversation context:', error);
      throw error;
    }
  }

  /**
   * 주제 전환 감지
   */
  async detectTopicChange(newQuestion: string, context: ConversationContext): Promise<TopicChangeDetection> {
    try {
      // 간단한 키워드 기반 주제 감지
      const gameKeywords = ['아크노바', '윙스팬', '테라포밍', '글룸헤이븐', '스피릿 아일랜드'];
      const currentTopic = context.currentTopic.toLowerCase();
      
      for (const keyword of gameKeywords) {
        if (newQuestion.includes(keyword) && !currentTopic.includes(keyword.toLowerCase())) {
          return {
            hasChanged: true,
            newTopic: keyword,
            confidence: 0.8,
            reason: `새로운 게임 키워드 감지: ${keyword}`
          };
        }
      }

      // 질문 패턴 변화 감지
      const recentQuestions = context.questionHistory.slice(-3).map(h => h.question);
      if (recentQuestions.length >= 2) {
        const topicWords = this.extractTopicWords(newQuestion);
        const recentTopicWords = recentQuestions.flatMap(q => this.extractTopicWords(q));
        
        const overlap = topicWords.filter(word => recentTopicWords.includes(word));
        if (overlap.length === 0 && topicWords.length > 0) {
          return {
            hasChanged: true,
            newTopic: topicWords[0],
            confidence: 0.6,
            reason: '질문 주제 패턴 변화 감지'
          };
        }
      }

      return {
        hasChanged: false,
        newTopic: context.currentTopic,
        confidence: 0.9,
        reason: '주제 연속성 유지'
      };

    } catch (error) {
      console.error('Error detecting topic change:', error);
      return {
        hasChanged: false,
        newTopic: context.currentTopic,
        confidence: 0.5,
        reason: '주제 감지 오류'
      };
    }
  }

  /**
   * 관련 히스토리 조회
   */
  async getRelevantHistory(sessionId: string, currentQuestion: string, limit = 5): Promise<QuestionHistoryItem[]> {
    try {
      const context = await this.getContext(sessionId);
      if (!context || context.questionHistory.length === 0) {
        return [];
      }

      // 키워드 기반 관련성 계산
      const questionKeywords = this.extractTopicWords(currentQuestion);
      const scoredHistory = context.questionHistory.map(item => ({
        item,
        score: this.calculateRelevanceScore(questionKeywords, item)
      }));

      // 관련성 점수로 정렬하고 상위 항목 반환
      return scoredHistory
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .filter(scored => scored.score > 0.3)
        .map(scored => scored.item);

    } catch (error) {
      console.error('Error getting relevant history:', error);
      return [];
    }
  }

  /**
   * 세션 생성
   */
  private async createNewSession(sessionId: string, firstItem: QuestionHistoryItem): Promise<ConversationContext> {
    const sessionData: InsertConversationSession = {
      session_id: sessionId,
      current_topic: firstItem.topic,
      game_context: firstItem.topic,
      topic_start_turn: 1
    };

    const { error } = await supabase
      .from('conversation_sessions')
      .insert(sessionData);

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return {
      sessionId,
      currentTopic: firstItem.topic,
      gameContext: firstItem.topic,
      topicStartTurn: 1,
      questionHistory: [],
      lastUpdated: new Date()
    };
  }

  /**
   * 주제 단어 추출
   */
  private extractTopicWords(text: string): string[] {
    const keywords = [
      '아크노바', '윙스팬', '테라포밍', '글룸헤이븐', '스피릿',
      '카드', '액션', '자원', '점수', '라운드', '턴', '규칙',
      '코뿔소', '새', '식물', '화성', '몬스터', '영혼'
    ];

    return keywords.filter(keyword => text.includes(keyword));
  }

  /**
   * 관련성 점수 계산
   */
  private calculateRelevanceScore(questionKeywords: string[], historyItem: QuestionHistoryItem): number {
    const historyKeywords = this.extractTopicWords(historyItem.question + ' ' + historyItem.answer);
    const commonKeywords = questionKeywords.filter(kw => historyKeywords.includes(kw));
    
    if (commonKeywords.length === 0) return 0;
    
    const keywordScore = commonKeywords.length / Math.max(questionKeywords.length, historyKeywords.length);
    const recencyScore = Math.max(0, 1 - (Date.now() - historyItem.timestamp.getTime()) / (24 * 60 * 60 * 1000));
    const confidenceScore = historyItem.confidence;
    
    return (keywordScore * 0.5) + (recencyScore * 0.3) + (confidenceScore * 0.2);
  }

  /**
   * 데이터베이스 히스토리를 도메인 객체로 변환
   */
  private mapHistoryFromDb(dbHistory: DatabaseQuestionHistory): QuestionHistoryItem {
    return {
      id: dbHistory.id,
      sessionId: dbHistory.session_id,
      turnNumber: dbHistory.turn_number,
      question: dbHistory.question,
      answer: dbHistory.answer,
      topic: dbHistory.topic || '',
      confidence: dbHistory.confidence,
      wasResearched: dbHistory.was_researched,
      contextAnalysis: dbHistory.context_analysis,
      intentAnalysis: dbHistory.intent_analysis,
      timestamp: new Date(dbHistory.created_at)
    };
  }

  /**
   * 캐시 유효성 검사
   */
  private isCacheValid(context: ConversationContext): boolean {
    const now = Date.now();
    const cacheTime = context.lastUpdated.getTime();
    return (now - cacheTime) < this.CACHE_TTL;
  }

  /**
   * 캐시 정리
   */
  public clearExpiredCache(): void {
    const now = Date.now();
    for (const [sessionId, context] of this.memoryCache.entries()) {
      if ((now - context.lastUpdated.getTime()) > this.CACHE_TTL) {
        this.memoryCache.delete(sessionId);
      }
    }
  }

  /**
   * 세션 통계 조회
   */
  async getSessionStats(filter?: SessionFilter) {
    try {
      let query = supabase
        .from('conversation_sessions')
        .select('*');

      if (filter?.userId) {
        query = query.eq('user_id', filter.userId);
      }
      if (filter?.gameContext) {
        query = query.eq('game_context', filter.gameContext);
      }
      if (filter?.dateRange) {
        query = query
          .gte('created_at', filter.dateRange.start)
          .lte('created_at', filter.dateRange.end);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        totalSessions: data?.length || 0,
        activeSessions: this.memoryCache.size,
        cacheHitRate: this.calculateCacheHitRate()
      };

    } catch (error) {
      console.error('Error getting session stats:', error);
      return null;
    }
  }

  private calculateCacheHitRate(): number {
    // 간단한 캐시 히트율 계산 (실제 구현에서는 더 정교한 추적 필요)
    return this.memoryCache.size > 0 ? 0.75 : 0;
  }
}