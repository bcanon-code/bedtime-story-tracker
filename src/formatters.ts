export const formatElapsedTime = (elapsedSeconds: number) => {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const formatCalmnessChange = (change: number) =>
  change > 0 ? `+${change}` : String(change);

const completedSessionDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export const formatCompletedSessionDateTime = (completedAtUtc: string) =>
  completedSessionDateTimeFormatter.format(new Date(completedAtUtc));
