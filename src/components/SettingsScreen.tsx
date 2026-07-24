import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getHealth, getVersion } from '../api/bedtimeApi';
import type { HealthResponse, VersionResponse } from '../api/apiTypes';
import { buildInfo } from '../config/buildInfo';
import { theme } from '../theme';

interface DiagnosticsState {
  checkedAt: Date | null;
  health: HealthResponse | null;
  isLoading: boolean;
  version: VersionResponse | null;
}

const initialDiagnostics: DiagnosticsState = {
  checkedAt: null,
  health: null,
  isLoading: true,
  version: null,
};

function displayValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === '' ? 'Unavailable' : String(value);
}

function displayTimestamp(value: string | null | undefined) {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleString();
}

function InformationRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <View style={styles.informationRow}>
      <Text style={styles.informationLabel}>{label}</Text>
      <Text selectable style={styles.informationValue}>{displayValue(value)}</Text>
    </View>
  );
}

export function SettingsScreen() {
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>(initialDiagnostics);

  useEffect(() => {
    const controller = new AbortController();
    const loadDiagnostics = async () => {
      setDiagnostics((current) => ({ ...current, isLoading: true }));
      const [versionResult, healthResult] = await Promise.allSettled([
        getVersion(controller.signal),
        getHealth(controller.signal),
      ]);
      if (controller.signal.aborted) return;
      setDiagnostics({
        checkedAt: new Date(),
        health: healthResult.status === 'fulfilled' ? healthResult.value : null,
        isLoading: false,
        version: versionResult.status === 'fulfilled' ? versionResult.value : null,
      });
    };
    void loadDiagnostics();
    return () => controller.abort();
  }, [loadAttempt]);

  const apiAvailable = diagnostics.version !== null || diagnostics.health !== null;
  const databaseStatus = diagnostics.health?.database.status ?? 'unavailable';

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.heading}>Settings</Text>
          <Text style={styles.introduction}>Current application information and safe service diagnostics.</Text>
        </View>
        <Pressable
          accessibilityLabel="Refresh service diagnostics"
          accessibilityRole="button"
          accessibilityState={{ disabled: diagnostics.isLoading }}
          disabled={diagnostics.isLoading}
          onPress={() => setLoadAttempt((current) => current + 1)}
          style={({ pressed }) => [
            styles.refreshButton,
            diagnostics.isLoading && styles.disabledButton,
            pressed && !diagnostics.isLoading && styles.pressedButton,
          ]}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>Application information</Text>
        <InformationRow label="Frontend version" value={buildInfo.version} />
        <InformationRow label="Frontend build" value={buildInfo.build} />
        <InformationRow label="Frontend Git revision" value={`${buildInfo.gitSha}${buildInfo.dirty ? ' (dirty/local)' : ''}`} />
        <InformationRow label="Frontend environment" value={buildInfo.environment} />
        <InformationRow label="Frontend build time" value={displayTimestamp(buildInfo.builtAtUtc)} />
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>API information</Text>
        <View accessibilityLiveRegion="polite" style={styles.statusRow}>
          {diagnostics.isLoading ? <ActivityIndicator color={theme.colors.primary} size="small" /> : null}
          <Text style={[
            styles.statusText,
            !diagnostics.isLoading && (apiAvailable ? styles.available : styles.unavailable),
          ]}>
            {diagnostics.isLoading ? 'Checking API…' : apiAvailable ? 'Available' : 'Unavailable'}
          </Text>
        </View>
        <InformationRow label="API version" value={diagnostics.version?.version} />
        <InformationRow label="API build" value={diagnostics.version?.build} />
        <InformationRow
          label="API Git revision"
          value={diagnostics.version ? `${diagnostics.version.gitSha}${diagnostics.version.gitDirty ? ' (dirty/local)' : ''}` : null}
        />
        <InformationRow label="API environment" value={diagnostics.version?.environment} />
        <InformationRow label="API build time" value={displayTimestamp(diagnostics.version?.builtAtUtc)} />
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>Database diagnostics</Text>
        <Text accessibilityLiveRegion="polite" style={styles.diagnosticSummary}>
          {diagnostics.isLoading
            ? 'Checking database connectivity…'
            : databaseStatus === 'connected'
              ? 'Connected'
              : databaseStatus === 'notConfigured'
                ? 'Not configured'
                : 'Unavailable'}
        </Text>
        <InformationRow label="Provider" value={diagnostics.health?.database.provider} />
        <InformationRow label="Last checked" value={diagnostics.checkedAt?.toLocaleString()} />
        <Text style={styles.safetyNote}>Connection credentials and server details are intentionally not exposed.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { alignSelf: 'center', gap: theme.spacing.lg, maxWidth: 920, padding: theme.spacing.xl, width: '100%' },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: theme.spacing.md, justifyContent: 'space-between' },
  headerCopy: { flex: 1 },
  heading: { color: theme.colors.textPrimary, fontSize: 30, fontWeight: '700' },
  introduction: { color: theme.colors.textSecondary, lineHeight: 22, marginTop: theme.spacing.sm },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 108,
    paddingHorizontal: theme.spacing.lg,
  },
  refreshButtonText: { color: theme.colors.background, fontSize: 16, fontWeight: '700' },
  disabledButton: { backgroundColor: theme.colors.disabled },
  pressedButton: { backgroundColor: theme.colors.primaryPressed },
  section: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.lg,
  },
  sectionHeading: { color: theme.colors.textPrimary, fontSize: 21, fontWeight: '700', marginBottom: theme.spacing.sm },
  informationRow: { borderTopColor: theme.colors.border, borderTopWidth: 1, gap: theme.spacing.xs, paddingVertical: theme.spacing.sm },
  informationLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  informationValue: { color: theme.colors.textPrimary, fontSize: 16 },
  statusRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  statusText: { color: theme.colors.textSecondary, fontSize: 17, fontWeight: '700' },
  available: { color: theme.colors.success },
  unavailable: { color: theme.colors.error },
  diagnosticSummary: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: theme.spacing.sm },
  safetyNote: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: theme.spacing.sm },
});
