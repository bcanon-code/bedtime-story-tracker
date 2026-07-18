import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  formatCalmnessChange,
  formatElapsedTime,
} from '../formatters';
import { theme } from '../theme';
import { CalmnessValue } from './CalmnessSelector';

export interface ChildSessionSummary {
  id: string;
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
}

export function SessionSummaryCard({
  storyTitle,
  children,
  elapsedSeconds,
  notesBefore,
  notesAfter,
  onReset,
}: SessionSummaryCardProps) {
  const formattedElapsedTime = formatElapsedTime(elapsedSeconds);

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

      <Pressable
        accessibilityHint="Returns to the initial setup and clears the current session"
        accessibilityLabel="Start another bedtime story session"
        accessibilityRole="button"
        onPress={onReset}
        style={({ pressed }) => [
          styles.continueButton,
          pressed && styles.pressedPrimaryButton,
        ]}
      >
        <Text style={styles.primaryButtonText}>Start another session</Text>
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
  continueButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    minHeight: 52,
    paddingHorizontal: theme.spacing.lg,
  },
  pressedPrimaryButton: {
    backgroundColor: theme.colors.primaryPressed,
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 17,
    fontWeight: '700',
  },
});
