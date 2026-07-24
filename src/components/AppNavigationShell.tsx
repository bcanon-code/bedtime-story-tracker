import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ComponentProps, ReactNode, useEffect, useRef, useState } from 'react';
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
type NavigationSection = 'main' | 'administration' | 'system';
type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

interface NavigationItem {
  desktopOnly?: boolean;
  destination: AppDestination;
  iconName: MaterialIconName;
  label: string;
  screenTitle: string;
  section: NavigationSection;
}

export const desktopBreakpoint = 760;

const navigationItems: readonly NavigationItem[] = [
  {
    destination: 'tracker',
    iconName: 'menu-book',
    label: 'Bedtime Tracker',
    screenTitle: 'Bedtime Tracker',
    section: 'main',
  },
  {
    destination: 'history',
    iconName: 'history',
    label: 'Completed Sessions',
    screenTitle: 'Completed Sessions',
    section: 'main',
  },
  {
    desktopOnly: true,
    destination: 'admin',
    iconName: 'groups',
    label: 'Children',
    screenTitle: 'Children administration',
    section: 'administration',
  },
  {
    destination: 'settings',
    iconName: 'settings',
    label: 'Settings',
    screenTitle: 'Settings',
    section: 'system',
  },
] as const;

const sectionLabels: Record<NavigationSection, string> = {
  main: 'Main',
  administration: 'Administration',
  system: 'System',
};

interface AppNavigationShellProps {
  activeDestination: AppDestination;
  children: ReactNode;
  onNavigate: (destination: AppDestination) => void;
}

