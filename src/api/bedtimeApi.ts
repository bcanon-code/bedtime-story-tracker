import type {
  ChildDto,
  StoryDetailDto,
  StorySummaryDto,
} from './apiTypes';

const apiBaseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5076'
).replace(/\/$/, '');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasString = (value: Record<string, unknown>, key: string) =>
  typeof value[key] === 'string';

const isChildDto = (value: unknown): value is ChildDto =>
  isRecord(value) && hasString(value, 'id') && hasString(value, 'name');

const isStorySummaryDto = (value: unknown): value is StorySummaryDto =>
  isRecord(value) &&
  hasString(value, 'id') &&
  hasString(value, 'title') &&
  hasString(value, 'theme') &&
  hasString(value, 'summary') &&
  typeof value.readingMinutes === 'number';

const isStoryDetailDto = (value: unknown): value is StoryDetailDto =>
  isRecord(value) &&
  isStorySummaryDto(value) &&
  Array.isArray(value.paragraphs) &&
  value.paragraphs.every((paragraph: unknown) => typeof paragraph === 'string');

async function requestJson(
  path: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl}${path}`, { signal });

  if (!response.ok) {
    throw new Error(
      `The bedtime API request failed (${response.status} ${response.statusText}).`,
    );
  }

  return response.json();
}

export async function getChildren(signal?: AbortSignal): Promise<ChildDto[]> {
  const data = await requestJson('/api/children', signal);

  if (!Array.isArray(data) || !data.every(isChildDto)) {
    throw new Error('The bedtime API returned an invalid children response.');
  }

  return data;
}

export async function getStories(
  signal?: AbortSignal,
): Promise<StorySummaryDto[]> {
  const data = await requestJson('/api/stories', signal);

  if (!Array.isArray(data) || !data.every(isStorySummaryDto)) {
    throw new Error('The bedtime API returned an invalid stories response.');
  }

  return data;
}

export async function getStoryById(
  id: string,
  signal?: AbortSignal,
): Promise<StoryDetailDto> {
  const data = await requestJson(`/api/stories/${encodeURIComponent(id)}`, signal);

  if (!isStoryDetailDto(data)) {
    throw new Error('The bedtime API returned an invalid story response.');
  }

  return data;
}
