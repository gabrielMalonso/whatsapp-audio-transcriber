import type { ProgressStage, TranscriptionResult } from '@wat/protocol';

export type ProgressCallback = (stage: ProgressStage) => void;

export interface TranscriptionProvider {
  transcribe(
    audio: Blob,
    language: string | null,
    signal: AbortSignal,
    onProgress: ProgressCallback,
  ): Promise<TranscriptionResult>;
}

export type GroqStatus = {
  configured: boolean;
  healthy: boolean;
  message: string;
  transcriptionModel: string;
  formattingModel: string;
};

export type GroqConfigurationResponse = GroqStatus & {
  saved: boolean;
};
