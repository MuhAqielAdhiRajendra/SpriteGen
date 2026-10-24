export type SpriteResolution = 32 | 64 | 128;

export type CharacterArchetype = 
  | 'knight'
  | 'mage'
  | 'cyberpunk'
  | 'rogue'
  | 'mecha'
  | 'archer'
  | 'monster'
  | 'paladin';

export type CharacterDirection = 'front' | 'side' | 'isometric' | 'back';

export type AnimationType = 'idle' | 'walk' | 'attack' | 'hurt';

export interface SpriteEvaluation {
  adherenceScore: number; // 0-100
  silhouetteScore: number; // 0-100
  paletteHarmonyScore: number; // 0-100
  overallQuality: 'exceptional' | 'approved' | 'needs_refinement';
  verdict: string;
  critique: string;
  detectedFeatures: string[];
  missingFeatures: string[];
  suggestedFixes: string[];
  inspectedAt: string;
}

export interface PipelineStep {
  id: string;
  phase: 'parse' | 'palette' | 'silhouette' | 'shading' | 'review' | 'refine' | 'export';
  title: string;
  description: string;
  timestamp: string;
  durationMs: number;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error';
  tokenCount?: number;
  details?: Record<string, any>;
  intermediatePreview?: string[][];
}

export interface CharacterSprite {
  id: string;
  name: string;
  prompt: string;
  resolution: SpriteResolution;
  paletteName: string;
  palette: string[];
  archetype: CharacterArchetype;
  direction: CharacterDirection;
  frames: Record<AnimationType, string[][][]>;
  currentPixels: string[][];
  aiEvaluation: SpriteEvaluation;
  pipelineLogs: PipelineStep[];
  providerUsed: string;
  modelUsed: string;
  createdAt: string;
}

export type AIProviderType = 'gemini' | 'ollama' | 'omniroute' | 'mcp' | 'custom';

export interface AIProviderConfig {
  id: string;
  type: AIProviderType;
  name: string;
  description: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  temperature: number;
  headers?: Record<string, string>;
  mcpToolName?: string;
  isAvailable?: boolean;
  latencyMs?: number;
  lastTestedAt?: string;
}

export interface GenerationRequest {
  prompt: string;
  resolution: SpriteResolution;
  paletteName: string;
  archetype: CharacterArchetype;
  direction: CharacterDirection;
  providerConfig: AIProviderConfig;
  autoRefine: boolean;
}
