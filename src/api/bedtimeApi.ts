import { Platform } from 'react-native';

import type {
  ChildDto,
  ChildWriteRequest,
  CreateReadingSessionRequest,
  CreateReadingSessionResponse,
  HealthResponse,
  ReadingSessionChildObservationDto,
  ReadingSessionHistoryDto,
  StoryDetailDto,
  StorySummaryDto,
  VersionResponse,
} from './apiTypes';

const defaultApiBaseUrl =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:5076'
    : 'http://localhost:5076';

const apiBaseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl
).replace(/\/$/, '');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasString = (value: Record<string, unknown>, key: string) =>
  typeof value[key] === 'string';

const hasNumber = (value: Record<string, unknown>, key: string) =>
  typeof value[key] === 'number';

const isChildDto = (value: unknown): value is ChildDto =>
  isRecord(value) &&
  hasNumber(value, 'id') &&
  hasString(value, 'name') &&
  hasNumber(value, 'displayOrder');

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

const isNullableString = (value: unknown) =>
  value === null || typeof value === 'string';

const isNullableNumber = (value: unknown) =>
  value === null || typeof value === 'number';

const isBoolean = (value: Record<string, unknown>, key: string) =>
  typeof value[key] === 'boolean';

const isReadingSessionChildObservationDto = (
  value: unknown,
): value is ReadingSessionChildObservationDto =>
  isRecord(value) &&
  hasNumber(value, 'childId') &&
  hasString(value, 'childName') &&
  hasNumber(value, 'beforeCalmness') &&
  hasNumber(value, 'afterCalmness') &&
  hasNumber(value, 'displayOrder');

const isReadingSessionHistoryDto = (
  value: unknown,
): value is ReadingSessionHistoryDto =>
  isRecord(value) &&
  hasNumber(value, 'sessionId') &&
  hasString(value, 'completedAtUtc') &&
  hasNumber(value, 'storyId') &&
  hasString(value, 'storyTitle') &&
  hasNumber(value, 'elapsedSeconds') &&
  isNullableString(value.beforeNotes) &&
  isNullableString(value.afterNotes) &&
  isNullableString(value.appVersion) &&
  isNullableNumber(value.buildNumber) &&
  isNullableString(value.gitSha) &&
  isNullableString(value.buildEnvironment) &&
  Array.isArray(value.childObservations) &&
  value.childObservations.every(isReadingSessionChildObservationDto);

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
  typeof value.elapsedSeconds === 'number' &&
  isNullableString(value.appVersion) &&
  isNullableNumber(value.buildNumber) &&
  isNullableString(value.gitSha) &&
  isNullableString(value.buildEnvironment);

interface ProblemDetails {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
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
      errors:
        isRecord(data.errors)
          ? Object.fromEntries(
              Object.entries(data.errors).filter(
                (entry): entry is [string, string[]] =>
                  Array.isArray(entry[1]) &&
                  entry[1].every((message) => typeof message === 'string'),
              ),
            )
          : undefined,
    };
  } catch {
    return {};
  }
}

export class ChildApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ChildApiError';
  }
}

async function mutateChild(
  path: string,
  method: 'POST' | 'PUT',
  request: ChildWriteRequest,
): Promise<ChildDto> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch (error: unknown) {
    throw new ChildApiError(
      'The bedtime API could not be reached. Check that it is running, then retry.',
      null,
      {},
    );
  }

  if (!response.ok) {
    const problem = await readProblemDetails(response);
    throw new ChildApiError(
      response.status === 400
        ? 'Review the highlighted fields and try again.'
        : response.status === 404
          ? 'This child is no longer available. Refresh the catalog and try again.'
          : problem.detail ?? 'The child change could not be saved. Please retry.',
      response.status,
      problem.errors,
    );
  }

  const data: unknown = await response.json();
  if (!isChildDto(data)) {
    throw new ChildApiError('The bedtime API returned an invalid child response.', response.status);
  }

  return data;
}

export function createChild(request: ChildWriteRequest): Promise<ChildDto> {
  return mutateChild('/api/children', 'POST', request);
}

export function updateChild(id: number, request: ChildWriteRequest): Promise<ChildDto> {
  return mutateChild(`/api/children/${encodeURIComponent(id)}`, 'PUT', request);
}

export async function deleteChild(id: number): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/children/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (error: unknown) {
    throw new ChildApiError(
      'The bedtime API could not be reached. Check that it is running, then retry.',
      null,
      {},
    );
  }

  if (!response.ok) {
    const problem = await readProblemDetails(response);
    throw new ChildApiError(
      response.status === 409
        ? 'This child is used by completed session history and cannot be deleted.'
        : response.status === 404
          ? 'This child is no longer available.'
          : problem.detail ?? 'The child could not be deleted. Please retry.',
      response.status,
    );
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

export async function getReadingSessions(
  signal?: AbortSignal,
): Promise<ReadingSessionHistoryDto[]> {
  const data = await requestJson('/api/reading-sessions', signal);

  if (!Array.isArray(data) || !data.every(isReadingSessionHistoryDto)) {
    throw new Error('The bedtime API returned an invalid session history response.');
  }

  return data;
}

const isVersionResponse = (value: unknown): value is VersionResponse =>
  isRecord(value) &&
  hasString(value, 'version') &&
  hasNumber(value, 'build') &&
  hasString(value, 'gitSha') &&
  isBoolean(value, 'gitDirty') &&
  isNullableString(value.builtAtUtc) &&
  hasString(value, 'environment') &&
  hasString(value, 'displayVersion');

const isHealthResponse = (value: unknown): value is HealthResponse =>
  isRecord(value) &&
  (value.status === 'ok' || value.status === 'degraded') &&
  isRecord(value.database) &&
  (value.database.status === 'connected' ||
    value.database.status === 'unavailable' ||
    value.database.status === 'notConfigured') &&
  isNullableString(value.database.provider);

export async function getVersion(signal?: AbortSignal): Promise<VersionResponse> {
  const data = await requestJson('/version', signal);
  if (!isVersionResponse(data)) {
    throw new Error('The bedtime API returned invalid version information.');
  }
  return data;
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const data = await requestJson('/health', signal);
  if (!isHealthResponse(data)) {
    throw new Error('The bedtime API returned invalid health information.');
  }
  return data;
}
