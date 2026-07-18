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

import {
  CalmnessSelector,
  CalmnessValue,
} from './src/components/CalmnessSelector';
import { SessionSummaryCard } from './src/components/SessionSummaryCard';
import { Story, storyCatalog } from './src/data/storyCatalog';
import { formatElapsedTime } from './src/formatters';
import { theme } from './src/theme';

interface Child {
  id: string;
  name: string;
}

type CalmnessByChild = Partial<Record<Child['id'], CalmnessValue>>;
type WorkflowStep = 'setup' | 'reading' | 'finished' | 'summary';

const { stories } = storyCatalog;

const children: Child[] = [
  { id: 'avery', name: 'Avery' },
  { id: 'jordan', name: 'Jordan' },
];

export default function App() {
  const [selectedStoryId, setSelectedStoryId] = useState<Story['id'] | null>(
    null,
  );
  const [calmnessByChild, setCalmnessByChild] =
    useState<CalmnessByChild>({});
  const [notesBefore, setNotesBefore] = useState('');
  const [calmnessAfterByChild, setCalmnessAfterByChild] =
    useState<CalmnessByChild>({});
  const [notesAfter, setNotesAfter] = useState('');
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('setup');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const selectedStory = stories.find(
    (story) => story.id === selectedStoryId,
  );
  const isPreReadingComplete =
    calmnessByChild.avery !== undefined &&
    calmnessByChild.jordan !== undefined;
  const isPostReadingComplete =
    calmnessAfterByChild.avery !== undefined &&
    calmnessAfterByChild.jordan !== undefined;
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

  const setChildCalmnessAfter = (
    childId: Child['id'],
    value: CalmnessValue,
  ) => {
    setCalmnessAfterByChild((current) => ({
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

  const continueToSummary = () => {
    if (!isPostReadingComplete) {
      return;
    }

    setWorkflowStep('summary');
  };

  const resetSession = () => {
    setWorkflowStep('setup');
    setSelectedStoryId(null);
    setCalmnessByChild({});
    setNotesBefore('');
    setElapsedSeconds(0);
    setCalmnessAfterByChild({});
    setNotesAfter('');
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        {workflowStep === 'summary' && selectedStory ? (
          <ScrollView contentContainerStyle={styles.page}>
            <SessionSummaryCard
              childSummaries={children.map((child) => ({
                ...child,
                calmnessBefore: calmnessByChild[child.id]!,
                calmnessAfter: calmnessAfterByChild[child.id]!,
              }))}
              elapsedSeconds={elapsedSeconds}
              notesAfter={notesAfter}
              notesBefore={notesBefore}
              onReset={resetSession}
              story={selectedStory}
            />
          </ScrollView>
        ) : workflowStep === 'finished' && selectedStory ? (
          <ScrollView contentContainerStyle={styles.page}>
            <View style={styles.card}>
              <Text style={styles.stepLabel}>After the story</Text>
              <Text accessibilityRole="header" style={styles.heading}>
                After reading
              </Text>
              <Text style={styles.checkInPrompt}>
                Choose the observed calmness for each child now.
              </Text>

              {children.map((child) => (
                <CalmnessSelector
                  childName={child.name}
                  key={child.id}
                  onChange={(value) =>
                    setChildCalmnessAfter(child.id, value)
                  }
                  value={calmnessAfterByChild[child.id] ?? null}
                />
              ))}

              <Text style={styles.notesLabel}>Notes, optional</Text>
              <TextInput
                accessibilityLabel="Post-reading notes"
                multiline
                onChangeText={setNotesAfter}
                placeholder="Anything helpful to remember after reading?"
                placeholderTextColor={theme.colors.disabled}
                style={styles.notesInput}
                value={notesAfter}
              />

              <View style={styles.finalDuration}>
                <Text style={styles.summaryLabel}>Reading time</Text>
                <Text
                  accessibilityLabel={`Final reading time ${formatElapsedTime(elapsedSeconds)}`}
                  style={styles.finalDurationValue}
                >
                  {formatElapsedTime(elapsedSeconds)}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !isPostReadingComplete }}
                disabled={!isPostReadingComplete}
                onPress={continueToSummary}
                style={({ pressed }) => [
                  styles.continueButton,
                  !isPostReadingComplete && styles.disabledButton,
                  pressed && styles.pressedPrimaryButton,
                ]}
              >
                <Text style={styles.primaryButtonText}>Continue to summary</Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : workflowStep === 'reading' && selectedStory ? (
          <View style={styles.readingScreen}>
            <ScrollView
              style={styles.storyScrollView}
              contentContainerStyle={styles.storyContent}
            >
              <View style={styles.readingView}>
                <View style={styles.readingHeader}>
                  <Text style={styles.readingLabel}>
                    Now reading
                  </Text>
                  <Text
                    accessibilityRole="header"
                    style={styles.readingStoryTitle}
                  >
                    {selectedStory.title}
                  </Text>
                  <Text style={styles.readingEstimate}>
                    Estimated reading time · {selectedStory.readingMinutes} min
                  </Text>
                </View>

                <View style={styles.storyText}>
                  {selectedStory.paragraphs.map((paragraph, index) => (
                    <Text
                      key={`${selectedStory.id}-${index}`}
                      style={styles.storyParagraph}
                    >
                      {paragraph}
                    </Text>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.readingControlBar}>
              <View style={styles.readingControls}>
                <View>
                  <Text style={styles.timerLabel}>
                    Elapsed
                  </Text>
                  <Text
                    accessibilityLabel={`Elapsed reading time ${formatElapsedTime(elapsedSeconds)}`}
                    style={styles.timer}
                  >
                    {formatElapsedTime(elapsedSeconds)}
                  </Text>
                </View>
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
              </View>
            </View>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.page}>
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
                <CalmnessSelector
                  childName={child.name}
                  key={child.id}
                  onChange={(value) => setChildCalmness(child.id, value)}
                  value={calmnessByChild[child.id] ?? null}
                />
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
                          {story.summary}
                        </Text>
                        <Text
                          style={[
                            styles.storyMetadata,
                            isSelected && styles.selectedStoryText,
                          ]}
                        >
                          {story.readingMinutes} min · {story.theme}
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
                      <Text style={styles.summaryDescription}>
                        {selectedStory.summary}
                      </Text>
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
          </ScrollView>
        )}
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
  readingScreen: {
    flex: 1,
  },
  storyScrollView: {
    flex: 1,
  },
  storyContent: {
    alignItems: 'center',
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  readingView: {
    maxWidth: 720,
    width: '100%',
  },
  readingHeader: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    paddingBottom: theme.spacing.lg,
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
  readingEstimate: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  timer: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: 1,
    lineHeight: 27,
  },
  timerLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 13,
    textTransform: 'uppercase',
  },
  storyText: {
    paddingTop: theme.spacing.xl,
  },
  storyParagraph: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    lineHeight: 31,
    marginBottom: 18,
    textAlign: 'left',
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
  continueButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    minHeight: 52,
    paddingHorizontal: theme.spacing.lg,
  },
  disabledButton: {
    backgroundColor: theme.colors.disabled,
  },
  finishButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  readingControlBar: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    minHeight: 64,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
  },
  readingControls: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 720,
    width: '100%',
  },
  pressedPrimaryButton: {
    backgroundColor: theme.colors.primaryPressed,
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 17,
    fontWeight: '700',
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
  pressedSelected: {
    backgroundColor: theme.colors.selectedPressed,
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
  storyMetadata: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
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
  finalDuration: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  finalDurationValue: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: theme.spacing.xs,
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
  summaryDescription: {
    color: theme.colors.textSecondary,
    lineHeight: 21,
    marginTop: theme.spacing.xs,
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
