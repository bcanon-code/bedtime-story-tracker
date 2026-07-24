import { ReactNode, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { theme } from '../theme';

export type AppDestination = 'tracker' | 'history' | 'settings' | 'admin';
type NavigationSection = 'primary' | 'administration' | 'utility';

interface NavigationItem {
  accessibilityLabel: string;
  desktopOnly?: boolean;
  destination: AppDestination;
  label: string;
  section: NavigationSection;
}

export const desktopBreakpoint = 760;

const navigationItems: readonly NavigationItem[] = [
  { accessibilityLabel: 'Open Bedtime Tracker', destination: 'tracker', label: 'Bedtime Tracker', section: 'primary' },
  { accessibilityLabel: 'Open Completed Sessions', destination: 'history', label: 'Completed Sessions', section: 'primary' },
  { accessibilityLabel: 'Open Administration', desktopOnly: true, destination: 'admin', label: 'Administration', section: 'administration' },
  { accessibilityLabel: 'Open Settings', destination: 'settings', label: 'Settings', section: 'utility' },
] as const;

interface AppNavigationShellProps {
  activeDestination: AppDestination;
  children: ReactNode;
  onNavigate: (destination: AppDestination) => void;
}

function NavigationButton({
  activeDestination,
  item,
  onSelect,
}: {
  activeDestination: AppDestination;
  item: NavigationItem;
  onSelect: (destination: AppDestination) => void;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const isSelected = activeDestination === item.destination;

  return (
    <Pressable
      accessibilityLabel={item.accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onBlur={() => setIsFocused(false)}
      onFocus={() => setIsFocused(true)}
      onPress={() => onSelect(item.destination)}
      style={({ pressed }) => [
        styles.navigationButton,
        isSelected && styles.navigationButtonSelected,
        pressed && styles.navigationButtonPressed,
        isFocused && styles.navigationButtonFocused,
      ]}
    >
      <Text style={[styles.navigationButtonText, isSelected && styles.navigationButtonTextSelected]}>
        {item.label}
      </Text>
    </Pressable>
  );
}

export function AppNavigationShell({
  activeDestination,
  children,
  onNavigate,
}: AppNavigationShellProps) {
  const { width } = useWindowDimensions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isDesktop = width >= desktopBreakpoint;

  useEffect(() => {
    if (isDesktop) setIsMenuOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isMenuOpen]);

  const selectDestination = (destination: AppDestination) => {
    onNavigate(destination);
    setIsMenuOpen(false);
  };

  const renderSection = (section: NavigationSection, includeDesktopOnly: boolean) => {
    const items = navigationItems.filter(
      (item) => item.section === section && (includeDesktopOnly || !item.desktopOnly),
    );
    if (items.length === 0) return null;

    return (
      <View style={section === 'utility' ? styles.utilitySection : styles.section}>
        {section !== 'utility' ? (
          <Text style={styles.sectionLabel}>{section === 'primary' ? 'Main' : 'Administration'}</Text>
        ) : null}
        {items.map((item) => (
          <NavigationButton
            activeDestination={activeDestination}
            item={item}
            key={item.destination}
            onSelect={selectDestination}
          />
        ))}
      </View>
    );
  };

  if (isDesktop) {
    return (
      <View style={styles.desktopShell}>
        <View accessibilityLabel="Application navigation" style={styles.sidebar}>
          <View>
            <Text style={styles.productName}>Bedtime Story Tracker</Text>
            {renderSection('primary', true)}
            {renderSection('administration', true)}
          </View>
          {renderSection('utility', true)}
        </View>
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.narrowShell}>
      <View style={styles.narrowHeader}>
        <Text numberOfLines={1} style={styles.narrowTitle}>Bedtime Story Tracker</Text>
        <Pressable
          accessibilityLabel="Open application menu"
          accessibilityRole="button"
          onPress={() => setIsMenuOpen(true)}
          style={({ pressed }) => [styles.menuButton, pressed && styles.navigationButtonPressed]}
        >
          <Text style={styles.menuButtonText}>Menu</Text>
        </Pressable>
      </View>
      <View style={styles.content}>{children}</View>
      {isMenuOpen ? (
        <View accessibilityViewIsModal style={styles.menuOverlay}>
          <Pressable
            accessibilityLabel="Close application menu"
            accessibilityRole="button"
            onPress={() => setIsMenuOpen(false)}
            style={styles.overlayDismiss}
          />
          <View accessibilityLabel="Application menu" style={styles.menuPanel}>
            <View style={styles.menuPanelHeader}>
              <Text accessibilityRole="header" style={styles.menuPanelTitle}>Menu</Text>
              <Pressable
                accessibilityLabel="Close application menu"
                accessibilityRole="button"
                onPress={() => setIsMenuOpen(false)}
                style={({ pressed }) => [styles.closeButton, pressed && styles.navigationButtonPressed]}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>
            {renderSection('primary', false)}
            {renderSection('utility', false)}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  desktopShell: { flex: 1, flexDirection: 'row' },
  sidebar: {
    backgroundColor: theme.colors.surface,
    borderRightColor: theme.colors.border,
    borderRightWidth: 1,
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    width: 232,
  },
  productName: {
    color: theme.colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 25,
    marginBottom: theme.spacing.xl,
  },
  section: { gap: theme.spacing.xs, marginBottom: theme.spacing.lg },
  utilitySection: { gap: theme.spacing.xs },
  sectionLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  navigationButton: {
    borderColor: 'transparent',
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: theme.spacing.md,
  },
  navigationButtonSelected: { backgroundColor: theme.colors.selected },
  navigationButtonPressed: { backgroundColor: theme.colors.surfacePressed },
  navigationButtonFocused: { borderColor: theme.colors.primary },
  navigationButtonText: { color: theme.colors.textSecondary, fontSize: 15, fontWeight: '700' },
  navigationButtonTextSelected: { color: theme.colors.textPrimary },
  content: { flex: 1, minWidth: 0 },
  narrowShell: { flex: 1 },
  narrowHeader: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 62,
    paddingHorizontal: theme.spacing.md,
  },
  narrowTitle: {
    color: theme.colors.textPrimary,
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    marginRight: theme.spacing.sm,
  },
  menuButton: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: theme.spacing.md,
  },
  menuButtonText: { color: theme.colors.textPrimary, fontWeight: '700' },
  menuOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    zIndex: 10,
  },
  overlayDismiss: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  menuPanel: {
    backgroundColor: theme.colors.surface,
    borderLeftColor: theme.colors.border,
    borderLeftWidth: 1,
    flex: 1,
    padding: theme.spacing.lg,
    width: '86%',
    maxWidth: 340,
  },
  menuPanelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  menuPanelTitle: { color: theme.colors.textPrimary, fontSize: 26, fontWeight: '700' },
  closeButton: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
  },
  closeButtonText: { color: theme.colors.textPrimary, fontWeight: '700' },
});
