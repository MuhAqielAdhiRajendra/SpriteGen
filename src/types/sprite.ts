export type SpriteResolution = 32 | 64 | 128;

export type CharacterDirection = 'front' | 'side' | 'isometric' | 'back';

export type AnimationType = 'idle' | 'walk' | 'attack' | 'hurt';

export type ColorGradingMode = 'vibrant' | 'neon' | 'warm' | 'cool' | 'pastel';

/**
 * An independent cel frame containing its own distinct pixel grid matrix
 */
export interface SpriteFrame {
  id: string;
  name: string;
  pixels: string[][]; // Independent 2D array of pixel color strings
}

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

import type { CharacterSpec } from '../utils/pixelforgeSpec';

export interface CharacterSprite {
  id: string;
  name: string;
  prompt: string;
  resolution: SpriteResolution;
  paletteName: string;
  palette: string[];
  colorGrading: ColorGradingMode;
  direction: CharacterDirection;
  isAnimated: boolean;
  requestedAnimations: AnimationType[];
  fps: number;
  loop: boolean;
  activeAnimationKey: string;
  // All animation sequences containing independent frame-by-frame cels
  animations: Record<string, SpriteFrame[]>;
  // Active frame sequence being edited in timeline
  frames: SpriteFrame[];
  currentFrameIndex: number;
  currentPixels: string[][];
  aiEvaluation: SpriteEvaluation;
  pipelineLogs: PipelineStep[];
  providerUsed: string;
  modelUsed: string;
  createdAt: string;
  spec?: CharacterSpec;
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
  colorGrading?: ColorGradingMode;
  direction: CharacterDirection;
  requestedAnimations?: AnimationType[];
  providerConfig: AIProviderConfig;
  autoRefine: boolean;
  referenceImage?: {
    mimeType: string;
    data: string;
    previewUrl?: string;
    name?: string;
  };
}
