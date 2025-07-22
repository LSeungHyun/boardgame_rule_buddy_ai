/**
 * UI 컴포넌트 통합 내보내기
 * 모든 UI 컴포넌트를 카테고리별로 정리하여 내보냄
 */

// ===== 카테고리별 컴포넌트 =====

// 기본 UI 컴포넌트 (Shadcn UI 기반)
export * from './base';

// 게임 관련 컴포넌트
export * from './game';

// 레이아웃 컴포넌트
export * from './layout';

// 인터랙티브 컴포넌트
export * from './interactive';

// 폼 관련 컴포넌트
export * from './forms';

// ===== 직접 내보내기 (카테고리 미분류) =====

// 아직 카테고리에 포함되지 않은 컴포넌트들을 직접 내보내기
// 이 컴포넌트들은 향후 적절한 카테고리로 이동 예정

// 기본 UI (아직 base에 포함되지 않은 것들)
export { Button, buttonVariants } from './button';
export { Input } from './input';
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
export { Badge } from './badge';
export { Avatar, AvatarFallback, AvatarImage } from './avatar';
export { Separator } from './separator';
export { Label } from './label';
export { Textarea } from './textarea';
export { Skeleton } from './skeleton';
export { Progress } from './progress';
export { Checkbox } from './checkbox';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './dropdown-menu';
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
export { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './sheet';
export { toast, useToast } from './toast';
export { Toaster } from './toaster';

// 게임 관련
export { GameQuickActions } from './game-quick-actions';
export { QuestionRecommendations } from './question-recommendations';
export { AnswerDisplay } from './answer-display';
export { ScoreCalculator } from './score-calculator';
export { ScoreInput } from './score-input';
export { SetupChecklist } from './setup-checklist';
export { GameSetupGuide } from './game-setup-guide';

// 레이아웃
export { MobileNavigation } from './mobile-navigation';
export { ResponsiveContainer } from './responsive-container';
export { LoadingStates } from './loading-states';
export { GameSelectionSuspense, ChatScreenSuspense, DebugPageSuspense } from './suspense-wrapper';

// 인터랙티브
export { InteractiveDiagram } from './interactive-diagram';
export { VisualDiagram } from './visual-diagram';
export { DiagramTemplates } from './diagram-templates';
export { InteractiveBoardLayout } from './interactive-board-layout';
export { AccordionSection } from './accordion-section';

// 폼
export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField } from './form';
export { FileUpload } from './file-upload';