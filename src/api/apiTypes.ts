export interface ChildDto {
  id: number;
  name: string;
  displayOrder: number;
}

export interface ChildWriteRequest {
  name: string;
  displayOrder: number;
}

export interface StorySummaryDto {
  id: number;
  title: string;
  theme: string;
  summary: string;
  readingMinutes: number;
}

export interface StoryDetailDto extends StorySummaryDto {
  paragraphs: string[];
}

export interface CreateReadingSessionRequest {
  storyId: number;
  elapsedSeconds: number;
  beforeNotes?: string;
  afterNotes?: string;
  childObservations: {
    childId: number;
    beforeCalmness: number;
    afterCalmness: number;
  }[];
}

export interface CreateReadingSessionResponse {
  sessionId: number;
  savedAtUtc: string;
  storyTitle: string;
  elapsedSeconds: number;
  appVersion: string | null;
  buildNumber: number | null;
  gitSha: string | null;
  buildEnvironment: string | null;
}

export interface ReadingSessionChildObservationDto {
  childId: number;
  childName: string;
  beforeCalmness: number;
  afterCalmness: number;
  displayOrder: number;
}

export interface ReadingSessionHistoryDto {
  sessionId: number;
  completedAtUtc: string;
  storyId: number;
  storyTitle: string;
  elapsedSeconds: number;
  beforeNotes: string | null;
  afterNotes: string | null;
  appVersion: string | null;
  buildNumber: number | null;
  gitSha: string | null;
  buildEnvironment: string | null;
  childObservations: ReadingSessionChildObservationDto[];
}

export interface VersionResponse {
  version: string;
  build: number;
  gitSha: string;
  gitDirty: boolean;
  builtAtUtc: string | null;
  environment: string;
  displayVersion: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  database: {
    status: 'connected' | 'unavailable' | 'notConfigured';
    provider: string | null;
  };
}
