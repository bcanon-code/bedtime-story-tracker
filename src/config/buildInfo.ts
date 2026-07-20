type PublicEnvironment = 'Local Development' | 'Docker' | 'Server' | string;

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function displayBuild(build: number): string {
  return String(build).padStart(3, '0');
}

function displayTimestamp(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZoneName: 'short',
  }).format(date);
}

const version = process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0';
const build = positiveInteger(process.env.EXPO_PUBLIC_BUILD_NUMBER, 1);
const gitSha = process.env.EXPO_PUBLIC_GIT_SHA ?? 'unknown';
const dirty = process.env.EXPO_PUBLIC_GIT_DIRTY === 'true';
const builtAtUtc = process.env.EXPO_PUBLIC_BUILD_TIME_UTC;
const environment: PublicEnvironment =
  process.env.EXPO_PUBLIC_BUILD_ENVIRONMENT ?? 'Local Development';
const isDevelopment = environment === 'Local Development';
const shaDisplay = `${gitSha}${dirty ? '-dirty' : ''}`;
const timeDisplay = displayTimestamp(builtAtUtc);

export const buildInfo = Object.freeze({
  version,
  build,
  gitSha,
  dirty,
  builtAtUtc,
  environment,
  compactDisplay: isDevelopment
    ? `v${version}-dev · ${shaDisplay}`
    : `v${version} · Build ${displayBuild(build)}`,
  detailedDisplay: isDevelopment
    ? `v${version}-dev | Local Development | ${shaDisplay}`
    : `v${version} | ${timeDisplay ?? 'build time unavailable'} | Build ${displayBuild(build)} | Commit ${shaDisplay} | ${environment}`,
});
