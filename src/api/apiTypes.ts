export interface ChildDto {
  id: number;
  name: string;
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
  childObservations: ReadingSessionChildObservationDto[];
}
