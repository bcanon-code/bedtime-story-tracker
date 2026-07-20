import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  formatCalmnessChange,
  formatElapsedTime,
} from '../formatters';
import { theme } from '../theme';
import { CalmnessValue } from './CalmnessSelector';

export interface ChildSessionSummary {
  id: number;
  name: string;
  beforeCalmness: CalmnessValue;
  afterCalmness: CalmnessValue;
}

export interface SessionSummaryCardProps {
  storyTitle: string;
  children: readonly ChildSessionSummary[];
  elapsedSeconds: number;
  notesBefore?: string;
  notesAfter?: string;
  onReset: () => void;
  onSave: () => void;
  saveError: string | null;
  saveStatus: 'not-saved' | 'saving' | 'saved' | 'failed';
}

export function SessionSummaryCard({
  storyTitle,
  children,
  elapsedSeconds,
  notesBefore,
  notesAfter,
  onReset,
  onSave,
  saveError,
  saveStatus,
}: SessionSummaryCardProps) {
  const formattedElapsedTime = formatElapsedTime(elapsedSeconds);
  const isSaving = saveStatus === 'saving';
  const isSaved = saveStatus === 'saved';
  const hasSaveFailed = saveStatus === 'failed';

  return (
    <View style={styles.card}>
      <Text style={styles.stepLabel}>Completed session</Text>
      <Text accessibilityRole="header" style={styles.heading}>
        Session summary
      </Text>

      <View style={styles.summarySection}>
        <Text style={styles.summaryLabel}>Selected story</Text>
        <Text style={styles.summaryValue}>{storyTitle}</Text>
      </View>

      <View style={styles.summarySection}>
        <Text style={styles.summaryLabel}>Reading time</Text>
        <Text
          accessibilityLabel={`Final reading time ${formattedElapsedTime}`}
          style={styles.finalDurationValue}
        >
          {formattedElapsedTime}
        </Text>
      </View>

      {children.map((child) => {
        const change = child.afterCalmness - child.beforeCalmness;

        return (
          <View key={child.id} style={styles.summarySection}>
            <Text style={styles.summaryChildName}>{child.name}</Text>
            <Text style={styles.calmnessComparison}>
              Before reading: {child.beforeCalmness} → After reading:{' '}
              {child.afterCalmness}
            </Text>
            <Text style={styles.changeValue}>
              Observed change: {formatCalmnessChange(change)}
            </Text>
          </View>
        );
      })}

      {notesBefore?.trim() ? (
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>Before-reading notes</Text>
          <Text style={styles.summaryNotes}>{notesBefore}</Text>
        </View>
      ) : null}

      {notesAfter?.trim() ? (
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>After-reading notes</Text>
          <Text style={styles.summaryNotes}>{notesAfter}</Text>
        </View>
      ) : null}

      <View
        accessibilityLiveRegion="polite"
        style={[
          styles.savePanel,
          hasSaveFailed && styles.savePanelError,
          isSaved && styles.savePanelSuccess,
        ]}
      >
        <View style={styles.saveStatusHeading}>
          {isSaving ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : (
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={[
                styles.statusIcon,
                hasSaveFailed && styles.saveError,
                isSaved && styles.saveSuccess,
              ]}
            >
              {isSaved ? '✓' : hasSaveFailed ? '!' : '○'}
            </Text>
          )}
          <Text style={styles.saveStatusTitle}>
            {isSaving
              ? 'Saving session…'
              : isSaved
                ? 'Session saved'
                : hasSaveFailed
                  ? 'Session not saved'
                  : 'Preparing to save…'}
          </Text>
        </View>
        <Text style={[styles.saveStatusMessage, hasSaveFailed && styles.saveError]}>
          {isSaved
            ? 'Your completed session is safely stored.'
            : isSaving
              ? 'Keep this screen open while the save finishes.'
              : hasSaveFailed
                ? saveError ?? 'Something went wrong. Your summary is still here.'
                : 'This completed session will save automatically.'}
        </Text>

        {hasSaveFailed ? (
          <Pressable
            accessibilityHint="Retries saving this completed session"
            accessibilityLabel="Retry saving session"
            accessibilityRole="button"
            onPress={onSave}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.pressedPrimaryButton,
            ]}
          >
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        accessibilityHint={isSaved ? 'Returns to setup for another session' : 'Clears this unsaved session and returns to setup'}
        accessibilityLabel={isSaved ? 'Start another bedtime story session' : 'Discard unsaved session and start another'}
        accessibilityRole="button"
        accessibilityState={{ disabled: isSaving }}
        disabled={isSaving}
        onPress={onReset}
        style={({ pressed }) => [
          styles.secondaryButton,
          isSaving && styles.secondaryButtonDisabled,
          pressed && !isSaving && styles.pressedSecondaryButton,
        ]}
      >
        <Text style={styles.secondaryButtonText}>
          {isSaved ? 'Start another session' : 'Discard and start another'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    maxWidth: 620,
    padding: theme.spacing.xl,
    width: '100%',
  },
  stepLabel: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: theme.spacing.xl,
    textTransform: 'uppercase',
  },
  heading: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  summarySection: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
  },
  summaryLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 3,
  },
  finalDurationValue: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: theme.spacing.xs,
  },
  summaryChildName: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  calmnessComparison: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
  },
  changeValue: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  summaryNotes: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    lineHeight: 23,
    marginTop: theme.spacing.xs,
  },
  savePanel: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  savePanelError: {
    borderColor: theme.colors.error,
  },
  savePanelSuccess: {
    borderColor: theme.colors.success,
  },
  saveStatusHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statusIcon: {
    color: theme.colors.textSecondary,
    fontSize: 20,
    fontWeight: '700',
    width: 20,
  },
  saveStatusTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  saveStatusMessage: {
    color: theme.colors.textSecondary,
    lineHeight: 21,
    marginTop: theme.spacing.sm,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    minHeight: 52,
    paddingHorizontal: theme.spacing.lg,
  },
  pressedPrimaryButton: {
    backgroundColor: theme.colors.primaryPressed,
  },
  disabledButton: {
    backgroundColor: theme.colors.disabled,
  },
  saveError: {
    color: theme.colors.error,
  },
  saveSuccess: {
    color: theme.colors.success,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    minHeight: 52,
    paddingHorizontal: theme.spacing.lg,
  },
  pressedSecondaryButton: {
    backgroundColor: theme.colors.surfacePressed,
    borderColor: theme.colors.primary,
  },
  secondaryButtonDisabled: {
    borderColor: theme.colors.disabled,
    opacity: 0.6,
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 17,
    fontWeight: '700',
  },
});
