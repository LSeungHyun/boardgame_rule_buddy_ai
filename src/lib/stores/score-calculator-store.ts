import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  ScoreCalculatorState, 
  ScoreElement, 
  GameRules, 
  CalculationResult,
  ScoreHistory,
  SimulationScenario,
  ScoreBreakdown
} from '@/types/score-calculator';

// Score calculation engine
function calculateScore(
  scoreElements: ScoreElement[], 
  gameRules: GameRules
): CalculationResult {
  const categoryScores: Record<string, number> = {};
  const bonusScores: Record<string, number> = {};
  const breakdown: ScoreBreakdown[] = [];
  
  // Initialize category scores
  gameRules.categories.forEach(category => {
    categoryScores[category.id] = 0;
  });
  
  // Calculate category scores
  gameRules.categories.forEach(category => {
    const categoryElements = scoreElements.filter(el => el.category === category.id);
    const categoryRules = gameRules.scoringRules.filter(rule => rule.categoryId === category.id);
    
    let categoryTotal = 0;
    let categoryBonuses = 0;
    
    // Apply scoring rules
    categoryRules.forEach(rule => {
      const relevantElements = categoryElements.filter(el => 
        el.name.toLowerCase().includes(rule.name.toLowerCase()) ||
        el.description.toLowerCase().includes(rule.name.toLowerCase())
      );
      
      relevantElements.forEach(element => {
        let elementScore = element.value;
        
        switch (rule.calculation) {
          case 'multiply':
            elementScore *= (rule.multiplier || 1);
            break;
          case 'set':
            elementScore = rule.baseValue || element.value;
            break;
          case 'conditional':
            if (rule.conditions) {
              const conditionMet = rule.conditions.every(condition => {
                switch (condition.operator) {
                  case '>': return element.value > condition.value;
                  case '<': return element.value < condition.value;
                  case '=': return element.value === condition.value;
                  case '>=': return element.value >= condition.value;
                  case '<=': return element.value <= condition.value;
                  case '!=': return element.value !== condition.value;
                  default: return false;
                }
              });
              if (conditionMet) {
                elementScore *= (rule.multiplier || 1);
              }
            }
            break;
          default: // 'sum'
            break;
        }
        
        if (element.isBonus) {
          categoryBonuses += elementScore;
        } else {
          categoryTotal += elementScore;
        }
      });
    });
    
    // Apply bonus rules
    if (gameRules.bonusRules) {
      gameRules.bonusRules.forEach(bonusRule => {
        // Simple bonus rule evaluation (can be extended)
        if (categoryTotal > 0) {
          let bonusValue = 0;
          switch (bonusRule.type) {
            case 'fixed':
              bonusValue = bonusRule.bonusValue;
              break;
            case 'multiplier':
              bonusValue = categoryTotal * bonusRule.bonusValue;
              break;
            case 'percentage':
              bonusValue = categoryTotal * (bonusRule.bonusValue / 100);
              break;
          }
          categoryBonuses += bonusValue;
          bonusScores[bonusRule.id] = bonusValue;
        }
      });
    }
    
    categoryScores[category.id] = categoryTotal + categoryBonuses;
    
    breakdown.push({
      categoryId: category.id,
      categoryName: category.name,
      elements: categoryElements,
      subtotal: categoryTotal,
      bonuses: categoryBonuses,
      total: categoryTotal + categoryBonuses
    });
  });
  
  const totalScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0);
  
  // Generate suggestions
  const suggestions = generateSuggestions(breakdown, gameRules);
  
  return {
    totalScore,
    categoryScores,
    bonusScores,
    breakdown,
    suggestions
  };
}

function generateSuggestions(breakdown: ScoreBreakdown[], gameRules: GameRules): string[] {
  const suggestions: string[] = [];
  
  breakdown.forEach(category => {
    const categoryRule = gameRules.categories.find(c => c.id === category.categoryId);
    if (categoryRule?.maxValue && category.total < categoryRule.maxValue * 0.7) {
      suggestions.push(`${category.categoryName}에서 더 많은 점수를 얻을 수 있습니다.`);
    }
    
    if (category.elements.length === 0) {
      suggestions.push(`${category.categoryName} 카테고리에 점수를 추가해보세요.`);
    }
  });
  
  return suggestions;
}

