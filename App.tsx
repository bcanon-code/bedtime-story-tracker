import { StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>Bedtime Story Tracker</Text>
          <Text style={styles.message}>
            The baseline is ready for the Tier 1 workflow.
          </Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: '#f4f0ff',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    maxWidth: 520,
    padding: 32,
    width: '100%',
  },
  title: {
    color: '#2f2454',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: '#5d5575',
    fontSize: 17,
    lineHeight: 26,
    marginTop: 12,
    textAlign: 'center',
  },
});
