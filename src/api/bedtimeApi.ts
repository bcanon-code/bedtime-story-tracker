import type {
  ChildDto,
  CreateReadingSessionRequest,
  CreateReadingSessionResponse,
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

const hasNumber = (value: Record<string, unknown>, key: string) =>
  typeof value[key] === 'number';

const isChildDto = (value: unknown): value is ChildDto =>
  isRecord(value) && hasNumber(value, 'id') && hasString(value, 'name');

const isStorySummaryDto = (value: unknown): value is StorySummaryDto =>
  isRecord(value) &&
  hasNumber(value, 'id') &&
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

const isCreateReadingSessionResponse = (
  value: unknown,
): value is CreateReadingSessionResponse =>
  isRecord(value) &&
  typeof value.sessionId === 'number' &&
  hasString(value, 'savedAtUtc') &&
  hasString(value, 'storyTitle') &&
  typeof value.elapsedSeconds === 'number';

interface ProblemDetails {
  title?: string;
  detail?: string;
}

async function readProblemDetails(response: Response): Promise<ProblemDetails> {
  try {
    const data: unknown = await response.json();
    if (!isRecord(data)) {
      return {};
    }

    return {
      title: typeof data.title === 'string' ? data.title : undefined,
      detail: typeof data.detail === 'string' ? data.detail : undefined,
    };
  } catch {
    return {};
  }
}

export async function createReadingSession(
  request: CreateReadingSessionRequest,
  signal?: AbortSignal,
): Promise<CreateReadingSessionResponse> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/reading-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error: unknown) {
    throw new Error('The bedtime API could not be reached. Check that it is running, then retry.', {
      cause: error,
    });
  }

  if (!response.ok) {
    const problem = await readProblemDetails(response);

    if (response.status === 400) {
      throw new Error('Some session details were not accepted. Review them and try again.');
    }

    if (response.status === 404 && problem.title === 'Story not found') {
      throw new Error('This story is no longer available. Start another session to choose a different story.');
    }

    if (response.status === 404 && problem.title === 'Child not found') {
      throw new Error('A child in this session is no longer available. Refresh the app before starting another session.');
    }

    if (response.status === 404) {
      throw new Error('Session saving is not available in the running API. Restart the local demo, then retry.');
    }

    throw new Error(
      problem.detail ??
        `The session could not be saved (${response.status} ${response.statusText}). Please retry.`,
    );
  }

  const data: unknown = await response.json();
  if (!isCreateReadingSessionResponse(data)) {
    throw new Error('The bedtime API returned an invalid save response.');
  }

  return data;
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
  id: number,
  signal?: AbortSignal,
): Promise<StoryDetailDto> {
  const data = await requestJson(`/api/stories/${encodeURIComponent(id)}`, signal);

  if (!isStoryDetailDto(data)) {
    throw new Error('The bedtime API returned an invalid story response.');
  }

  return data;
}
