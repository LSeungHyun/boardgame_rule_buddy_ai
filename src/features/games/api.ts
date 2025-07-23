import { supabase } from '@/lib/supabase';
import { Game } from '@/types/game';
import { isKoreanSearchMatch } from '@/lib/utils';
import { errorHandler, ErrorType } from '@/lib/error-handler';

export interface GameFilters {
    searchTerm?: string;
    limit?: number; // 검색 결과 제한
}

// 성능 최적화를 위한 상수
const DEFAULT_SEARCH_LIMIT = 50; // 기본 검색 결과 제한
const MIN_SEARCH_LENGTH = 1; // 최소 검색어 길이

export const fetchGames = async (filters?: GameFilters): Promise<Game[]> => {
    try {
        // 검색어가 너무 짧으면 빈 배열 반환 (성능 최적화)
        if (filters?.searchTerm && filters.searchTerm.trim().length < MIN_SEARCH_LENGTH) {
            return [];
        }

        let query = supabase
            .from('games')
            .select('*')
            .not('game_id', 'is', null)
            .order('game_id', { ascending: true });

        const { data, error } = await query;

        if (error) {
            throw errorHandler.database(
                '게임 데이터를 가져올 수 없습니다',
                error.code,
                { originalError: error, filters }
            );
        }

        // Supabase 데이터를 Game 인터페이스에 맞게 변환
        let games = (data || []).map((game) => ({
            id: game.game_id.toString(),
            gameId: game.game_id,
            title: game.title,
            difficulty: game.difficulty,
            description: game.description || '',
            imageUrl: `https://picsum.photos/400/300?random=${game.game_id}`,
            publisher: game.publisher || '',
            isActive: true,
            createdAt: game.created_at,
        }));

        // 클라이언트 사이드에서 초성 검색 필터링
        if (filters?.searchTerm && filters.searchTerm.trim().length >= MIN_SEARCH_LENGTH) {
            const searchTerm = filters.searchTerm.trim();

            games = games.filter(game =>
                isKoreanSearchMatch(searchTerm, game.title) ||
                (game.publisher && isKoreanSearchMatch(searchTerm, game.publisher))
            );

            // 🚀 성능 최적화: 검색 결과 제한
            const limit = filters.limit || DEFAULT_SEARCH_LIMIT;
            games = games.slice(0, limit);

            console.log(`🔍 [검색 최적화] "${searchTerm}" 검색 결과: ${games.length}개 (제한: ${limit}개)`);
        }

        return games;
    } catch (error) {
        // 이미 AppError인 경우 그대로 throw, 아닌 경우 변환
        throw errorHandler.handle(error, { function: 'fetchGames', filters });
    }
};

export const fetchGameById = async (gameId: number): Promise<Game | null> => {
    try {
        const { data, error } = await supabase
            .from('games')
            .select('*')
            .eq('game_id', gameId)
            .single();

        if (error) {
            throw errorHandler.database(
                '게임 정보를 조회할 수 없습니다',
                error.code,
                { gameId, originalError: error }
            );
        }

        if (!data) {
            return null;
        }

        return {
            id: data.game_id.toString(),
            gameId: data.game_id,
            title: data.title,
            difficulty: data.difficulty,
            description: data.description || '',
            imageUrl: `https://picsum.photos/400/300?random=${data.game_id}`,
            publisher: data.publisher || '',
            isActive: true,
            createdAt: data.created_at,
        };
    } catch (error) {
        throw errorHandler.handle(error, { function: 'fetchGameById', gameId });
    }
};

export const searchGames = async (searchTerm: string, limit?: number): Promise<Game[]> => {
    return fetchGames({ searchTerm, limit });
};

/**
 * 게임명으로 정확히 일치하는 게임을 찾습니다.
 * 대소문자 구분 없이 검색하며, 공백을 제거하여 비교합니다.
 */
export const findGameByExactName = async (gameName: string): Promise<Game | null> => {
    try {
        const normalizedSearchName = gameName.trim().toLowerCase().replace(/\s+/g, '');

        // 모든 게임 목록을 가져옵니다 (캐싱 가능)
        const { data, error } = await supabase
            .from('games')
            .select('*')
            .not('game_id', 'is', null);

        if (error) {
            throw errorHandler.database(
                '게임 데이터를 조회할 수 없습니다',
                error.code,
                { gameName, originalError: error }
            );
        }

        if (!data || data.length === 0) {
            return null;
        }

        // 정확히 일치하는 게임 찾기 (대소문자, 공백 무시)
        const exactMatch = data.find(game => {
            const normalizedTitle = game.title.toLowerCase().replace(/\s+/g, '');
            return normalizedTitle === normalizedSearchName;
        });

        if (!exactMatch) {
            return null;
        }

        return {
            id: exactMatch.game_id.toString(),
            gameId: exactMatch.game_id,
            title: exactMatch.title,
            difficulty: exactMatch.difficulty,
            description: exactMatch.description || '',
            imageUrl: `https://picsum.photos/400/300?random=${exactMatch.game_id}`,
            publisher: exactMatch.publisher || '',
            isActive: true,
            createdAt: exactMatch.created_at,
        };
    } catch (error) {
        throw errorHandler.handle(error, { function: 'findGameByExactName', gameName });
    }
}; 