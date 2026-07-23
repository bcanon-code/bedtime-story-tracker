import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import type { ReadingSessionHistoryDto } from '../api/apiTypes';
import {
  formatCalmnessChange,
  formatCompletedSessionDateTime,
  formatElapsedTime,
} from '../formatters';
import { theme } from '../theme';

export interface CompletedSessionListProps {
  sessions: readonly ReadingSessionHistoryDto[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onReturn: () => void;
}

const wideLayoutBreakpoint = 760;

export function CompletedSessionList({
  sessions,
  isLoading,
  error,
  onRetry,
  onReturn,
}: CompletedSessionListProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= wideLayoutBreakpoint;

  const returnButton = (
    <Pressable
      accessibilityHint="Returns to the current bedtime-reading workflow"
      accessibilityLabel="Return to current bedtime workflow"
      accessibilityRole="button"
      onPress={onReturn}
      style={({ pressed }) => [
        styles.returnButton,
        pressed && styles.pressedButton,
      ]}
    >
      <Text style={styles.returnButtonText}>Return to bedtime workflow</Text>
    </Pressable>
  );

  if (isLoading) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.centeredState}>
        <Text accessibilityRole="header" style={styles.heading}>
          Completed sessions
        </Text>
        <Text style={styles.stateMessage}>Loading completed sessions…</Text>
        {returnButton}
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredState}>
        <Text accessibilityRole="header" style={styles.heading}>
          Completed sessions
        </Text>
        <Text accessibilityLiveRegion="polite" style={styles.errorMessage}>
          Completed sessions could not be loaded.
        </Text>
        <Text style={styles.stateMessage}>{error}</Text>
        <Pressable
          accessibilityHint="Tries to load completed sessions again"
          accessibilityLabel="Retry loading completed sessions"
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.pressedPrimaryButton,
          ]}
        >
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
        {returnButton}
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={sessions}
      keyExtractor={(session) => String(session.sessionId)}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <Text accessibilityRole="header" style={styles.heading}>
            Completed sessions
          </Text>
          <Text style={styles.introduction}>
            The 50 most recent saved reading sessions, newest first.
          </Text>
          {returnButton}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No completed sessions yet.</Text>
          <Text style={styles.stateMessage}>
            Complete a bedtime-reading session to see it here.
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const completedAt = formatCompletedSessionDateTime(item.completedAtUtc);
        const accessibleChildren = item.childObservations
          .map((child) => {
            const change = child.afterCalmness - child.beforeCalmness;
            const changeText = change === 0 ? 'no change' : formatCalmnessChange(change);
            return `${child.childName}, ${child.beforeCalmness} to ${child.afterCalmness}, ${changeText}`;
          })
          .join('; ');

        return (
          <View
            accessible
            accessibilityLabel={`${completedAt}. ${item.storyTitle}. Reading time ${formatElapsedTime(item.elapsedSeconds)}. ${accessibleChildren}`}
            style={styles.sessionCard}
          >
            <View style={[styles.primaryDetails, isWide && styles.primaryDetailsWide]}>
              <View style={styles.storyDetails}>
                <Text style={styles.completedAt}>{completedAt}</Text>
                <Text style={styles.storyTitle}>{item.storyTitle}</Text>
              </View>
              <View style={[styles.durationBlock, isWide && styles.durationBlockWide]}>
                <Text style={styles.metadataLabel}>Reading time</Text>
                <Text style={styles.duration}>{formatElapsedTime(item.elapsedSeconds)}</Text>
              </View>
            </View>

            <View style={[styles.observationList, isWide && styles.observationListWide]}>
              {item.childObservations.map((child) => {
                const change = child.afterCalmness - child.beforeCalmness;

                return (
                  <View key={child.childId} style={styles.observation}>
                    <Text style={styles.childName}>{child.childName}</Text>
                    <Text style={styles.calmness}>
                      {child.beforeCalmness} → {child.afterCalmness}{' '}
                      ({change === 0 ? 'no change' : formatCalmnessChange(change)})
                    </Text>
                  </View>
                );
              })}
            </View>

            {item.beforeNotes || item.afterNotes ? (
              <View style={[styles.notes, isWide && styles.notesWide]}>
                {item.beforeNotes ? (
                  <View style={styles.note}>
                    <Text style={styles.metadataLabel}>Before notes</Text>
                    <Text style={styles.noteText}>{item.beforeNotes}</Text>
                  </View>
                ) : null}
                {item.afterNotes ? (
                  <View style={styles.note}>
                    <Text style={styles.metadataLabel}>After notes</Text>
                    <Text style={styles.noteText}>{item.afterNotes}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    alignSelf: 'center',
    gap: theme.spacing.md,
    maxWidth: 1080,
    padding: theme.spacing.lg,
    width: '100%',
  },
  listHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  heading: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  introduction: {
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  centeredState: {
    alignItems: 'center',
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'center',
    maxWidth: 620,
    padding: theme.spacing.lg,
    width: '100%',
  },
  stateMessage: {
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    color: theme.colors.error,
    fontSize: 17,
    fontWeight: '700',
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  sessionCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.lg,
  },
  primaryDetails: {
    gap: theme.spacing.md,
  },
  primaryDetailsWide: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storyDetails: {
    flex: 1,
  },
  completedAt: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  storyTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginTop: theme.spacing.xs,
  },
  durationBlock: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
  },
  durationBlockWide: {
    minWidth: 130,
  },
  metadataLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  duration: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    marginTop: theme.spacing.xs,
  },
  observationList: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  observationListWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  observation: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 220,
    padding: theme.spacing.md,
  },
  childName: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  calmness: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginTop: theme.spacing.xs,
  },
  notes: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  notesWide: {
    flexDirection: 'row',
  },
  note: {
    flex: 1,
  },
  noteText: {
    color: theme.colors.textPrimary,
    lineHeight: 22,
    marginTop: theme.spacing.xs,
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    minHeight: 48,
    minWidth: 120,
    paddingHorizontal: theme.spacing.lg,
  },
  returnButton: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    minHeight: 48,
    paddingHorizontal: theme.spacing.lg,
  },
  pressedButton: {
    backgroundColor: theme.colors.surfacePressed,
    borderColor: theme.colors.primary,
  },
  pressedPrimaryButton: {
    backgroundColor: theme.colors.primaryPressed,
  },
  returnButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 17,
    fontWeight: '700',
  },
});
