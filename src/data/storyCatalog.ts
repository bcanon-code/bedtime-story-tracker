export interface Story {
  id: number;
  title: string;
  theme: string;
  summary: string;
  readingMinutes: number;
  paragraphs: string[];
}

export type StorySummary = Omit<Story, 'paragraphs'>;
