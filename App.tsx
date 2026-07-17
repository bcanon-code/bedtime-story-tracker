import { useState } from 'react';
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

export default function App() {
  const [selectedStoryId, setSelectedStoryId] = useState<Story['id'] | null>(
    null,
  );
  const [calmnessByChild, setCalmnessByChild] =
    useState<CalmnessByChild>({});
  const [notesBefore, setNotesBefore] = useState('');

  const selectedStory = stories.find(
    (story) => story.id === selectedStoryId,
  );

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

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.page}>
          <View style={styles.card}>
            <Text style={styles.title}>Bedtime Story Tracker</Text>
            <Text style={styles.introduction}>
              Record how calm each child feels, then choose tonight&apos;s story.
            </Text>

            <View style={styles.checkIn}>
              <Text style={styles.heading}>Before reading</Text>
              <Text style={styles.checkInPrompt}>
                How calm does each child feel? 1 is very restless and 5 is
                very calm.
              </Text>

              {children.map((child) => (
                <View key={child.id} style={styles.childCheckIn}>
                  <Text style={styles.childName}>{child.name}</Text>
                  <View style={styles.calmnessRow}>
                    {calmnessValues.map((value) => {
                      const isSelected = calmnessByChild[child.id] === value;

                      return (
                        <Pressable
                          accessibilityLabel={`${child.name} calmness ${value}`}
                          accessibilityRole="button"
                          key={value}
                          onPress={() => setChildCalmness(child.id, value)}
                          style={[
                            styles.calmnessButton,
                            isSelected && styles.selectedCalmness,
                          ]}
                        >
                          <Text
                            style={[
                              styles.calmnessText,
                              isSelected && styles.selectedCalmnessText,
                            ]}
                          >
                            {value}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              <Text style={styles.notesLabel}>Optional notes</Text>
              <TextInput
                accessibilityLabel="Pre-reading notes"
                multiline
                onChangeText={setNotesBefore}
                placeholder="Anything helpful to remember before reading?"
                style={styles.notesInput}
                value={notesBefore}
              />
            </View>

            <Text style={styles.heading}>Choose a story</Text>
            <View style={styles.storyList}>
              {stories.map((story) => {
                const isSelected = story.id === selectedStoryId;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={story.id}
                    onPress={() => selectStory(story.id)}
                    style={[styles.storyButton, isSelected && styles.selectedStory]}
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
                  </Pressable>
                );
              })}
            </View>

            {selectedStory ? (
              <View style={styles.selectionSummary}>
                <Text style={styles.summaryLabel}>Selected story</Text>
                <Text style={styles.summaryValue}>{selectedStory.title}</Text>
              </View>
            ) : (
              <Text style={styles.prompt}>Select a story to continue.</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f4f0ff',
    flex: 1,
  },
  page: {
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    maxWidth: 620,
    padding: 28,
    width: '100%',
  },
  title: {
    color: '#2f2454',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  introduction: {
    color: '#5d5575',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
    textAlign: 'center',
  },
  heading: {
    color: '#2f2454',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 26,
  },
  storyList: {
    gap: 10,
  },
  storyButton: {
    borderColor: '#c9c1df',
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
  },
  selectedStory: {
    backgroundColor: '#51407e',
    borderColor: '#51407e',
  },
  storyTitle: {
    color: '#2f2454',
    fontSize: 18,
    fontWeight: '700',
  },
  storyDescription: {
    color: '#5d5575',
    lineHeight: 21,
    marginTop: 4,
  },
  selectedStoryText: {
    color: '#ffffff',
  },
  selectionSummary: {
    backgroundColor: '#f4f0ff',
    borderRadius: 10,
    marginTop: 18,
    padding: 14,
  },
  summaryLabel: {
    color: '#6b6185',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#2f2454',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 3,
  },
  prompt: {
    color: '#6b6185',
    marginTop: 16,
    textAlign: 'center',
  },
  checkIn: {
    marginTop: 0,
  },
  checkInPrompt: {
    color: '#5d5575',
    lineHeight: 22,
    marginBottom: 18,
  },
  childCheckIn: {
    marginBottom: 18,
  },
  childName: {
    color: '#2f2454',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  calmnessRow: {
    flexDirection: 'row',
    gap: 10,
  },
  calmnessButton: {
    alignItems: 'center',
    borderColor: '#9e93ba',
    borderRadius: 22,
    borderWidth: 2,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  selectedCalmness: {
    backgroundColor: '#51407e',
    borderColor: '#51407e',
  },
  calmnessText: {
    color: '#51407e',
    fontSize: 16,
    fontWeight: '700',
  },
  selectedCalmnessText: {
    color: '#ffffff',
  },
  notesLabel: {
    color: '#2f2454',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  notesInput: {
    borderColor: '#9e93ba',
    borderRadius: 10,
    borderWidth: 1,
    color: '#2f2454',
    minHeight: 96,
    padding: 12,
    textAlignVertical: 'top',
  },
});
