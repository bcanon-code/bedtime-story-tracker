export interface ChildDto {
  id: string;
  name: string;
}

export interface StorySummaryDto {
  id: string;
  title: string;
  theme: string;
  summary: string;
  readingMinutes: number;
}

export interface StoryDetailDto extends StorySummaryDto {
  paragraphs: string[];
}

export interface CreateReadingSessionRequest {
  storyId: string;
  elapsedSeconds: number;
  beforeNotes?: string;
  afterNotes?: string;
  childObservations: {
    childId: string;
    beforeCalmness: number;
    afterCalmness: number;
  }[];
}

export interface CreateReadingSessionResponse {
  sessionId: number;
  savedAtUtc: string;
  storyTitle: string;
  elapsedSeconds: number;
}
