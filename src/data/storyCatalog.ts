import catalogJson from './stories.json';

export interface Story {
  id: string;
  title: string;
  theme: string;
  summary: string;
  readingMinutes: number;
  paragraphs: string[];
}

interface StoryCatalog {
  schemaVersion: number;
  storyFilters: string[];
  stories: Story[];
}

export const storyCatalog = catalogJson as StoryCatalog;
