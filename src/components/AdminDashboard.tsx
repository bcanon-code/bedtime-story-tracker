import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { getChildren, getStories } from '../api/bedtimeApi';
import type { ChildDto, StorySummaryDto } from '../api/apiTypes';
import { theme } from '../theme';

interface CatalogState<T> {
  data: T[];
  error: string | null;
  isLoading: boolean;
}

const desktopBreakpoint = 760;
const initialCatalogState = {
  data: [],
  error: null,
  isLoading: true,
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred.';
}

export function AdminDashboard() {
  const { width } = useWindowDimensions();
  const [childrenState, setChildrenState] =
    useState<CatalogState<ChildDto>>(initialCatalogState);
  const [storiesState, setStoriesState] =
    useState<CatalogState<StorySummaryDto>>(initialCatalogState);
  const [childrenAttempt, setChildrenAttempt] = useState(0);
  const [storiesAttempt, setStoriesAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const loadChildren = async () => {
      setChildrenState((current) => ({
        ...current,
        error: null,
        isLoading: true,
      }));

      try {
        const data = await getChildren(controller.signal);
        if (!controller.signal.aborted) {
          setChildrenState({ data, error: null, isLoading: false });
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setChildrenState((current) => ({
            ...current,
            error: getErrorMessage(error),
            isLoading: false,
          }));
        }
      }
    };

    void loadChildren();
    return () => controller.abort();
  }, [childrenAttempt]);

  useEffect(() => {
    const controller = new AbortController();

    const loadStories = async () => {
      setStoriesState((current) => ({
        ...current,
        error: null,
        isLoading: true,
      }));

      try {
        const data = await getStories(controller.signal);
        if (!controller.signal.aborted) {
          setStoriesState({ data, error: null, isLoading: false });
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setStoriesState((current) => ({
            ...current,
            error: getErrorMessage(error),
            isLoading: false,
          }));
        }
      }
    };

    void loadStories();
    return () => controller.abort();
  }, [storiesAttempt]);

  if (width < desktopBreakpoint) {
    return (
      <View style={styles.desktopRequired}>
        <Text accessibilityRole="header" style={styles.heading}>
          Administration requires a wider screen
        </Text>
        <Text style={styles.introduction}>
          This review workspace is designed for desktop-sized windows. Widen
          the window or return to the bedtime workflow.
        </Text>
      </View>
    );
  }

  const sortedChildren = [...childrenState.data].sort(
    (left, right) => left.id - right.id || left.name.localeCompare(right.name),
  );
  const sortedStories = [...storiesState.data].sort(
    (left, right) => left.id - right.id || left.title.localeCompare(right.title),
  );

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.heading}>
            Administration
          </Text>
          <Text style={styles.introduction}>
            Review the reference data used by the Bedtime Story Tracker. This
            desktop layout is a presentation choice, not a security or
            authorization boundary.
          </Text>
        </View>
      </View>

      <View style={styles.catalogGrid}>
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionHeading}>
            Children
          </Text>
          <Text style={styles.sectionDescription}>
            Child editing will be added in the next checkpoint.
          </Text>

          {childrenState.isLoading ? (
            <View accessibilityLiveRegion="polite" style={styles.state}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.stateText}>Loading children…</Text>
            </View>
          ) : childrenState.error ? (
            <View style={styles.state}>
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                Children could not be loaded.
              </Text>
              <Text style={styles.stateText}>{childrenState.error}</Text>
              <Pressable
                accessibilityHint="Tries to load the children catalog again"
                accessibilityLabel="Retry loading children"
                accessibilityRole="button"
                onPress={() => setChildrenAttempt((current) => current + 1)}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.pressedPrimaryButton,
                ]}
              >
                <Text style={styles.primaryButtonText}>Retry children</Text>
              </Pressable>
            </View>
          ) : sortedChildren.length === 0 ? (
            <View style={styles.state}>
              <Text style={styles.emptyTitle}>No children are configured.</Text>
            </View>
          ) : (
            <View style={styles.rows}>
              {sortedChildren.map((child) => (
                <View
                  accessible
                  accessibilityLabel={`Child ${child.name}, ID ${child.id}`}
                  key={child.id}
                  style={styles.row}
                >
                  <View style={styles.rowCopy}>
                    <Text style={styles.recordTitle}>{child.name}</Text>
                    <Text style={styles.metadata}>Child ID {child.id}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionHeading}>
            Stories
          </Text>
          <Text style={styles.sectionDescription}>
            Story editing will be added in a later checkpoint.
          </Text>

          {storiesState.isLoading ? (
            <View accessibilityLiveRegion="polite" style={styles.state}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.stateText}>Loading stories…</Text>
            </View>
          ) : storiesState.error ? (
            <View style={styles.state}>
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                Stories could not be loaded.
              </Text>
              <Text style={styles.stateText}>{storiesState.error}</Text>
              <Pressable
                accessibilityHint="Tries to load the stories catalog again"
                accessibilityLabel="Retry loading stories"
                accessibilityRole="button"
                onPress={() => setStoriesAttempt((current) => current + 1)}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.pressedPrimaryButton,
                ]}
              >
                <Text style={styles.primaryButtonText}>Retry stories</Text>
              </Pressable>
            </View>
          ) : sortedStories.length === 0 ? (
            <View style={styles.state}>
              <Text style={styles.emptyTitle}>No stories are configured.</Text>
            </View>
          ) : (
            <View style={styles.rows}>
              {sortedStories.map((story) => (
                <View
                  accessible
                  accessibilityLabel={`${story.title}. Theme ${story.theme}. Estimated reading time ${story.readingMinutes} minutes. ${story.summary}`}
                  key={story.id}
                  style={styles.row}
                >
                  <View style={styles.rowCopy}>
                    <Text style={styles.recordTitle}>{story.title}</Text>
                    <Text style={styles.recordSummary}>{story.summary}</Text>
                    <Text style={styles.metadata}>
                      {story.theme} · {story.readingMinutes} min · Story ID{' '}
                      {story.id}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    alignSelf: 'center',
    gap: theme.spacing.lg,
    maxWidth: 1200,
    padding: theme.spacing.xl,
    width: '100%',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
  },
  heading: {
    color: theme.colors.textPrimary,
    fontSize: 30,
    fontWeight: '700',
  },
  introduction: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginTop: theme.spacing.sm,
    maxWidth: 720,
  },
  catalogGrid: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    padding: theme.spacing.lg,
  },
  sectionHeading: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  sectionDescription: {
    color: theme.colors.textSecondary,
    lineHeight: 21,
    marginTop: theme.spacing.xs,
  },
  rows: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  row: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  rowCopy: {
    minWidth: 0,
  },
  recordTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  recordSummary: {
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
  metadata: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
  },
  state: {
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.sm,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  stateText: {
    color: theme.colors.textSecondary,
    lineHeight: 21,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 17,
    fontWeight: '700',
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: theme.spacing.lg,
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontWeight: '700',
  },
  pressedPrimaryButton: {
    backgroundColor: theme.colors.primaryPressed,
  },
  desktopRequired: {
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    maxWidth: 600,
    minHeight: '100%',
    padding: theme.spacing.xl,
  },
});