function focusControl(control: View | null) {
  if (Platform.OS === 'web') {
    (control as unknown as { focus?: () => void } | null)?.focus?.();
  }
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
  const contentColor = isSelected
    ? theme.colors.textPrimary
    : theme.colors.textSecondary;

  return (
    <Pressable
      accessibilityLabel={`Open ${item.label}`}
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
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.selectedIndicator, isSelected && styles.selectedIndicatorVisible]}
      />
      <MaterialIcons
        accessibilityElementsHidden
        color={contentColor}
        importantForAccessibility="no-hide-descendants"
        name={item.iconName}
        size={21}
      />
      <Text
        style={[
          styles.navigationButtonText,
          isSelected && styles.navigationButtonTextSelected,
        ]}
      >
        {item.label}
      </Text>
      {isSelected ? (
        <Text accessibilityElementsHidden style={styles.currentLabel}>
          Current
        </Text>
      ) : null}
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
  const menuButtonRef = useRef<View>(null);
  const closeButtonRef = useRef<View>(null);
  const isDesktop = width >= desktopBreakpoint;
  const activeItem =
    navigationItems.find((item) => item.destination === activeDestination) ??
    navigationItems[0];

  const closeMenu = (restoreFocus = true) => {
    setIsMenuOpen(false);
    if (restoreFocus) {
      setTimeout(() => focusControl(menuButtonRef.current), 0);
    }
  };

  useEffect(() => {
    if (isDesktop) setIsMenuOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const focusTimer = setTimeout(() => focusControl(closeButtonRef.current), 0);
    return () => clearTimeout(focusTimer);
  }, [isMenuOpen]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isMenuOpen]);

  const selectDestination = (destination: AppDestination) => {
    onNavigate(destination);
    closeMenu();
  };

  const renderSection = (
    section: NavigationSection,
    includeDesktopOnly: boolean,
  ) => {
    const items = navigationItems.filter(
      (item) =>
        item.section === section && (includeDesktopOnly || !item.desktopOnly),
    );
    if (items.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{sectionLabels[section]}</Text>
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
        <View
          accessibilityLabel="Application navigation"
          style={styles.sidebar}
        >
          <View>
            <View style={styles.brand}>
              <MaterialIcons
                accessibilityElementsHidden
                color={theme.colors.primary}
                importantForAccessibility="no-hide-descendants"
                name="bedtime"
                size={25}
              />
              <Text style={styles.productName}>Bedtime Story Tracker</Text>
            </View>
            {renderSection('main', true)}
            {renderSection('administration', true)}
          </View>
          {renderSection('system', true)}
        </View>
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.narrowShell}>
      <View style={styles.narrowHeader}>
        <View style={styles.narrowTitleGroup}>
          <MaterialIcons
            accessibilityElementsHidden
            color={theme.colors.primary}
            importantForAccessibility="no-hide-descendants"
            name={activeItem.iconName}
            size={21}
          />
          <Text numberOfLines={1} style={styles.narrowTitle}>
            {activeItem.screenTitle}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Open application menu"
          accessibilityRole="button"
          onPress={() => setIsMenuOpen(true)}
          ref={menuButtonRef}
          style={({ pressed }) => [
            styles.menuButton,
            pressed && styles.navigationButtonPressed,
          ]}
        >
          <MaterialIcons
            accessibilityElementsHidden
            color={theme.colors.textPrimary}
            importantForAccessibility="no-hide-descendants"
            name="menu"
            size={22}
          />
          <Text style={styles.menuButtonText}>Menu</Text>
        </Pressable>
      </View>
      <View style={styles.content}>{children}</View>
      {isMenuOpen ? (
        <View
          accessibilityLabel="Application menu"
          accessibilityViewIsModal
          style={styles.menuOverlay}
        >
          <Pressable
            accessibilityLabel="Close application menu"
            accessibilityRole="button"
            onPress={() => closeMenu()}
            style={styles.overlayDismiss}
          />
          <View style={styles.menuPanel}>
            <View style={styles.menuPanelHeader}>
              <Text accessibilityRole="header" style={styles.menuPanelTitle}>
                Navigation
              </Text>
              <Pressable
                accessibilityLabel="Close application menu"
                accessibilityRole="button"
                onPress={() => closeMenu()}
                ref={closeButtonRef}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.navigationButtonPressed,
                ]}
              >
                <MaterialIcons
                  accessibilityElementsHidden
                  color={theme.colors.textPrimary}
                  importantForAccessibility="no-hide-descendants"
                  name="close"
                  size={21}
                />
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>
            {renderSection('main', false)}
            {renderSection('system', false)}
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
    width: 252,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  productName: {
    color: theme.colors.textPrimary,
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  section: { gap: theme.spacing.xs, marginBottom: theme.spacing.lg },
  sectionLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  navigationButton: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 48,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.md,
    position: 'relative',
  },
  navigationButtonSelected: {
    backgroundColor: theme.colors.selected,
    borderColor: theme.colors.primary,
  },
  navigationButtonPressed: { backgroundColor: theme.colors.surfacePressed },
  navigationButtonFocused: { borderColor: theme.colors.primary },
  selectedIndicator: {
    backgroundColor: 'transparent',
    bottom: 7,
    left: 0,
    position: 'absolute',
    top: 7,
    width: 3,
  },
  selectedIndicatorVisible: { backgroundColor: theme.colors.primary },
  navigationButtonText: {
    color: theme.colors.textSecondary,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  navigationButtonTextSelected: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  currentLabel: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  content: { flex: 1, minWidth: 0 },
  narrowShell: { flex: 1 },
  narrowHeader: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
    minHeight: 62,
    paddingHorizontal: theme.spacing.md,
  },
  narrowTitleGroup: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minWidth: 0,
  },
  narrowTitle: {
    color: theme.colors.textPrimary,
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  menuButton: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 88,
    paddingHorizontal: theme.spacing.md,
  },
  menuButtonText: { color: theme.colors.textPrimary, fontWeight: '700' },
  menuOverlay: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
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
    maxWidth: 340,
    padding: theme.spacing.lg,
    width: '88%',
  },
  menuPanelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  menuPanelTitle: {
    color: theme.colors.textPrimary,
    flex: 1,
    fontSize: 25,
    fontWeight: '700',
  },
  closeButton: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
  },
  closeButtonText: { color: theme.colors.textPrimary, fontWeight: '700' },
});
