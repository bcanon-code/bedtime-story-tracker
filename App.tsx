import { useEffect, useRef, useState } from 'react';
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
import {
  createReadingSession,
  getChildren,
  getStories,
  getStoryById,
} from './src/api/bedtimeApi';
import type { Story, StorySummary } from './src/data/storyCatalog';
import { formatElapsedTime } from './src/formatters';
import { theme } from './src/theme';

interface Child {
  id: number;
  name: string;
}

type CalmnessByChild = Partial<Record<Child['id'], CalmnessValue>>;
type WorkflowStep = 'setup' | 'reading' | 'finished' | 'summary';
type SaveStatus = 'not-saved' | 'saving' | 'saved' | 'failed';

export default function App() {
  const [children, setChildren] = useState<Child[]>([]);
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [initialLoadAttempt, setInitialLoadAttempt] = useState(0);
  const [selectedStoryId, setSelectedStoryId] = useState<Story['id'] | null>(
    null,
  );
  const [selectedStoryDetail, setSelectedStoryDetail] = useState<Story | null>(
    null,
  );
  const [isStoryLoading, setIsStoryLoading] = useState(false);
  const [storyLoadError, setStoryLoadError] = useState<string | null>(null);
  const [storyLoadAttempt, setStoryLoadAttempt] = useState(0);
  const [calmnessByChild, setCalmnessByChild] =
    useState<CalmnessByChild>({});
  const [notesBefore, setNotesBefore] = useState('');
  const [calmnessAfterByChild, setCalmnessAfterByChild] =
    useState<CalmnessByChild>({});
  const [notesAfter, setNotesAfter] = useState('');
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('setup');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('not-saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveInFlightRef = useRef(false);

  const selectedStorySummary = stories.find(
    (story) => story.id === selectedStoryId,
  );
  const selectedStory =
    selectedStoryDetail?.id === selectedStoryId ? selectedStoryDetail : null;
  const isPreReadingComplete =
    children.length === 2 &&
    children.every((child) => calmnessByChild[child.id] !== undefined);
  const isPostReadingComplete =
    children.length === 2 &&
    children.every((child) => calmnessAfterByChild[child.id] !== undefined);
  const isReading = workflowStep === 'reading';

  useEffect(() => {
    const controller = new AbortController();

    const loadBedtimeData = async () => {
      setIsInitialLoading(true);
      setInitialLoadError(null);

      try {
        const [loadedChildren, loadedStories] = await Promise.all([
          getChildren(controller.signal),
          getStories(controller.signal),
        ]);

        if (loadedChildren.length < 2) {
          throw new Error(
            'The bedtime API must return at least two fictional children.',
          );
        }

        setChildren(loadedChildren.slice(0, 2));
        setStories(loadedStories);
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        setInitialLoadError(
          error instanceof Error ? error.message : 'An unexpected error occurred.',
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsInitialLoading(false);
        }
      }
    };

    void loadBedtimeData();

    return () => controller.abort();
  }, [initialLoadAttempt]);

  useEffect(() => {
    if (!selectedStoryId) {
      setSelectedStoryDetail(null);
      setStoryLoadError(null);
      setIsStoryLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadStory = async () => {
      setSelectedStoryDetail(null);
      setStoryLoadError(null);
      setIsStoryLoading(true);

      try {
        setSelectedStoryDetail(
          await getStoryById(selectedStoryId, controller.signal),
        );
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        setStoryLoadError(
          error instanceof Error ? error.message : 'An unexpected error occurred.',
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsStoryLoading(false);
        }
      }
    };

    void loadStory();

    return () => controller.abort();
  }, [selectedStoryId, storyLoadAttempt]);

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
    setStoryLoadAttempt(0);
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

  const saveSession = async () => {
    if (!selectedStory || saveInFlightRef.current || saveStatus === 'saved') {
      return;
    }

    saveInFlightRef.current = true;
    setSaveStatus('saving');
    setSaveError(null);
    try {
      await createReadingSession({
        storyId: selectedStory.id,
        elapsedSeconds,
        beforeNotes: notesBefore.trim() || undefined,
        afterNotes: notesAfter.trim() || undefined,
        childObservations: children.map((child) => ({
          childId: child.id,
          beforeCalmness: calmnessByChild[child.id]!,
          afterCalmness: calmnessAfterByChild[child.id]!,
        })),
      });
      setSaveStatus('saved');
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : 'An unexpected error occurred.');
      setSaveStatus('failed');
    } finally {
      saveInFlightRef.current = false;
    }
  };

  const continueToSummary = () => {
    if (!isPostReadingComplete) {
      return;
    }

    setWorkflowStep('summary');
    void saveSession();
  };

  const resetSession = () => {
    setWorkflowStep('setup');
    setSelectedStoryId(null);
    setCalmnessByChild({});
    setNotesBefore('');
    setElapsedSeconds(0);
    setCalmnessAfterByChild({});
    setNotesAfter('');
    setSaveStatus('not-saved');
    setSaveError(null);
    saveInFlightRef.current = false;
  };

  const retryInitialLoad = () => {
    setInitialLoadAttempt((current) => current + 1);
  };

  const retryStoryLoad = () => {
    setStoryLoadAttempt((current) => current + 1);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        {isInitialLoading ? (
          <View accessibilityLiveRegion="polite" style={styles.centeredState}>
            <Text style={styles.stateTitle}>Loading bedtime data…</Text>
          </View>
        ) : initialLoadError ? (
          <View style={styles.centeredState}>
            <View style={styles.stateCard}>
              <Text accessibilityRole="header" style={styles.stateTitle}>
                The local API could not be reached
              </Text>
              <Text style={styles.stateMessage}>{initialLoadError}</Text>
              <Text style={styles.stateHint}>
                Verify the local demo launcher and API, then try again.
              </Text>
              <Pressable
                accessibilityLabel="Retry loading bedtime data"
                accessibilityRole="button"
                onPress={retryInitialLoad}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.pressedPrimaryButton,
                ]}
              >
                <Text style={styles.primaryButtonText}>Retry</Text>
              </Pressable>
            </View>
          </View>
        ) : workflowStep === 'summary' && selectedStory ? (
          <ScrollView contentContainerStyle={styles.page}>
            <SessionSummaryCard
              children={children.map((child) => ({
                ...child,
                beforeCalmness: calmnessByChild[child.id]!,
                afterCalmness: calmnessAfterByChild[child.id]!,
              }))}
              elapsedSeconds={elapsedSeconds}
              notesAfter={notesAfter}
              notesBefore={notesBefore}
              onReset={resetSession}
              onSave={() => void saveSession()}
              saveError={saveError}
              saveStatus={saveStatus}
              storyTitle={selectedStory.title}
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

                {selectedStorySummary ? (
                  <>
                    <View style={styles.selectionSummary}>
                      <Text style={styles.summaryLabel}>Selected story</Text>
                      <Text style={styles.summaryValue}>
                        {selectedStorySummary.title}
                      </Text>
                      <Text style={styles.summaryDescription}>
                        {selectedStorySummary.summary}
                      </Text>
                    </View>
                    {isStoryLoading ? (
                      <Text
                        accessibilityLiveRegion="polite"
                        style={styles.storyStatus}
                      >
                        Loading story…
                      </Text>
                    ) : storyLoadError ? (
                      <View style={styles.storyError}>
                        <Text style={styles.validationMessage}>
                          {storyLoadError}
                        </Text>
                        <Pressable
                          accessibilityLabel="Retry loading selected story"
                          accessibilityRole="button"
                          onPress={retryStoryLoad}
                          style={({ pressed }) => [
                            styles.retryButton,
                            pressed && styles.pressedPrimaryButton,
                          ]}
                        >
                          <Text style={styles.primaryButtonText}>Retry story</Text>
                        </Pressable>
                      </View>
                    ) : selectedStory ? (
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
                    ) : null}
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
  centeredState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  stateCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    maxWidth: 520,
    padding: theme.spacing.xl,
    width: '100%',
  },
  stateTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateMessage: {
    color: theme.colors.error,
    lineHeight: 22,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  stateHint: {
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    minHeight: 48,
    paddingHorizontal: theme.spacing.lg,
  },
  storyStatus: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  storyError: {
    alignItems: 'center',
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
