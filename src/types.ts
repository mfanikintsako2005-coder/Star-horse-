export type VideoStyle = '2D Anime' | '3D Pixar-style' | 'Classic Comic';
export type AspectRatio = '9:16' | '16:9' | string;
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface VideoJob {
  id: string;
  userId: string;
  prompt: string;
  style: VideoStyle;
  aspectRatio: AspectRatio;
  status: JobStatus;
  videoUrl?: string;
  previewUrl?: string;
  error?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  falRequestId?: string;
  progress?: number;
  logs?: string[];
}
