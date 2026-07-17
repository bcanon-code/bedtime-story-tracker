import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

type CalmnessValue = 1 | 2 | 3 | 4 | 5;

interface Story {
  id: string;
  title: string;
  description: string;
}

interface Child {
  id: string;
  name: string;
}

type CalmnessByChild = Partial<Record<Child['id'], CalmnessValue>>;
type WorkflowStep = 'setup' | 'reading' | 'finished';

const formatElapsedTime = (elapsedSeconds: number) => {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const stories: Story[] = [
  {
    id: 'moonlit-garden',
    title: 'The Moonlit Garden',
    description: 'A quiet walk among silver flowers and sleepy fireflies.',
  },
  {
    id: 'cloud-boat',
    title: 'The Little Cloud Boat',
    description: 'A tiny boat sails gently across the evening sky.',
  },
  {
    id: 'owl-library',
    title: "Ollie's Night Library",
    description: 'A friendly owl helps the forest find the perfect bedtime tale.',
  },
];

const children: Child[] = [
  { id: 'avery', name: 'Avery' },
  { id: 'jordan', name: 'Jordan' },
];

const calmnessValues: CalmnessValue[] = [1, 2, 3, 4, 5];

const theme = {
  colors: {
    background: '#111827',
    surface: '#1B2433',
    surfaceRaised: '#243044',
    textPrimary: '#F4EBDD',
    textSecondary: '#BFC7D4',
    primary: '#D6A85F',
    primaryPressed: '#BF8F47',
    selected: '#376B70',
    selectedPressed: '#2E5B60',
    surfacePressed: '#2A384D',
    border: '#526176',
    error: '#E6A09A',
    disabled: '#788497',
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 20,
    round: 24,
  },
};

export default function App() {
  const [selectedStoryId, setSelectedStoryId] = useState<Story['id'] | null>(
    null,
  );
  const [calmnessByChild, setCalmnessByChild] =
    useState<CalmnessByChild>({});
  const [notesBefore, setNotesBefore] = useState('');
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('setup');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const selectedStory = stories.find(
    (story) => story.id === selectedStoryId,
  );
  const isPreReadingComplete =
    calmnessByChild.avery !== undefined &&
    calmnessByChild.jordan !== undefined;
  const isReading = workflowStep === 'reading';

  useEffect(() => {
    if (!isReading) {
      return;
    }

    const intervalId = setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isReading]);

  const selectStory = (storyId: Story['id']) => {
    setSelectedStoryId(storyId);
  };

  const setChildCalmness = (
    childId: Child['id'],
    value: CalmnessValue,
  ) => {
    setCalmnessByChild((current) => ({
      ...current,
      [childId]: value,
    }));
  };

  const beginReading = () => {
    if (!isPreReadingComplete || !selectedStory) {
      return;
    }

    setElapsedSeconds(0);
    setWorkflowStep('reading');
  };

  const finishReading = () => {
    setWorkflowStep('finished');
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <ScrollView
          contentContainerStyle={[
            styles.page,
            workflowStep !== 'setup' && styles.readingPage,
          ]}
        >
          {workflowStep !== 'setup' && selectedStory ? (
            <View style={styles.readingCard}>
              <Text style={styles.readingLabel}>
                {isReading ? 'Now reading' : 'Reading finished'}
              </Text>
              <Text style={styles.readingStoryTitle}>{selectedStory.title}</Text>
              <Text
                accessibilityLabel={`Elapsed time ${formatElapsedTime(elapsedSeconds)}`}
                accessibilityLiveRegion="polite"
                style={styles.timer}
              >
                {formatElapsedTime(elapsedSeconds)}
              </Text>
              {isReading ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={finishReading}
                  style={({ pressed }) => [
                    styles.finishButton,
                    pressed && styles.pressedPrimaryButton,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>Finish reading</Text>
                </Pressable>
              ) : (
                <Text style={styles.finalDuration}>Final reading time</Text>
              )}
            </View>
          ) : (
          <View style={styles.card}>
            <Text style={styles.title}>Bedtime Story Tracker</Text>
            <Text style={styles.introduction}>
              A quiet check-in before tonight&apos;s story.
            </Text>

            <View style={styles.checkIn}>
              <Text style={styles.stepLabel}>Step 1 of 2</Text>
              <Text style={styles.heading}>Before reading</Text>
              <Text style={styles.checkInPrompt}>
                Choose the observed calmness for each child.
              </Text>

              {children.map((child) => (
                <View key={child.id} style={styles.childCheckIn}>
                  <Text style={styles.childName}>
                    How calm is {child.name} right now?
                  </Text>
                  <Text style={styles.requiredLabel}>
                    Required · 1 restless, 5 very calm
                  </Text>
                  <View style={styles.calmnessRow}>
                    {calmnessValues.map((value) => {
                      const isSelected = calmnessByChild[child.id] === value;

                      return (
                        <Pressable
                          accessibilityLabel={`${child.name} calmness ${value}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          key={value}
                          onPress={() => setChildCalmness(child.id, value)}
                          style={({ pressed }) => [
                            styles.calmnessButton,
                            pressed && styles.pressedCalmness,
                            isSelected && styles.selectedCalmness,
                            pressed && isSelected && styles.pressedSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.calmnessText,
                              isSelected && styles.selectedCalmnessText,
                            ]}
                          >
                            {isSelected ? `✓ ${value}` : value}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              <Text style={styles.notesLabel}>Notes, optional</Text>
              <TextInput
                accessibilityLabel="Pre-reading notes"
                multiline
                onChangeText={setNotesBefore}
                placeholder="Anything helpful to remember before reading?"
                placeholderTextColor={theme.colors.disabled}
                style={styles.notesInput}
                value={notesBefore}
              />
            </View>

            {isPreReadingComplete ? (
              <>
                <Text style={styles.stepLabel}>Step 2 of 2</Text>
                <Text style={styles.heading}>Choose tonight&apos;s story</Text>
                <View style={styles.storyList}>
                  {stories.map((story) => {
                    const isSelected = story.id === selectedStoryId;

                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        key={story.id}
                        onPress={() => selectStory(story.id)}
                        style={({ pressed }) => [
                          styles.storyButton,
                          pressed && styles.pressedStory,
                          isSelected && styles.selectedStory,
                          pressed && isSelected && styles.pressedSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.storyTitle,
                            isSelected && styles.selectedStoryText,
                          ]}
                        >
                          {story.title}
                        </Text>
                        <Text
                          style={[
                            styles.storyDescription,
                            isSelected && styles.selectedStoryText,
                          ]}
                        >
                          {story.description}
                        </Text>
                        {isSelected && (
                          <Text style={styles.selectedLabel}>✓ Selected</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {selectedStory ? (
                  <>
                    <View style={styles.selectionSummary}>
                      <Text style={styles.summaryLabel}>Selected story</Text>
                      <Text style={styles.summaryValue}>{selectedStory.title}</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={beginReading}
                      style={({ pressed }) => [
                        styles.beginButton,
                        pressed && styles.pressedPrimaryButton,
                      ]}
                    >
                      <Text style={styles.primaryButtonText}>Begin reading</Text>
                    </Pressable>
                  </>
                ) : (
                  <Text style={styles.prompt}>Select a story to continue.</Text>
                )}
              </>
            ) : (
              <View style={styles.lockedStep}>
                <Text style={styles.lockedStepLabel}>Step 2 of 2 · Locked</Text>
                <Text style={styles.lockedStepTitle}>
                  Choose tonight&apos;s story
                </Text>
                <Text style={styles.validationMessage}>
                  Complete both check-ins to choose a story.
                </Text>
              </View>
            )}
          </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  page: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    maxWidth: 620,
    padding: theme.spacing.xl,
    width: '100%',
  },
  readingPage: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  readingCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    maxWidth: 620,
    padding: theme.spacing.xl,
    width: '100%',
  },
  readingLabel: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  readingStoryTitle: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  timer: {
    color: theme.colors.textPrimary,
    fontSize: 64,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: 2,
    marginVertical: theme.spacing.xl,
  },
  beginButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.lg,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  finishButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  pressedPrimaryButton: {
    backgroundColor: theme.colors.primaryPressed,
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 17,
    fontWeight: '700',
  },
  finalDuration: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  introduction: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
    textAlign: 'center',
  },
  heading: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  stepLabel: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: theme.spacing.xl,
    textTransform: 'uppercase',
  },
  storyList: {
    gap: theme.spacing.sm,
  },
  storyButton: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    minHeight: 88,
    padding: theme.spacing.md,
  },
  pressedStory: {
    backgroundColor: theme.colors.surfacePressed,
    borderColor: theme.colors.primary,
  },
  selectedStory: {
    backgroundColor: theme.colors.selected,
    borderColor: theme.colors.primary,
  },
  storyTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  storyDescription: {
    color: theme.colors.textSecondary,
    lineHeight: 21,
    marginTop: 4,
  },
  selectedStoryText: {
    color: theme.colors.textPrimary,
  },
  selectedLabel: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: theme.spacing.sm,
  },
  selectionSummary: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.selected,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginTop: 18,
    padding: 14,
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
  prompt: {
    color: theme.colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  lockedStep: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.disabled,
    borderRadius: theme.radius.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginTop: 26,
    padding: theme.spacing.md,
  },
  lockedStepLabel: {
    color: theme.colors.disabled,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  lockedStepTitle: {
    color: theme.colors.textSecondary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: theme.spacing.xs,
  },
  validationMessage: {
    color: theme.colors.error,
    lineHeight: 21,
    marginTop: 6,
  },
  checkIn: {
    marginTop: 0,
  },
  checkInPrompt: {
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
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
  selectedCalmnessText: {
    color: theme.colors.textPrimary,
  },
  notesLabel: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    color: theme.colors.textPrimary,
    fontSize: 16,
    lineHeight: 23,
    minHeight: 104,
    padding: theme.spacing.md,
    textAlignVertical: 'top',
  },
});
