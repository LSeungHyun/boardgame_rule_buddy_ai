import { supabase } from '@/lib/supabase';
import { Game } from '@/types/game';
import { isKoreanSearchMatch } from '@/lib/utils';

export interface GameFilters {
    searchTerm?: string;
}

export const fetchGames = async (filters?: GameFilters): Promise<Game[]> => {
    let query = supabase
        .from('games')
        .select('*')
        .not('game_id', 'is', null)
        .order('game_id', { ascending: true });

    const { data, error } = await query;

    if (error) {
        console.error('게임 데이터 가져오기 실패:', error);
        throw new Error(`게임 데이터를 가져올 수 없습니다: ${error.message}`);
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
    if (filters?.searchTerm) {
        games = games.filter(game =>
            isKoreanSearchMatch(filters.searchTerm!, game.title) ||
            (game.publisher && isKoreanSearchMatch(filters.searchTerm!, game.publisher))
        );
    }

    return games;
};

export const fetchGameById = async (gameId: number): Promise<Game | null> => {
    const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('game_id', gameId)
        .single();

    if (error) {
        console.error('게임 조회 실패:', error);
        return null;
    }

    if (!data) return null;

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
};

export const searchGames = async (searchTerm: string): Promise<Game[]> => {
    return fetchGames({ searchTerm });
}; 