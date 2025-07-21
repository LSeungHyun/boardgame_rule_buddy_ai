// Score Calculator Types
export interface ScoreElement {
  id: string;
  name: string;
  value: number;
  category: string;
  description: string;
  multiplier?: number;
  isBonus?: boolean;
}

export interface ScoreCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  maxValue?: number;
}

export interface GameRules {
  gameId: string;
  gameName: string;
  categories: ScoreCategory[];
  scoringRules: ScoringRule[];
  bonusRules?: BonusRule[];
}

export interface ScoringRule {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  calculation: 'sum' | 'multiply' | 'set' | 'conditional';
  baseValue?: number;
  multiplier?: number;
  conditions?: ScoreCondition[];
}

export interface BonusRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  bonusValue: number;
  type: 'fixed' | 'multiplier' | 'percentage';
}

export interface ScoreCondition {
  field: string;
  operator: '>' | '<' | '=' | '>=' | '<=' | '!=';
  value: number;
  description: string;
}

export interface CalculationResult {
  totalScore: number;
  categoryScores: Record<string, number>;
  bonusScores: Record<string, number>;
  breakdown: ScoreBreakdown[];
  suggestions: string[];
}

export interface ScoreBreakdown {
  categoryId: string;
  categoryName: string;
  elements: ScoreElement[];
  subtotal: number;
  bonuses: number;
  total: number;
}

export interface ScoreHistory {
  id: string;
  timestamp: Date;
  gameId: string;
  playerName?: string;
  scoreElements: ScoreElement[];
  totalScore: number;
  notes?: string;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  changes: ScoreElement[];
  projectedScore: number;
  difference: number;
}

// Store State Types
export interface ScoreCalculatorState {
  // Current Game
  currentGame: GameRules | null;
  
  // Score Elements
  scoreElements: ScoreElement[];
  
  // Calculation Results
  currentResult: CalculationResult | null;
  
  // History
  history: ScoreHistory[];
  
  // Simulation
  simulationMode: boolean;
  simulationScenarios: SimulationScenario[];
  activeScenario: SimulationScenario | null;
  
  // UI State
  expandedCategories: string[];
  showBreakdown: boolean;
  
  // Actions
  setGame: (game: GameRules) => void;
  updateScoreElement: (element: ScoreElement) => void;
  removeScoreElement: (elementId: string) => void;
  calculateScore: () => void;
  saveToHistory: (playerName?: string, notes?: string) => void;
  toggleSimulationMode: () => void;
  createSimulationScenario: (name: string, changes: ScoreElement[]) => void;
  selectScenario: (scenarioId: string) => void;
  toggleCategory: (categoryId: string) => void;
  reset: () => void;
}