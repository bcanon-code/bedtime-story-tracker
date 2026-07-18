import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

export type CalmnessValue = 1 | 2 | 3 | 4 | 5;

interface CalmnessSelectorProps {
  childName: string;
  value: CalmnessValue | null;
  onChange: (value: CalmnessValue) => void;
}

const calmnessChoices: { label: string; value: CalmnessValue }[] = [
  { value: 1, label: 'Very restless' },
  { value: 2, label: 'Restless' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Calm' },
  { value: 5, label: 'Very calm' },
];

export function CalmnessSelector({
  childName,
  value,
  onChange,
}: CalmnessSelectorProps) {
  return (
    <View style={styles.childCheckIn}>
      <Text style={styles.childName}>How calm is {childName} right now?</Text>
      <Text style={styles.requiredLabel}>
        Required · 1 restless, 5 very calm
      </Text>
      <View style={styles.calmnessRow}>
        {calmnessChoices.map((choice) => {
          const isSelected = value === choice.value;

          return (
            <Pressable
              accessibilityLabel={`${childName} calmness ${choice.value}, ${choice.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={choice.value}
              onPress={() => onChange(choice.value)}
              style={({ pressed }) => [
                styles.calmnessButton,
                pressed && styles.pressedCalmness,
                isSelected && styles.selectedCalmness,
                pressed && isSelected && styles.pressedSelected,
              ]}
            >
              <Text style={styles.calmnessText}>
                {isSelected ? `✓ ${choice.value}` : choice.value}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  childCheckIn: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  childName: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  requiredLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: theme.spacing.sm,
  },
  calmnessRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  calmnessButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.round,
    borderWidth: 2,
    height: 48,
    justifyContent: 'center',
    minWidth: 48,
    paddingHorizontal: theme.spacing.sm,
  },
  pressedCalmness: {
    backgroundColor: theme.colors.surfacePressed,
    borderColor: theme.colors.primary,
  },
  selectedCalmness: {
    backgroundColor: theme.colors.selected,
    borderColor: theme.colors.primary,
  },
  pressedSelected: {
    backgroundColor: theme.colors.selectedPressed,
  },
  calmnessText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