export const useScoreCalculatorStore = create<ScoreCalculatorState>()(
  persist(
    (set, get) => ({
      // Initial State
      currentGame: null,
      scoreElements: [],
      currentResult: null,
      history: [],
      simulationMode: false,
      simulationScenarios: [],
      activeScenario: null,
      expandedCategories: [],
      showBreakdown: false,
      
      // Actions
      setGame: (game: GameRules) => {
        set({ 
          currentGame: game,
          scoreElements: [],
          currentResult: null,
          simulationScenarios: [],
          activeScenario: null
        });
      },
      
      updateScoreElement: (element: ScoreElement) => {
        const { scoreElements, currentGame } = get();
        const existingIndex = scoreElements.findIndex(el => el.id === element.id);
        
        let newElements: ScoreElement[];
        if (existingIndex >= 0) {
          newElements = [...scoreElements];
          newElements[existingIndex] = element;
        } else {
          newElements = [...scoreElements, element];
        }
        
        set({ scoreElements: newElements });
        
        // Auto-calculate if game is set
        if (currentGame) {
          const result = calculateScore(newElements, currentGame);
          set({ currentResult: result });
        }
      },
      
      removeScoreElement: (elementId: string) => {
        const { scoreElements, currentGame } = get();
        const newElements = scoreElements.filter(el => el.id !== elementId);
        
        set({ scoreElements: newElements });
        
        if (currentGame) {
          const result = calculateScore(newElements, currentGame);
          set({ currentResult: result });
        }
      },
      
      calculateScore: () => {
        const { scoreElements, currentGame } = get();
        if (!currentGame) return;
        
        const result = calculateScore(scoreElements, currentGame);
        set({ currentResult: result });
      },
      
      saveToHistory: (playerName?: string, notes?: string) => {
        const { scoreElements, currentResult, currentGame, history } = get();
        if (!currentResult || !currentGame) return;
        
        const historyEntry: ScoreHistory = {
          id: Date.now().toString(),
          timestamp: new Date(),
          gameId: currentGame.gameId,
          playerName,
          scoreElements: [...scoreElements],
          totalScore: currentResult.totalScore,
          notes
        };
        
        set({ history: [historyEntry, ...history] });
      },
      
      toggleSimulationMode: () => {
        set(state => ({ simulationMode: !state.simulationMode }));
      },
      
      createSimulationScenario: (name: string, changes: ScoreElement[]) => {
        const { scoreElements, currentGame, simulationScenarios } = get();
        if (!currentGame) return;
        
        const modifiedElements = [...scoreElements];
        changes.forEach(change => {
          const existingIndex = modifiedElements.findIndex(el => el.id === change.id);
          if (existingIndex >= 0) {
            modifiedElements[existingIndex] = change;
          } else {
            modifiedElements.push(change);
          }
        });
        
        const projectedResult = calculateScore(modifiedElements, currentGame);
        const currentTotal = get().currentResult?.totalScore || 0;
        
        const scenario: SimulationScenario = {
          id: Date.now().toString(),
          name,
          description: `${changes.length}개 요소 변경`,
          changes,
          projectedScore: projectedResult.totalScore,
          difference: projectedResult.totalScore - currentTotal
        };
        
        set({ 
          simulationScenarios: [...simulationScenarios, scenario],
          activeScenario: scenario
        });
      },
      
      selectScenario: (scenarioId: string) => {
        const { simulationScenarios } = get();
        const scenario = simulationScenarios.find(s => s.id === scenarioId);
        set({ activeScenario: scenario || null });
      },
      
      toggleCategory: (categoryId: string) => {
        const { expandedCategories } = get();
        const isExpanded = expandedCategories.includes(categoryId);
        
        if (isExpanded) {
          set({ expandedCategories: expandedCategories.filter(id => id !== categoryId) });
        } else {
          set({ expandedCategories: [...expandedCategories, categoryId] });
        }
      },
      
      reset: () => {
        set({
          scoreElements: [],
          currentResult: null,
          simulationScenarios: [],
          activeScenario: null,
          simulationMode: false,
          expandedCategories: [],
          showBreakdown: false
        });
      }
    }),
    {
      name: 'score-calculator-storage',
      partialize: (state) => ({
        history: state.history,
        expandedCategories: state.expandedCategories
      })
    }
  )
);