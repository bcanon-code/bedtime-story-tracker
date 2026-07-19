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

