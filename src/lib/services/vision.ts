import type { Food } from "@/lib/types";

/**
 * Photo meal recognition — interface only, deliberately not implemented.
 *
 * A believable-looking guess is worse than no guess in a nutrition log, so this ships as an
 * explicit "not configured" implementation rather than a mock. To enable it, drop in a client
 * that calls a vision model (server route or on-device) and returns candidates with real
 * confidences; the UI already handles the confirm-before-log flow through `source: "ai"`.
 */

export interface RecognisedItem {
  label: string;
  confidence: number; // 0..1
  suggestedFoodId?: string;
  estimatedGrams?: number;
}

export interface VisionProvider {
  readonly available: boolean;
  recognise(image: Blob, foods: Food[]): Promise<RecognisedItem[]>;
}

export const nullVisionProvider: VisionProvider = {
  available: false,
  async recognise() {
    throw new Error("No vision provider is configured. See src/lib/services/vision.ts.");
  },
};

let provider: VisionProvider = nullVisionProvider;

export function setVisionProvider(next: VisionProvider) {
  provider = next;
}

export function getVisionProvider(): VisionProvider {
  return provider;
}
