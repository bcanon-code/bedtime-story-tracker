import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { ChildDto, ChildWriteRequest } from '../api/apiTypes';
import {
  ChildApiError,
  createChild,
  deleteChild,
  updateChild,
} from '../api/bedtimeApi';
import { theme } from '../theme';

interface ChildAdminSectionProps {
  children: ChildDto[];
  error: string | null;
  isLoading: boolean;
  onRefresh: () => void;
}

type FormMode = { kind: 'create' } | { kind: 'edit'; child: ChildDto };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

export function ChildAdminSection({
  children,
  error,
  isLoading,
  onRefresh,
}: ChildAdminSectionProps) {
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChildDto | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const beginCreate = () => {
    setDeleteTarget(null);
    setMutationError(null);
    setSuccessMessage(null);
    setFormMode({ kind: 'create' });
  };

  const beginEdit = (child: ChildDto) => {
    setDeleteTarget(null);
    setMutationError(null);
    setSuccessMessage(null);
    setFormMode({ kind: 'edit', child });
  };

  const save = async (request: ChildWriteRequest) => {
    if (!formMode || isMutating) return;
    setIsMutating(true);
    setMutationError(null);
    setSuccessMessage(null);
    try {
      const saved =
        formMode.kind === 'create'
          ? await createChild(request)
          : await updateChild(formMode.child.id, request);
      setSuccessMessage(
        formMode.kind === 'create'
          ? `${saved.name} was added.`
          : `${saved.name} was updated.`,
      );
      setFormMode(null);
      onRefresh();
    } catch (saveError: unknown) {
      setMutationError(errorMessage(saveError));
      throw saveError;
    } finally {
      setIsMutating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || isMutating) return;
    setIsMutating(true);
    setMutationError(null);
    setSuccessMessage(null);
    try {
      await deleteChild(deleteTarget.id);
      setSuccessMessage(`${deleteTarget.name} was deleted.`);
      setDeleteTarget(null);
      onRefresh();
    } catch (deleteError: unknown) {
      setMutationError(errorMessage(deleteError));
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.headingCopy}>
          <Text accessibilityRole="header" style={styles.sectionHeading}>
            Children
          </Text>
          <Text style={styles.sectionDescription}>
            Add and maintain the children available in the bedtime workflow.
          </Text>
        </View>
        {!formMode ? (
          <ActionButton
            accessibilityHint="Opens a form for adding a child"
            label="Add child"
            onPress={beginCreate}
            primary
          />
        ) : null}
      </View>

      {successMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.successText}>
          {successMessage}
        </Text>
      ) : null}
      {mutationError ? (
        <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
          {mutationError}
        </Text>
      ) : null}

      {formMode ? (
        <ChildForm
          isSubmitting={isMutating}
          key={formMode.kind === 'edit' ? formMode.child.id : 'create'}
          mode={formMode}
          onCancel={() => {
            setFormMode(null);
            setMutationError(null);
          }}
          onSave={save}
        />
      ) : null}

      {deleteTarget ? (
        <View accessibilityLiveRegion="polite" style={styles.confirmation}>
          <Text accessibilityRole="header" style={styles.confirmationTitle}>
            Delete {deleteTarget.name}?
          </Text>
          <Text style={styles.confirmationCopy}>
            This action cannot be undone. Children referenced by completed
            sessions cannot be deleted.
          </Text>
          <View style={styles.buttonRow}>
            <ActionButton
              destructive
              disabled={isMutating}
              label={isMutating ? 'Deleting…' : 'Delete'}
              onPress={() => void confirmDelete()}
            />
            <ActionButton
              disabled={isMutating}
              label="Cancel"
              onPress={() => setDeleteTarget(null)}
            />
          </View>
        </View>
      ) : null}

      {isLoading ? (
        <View accessibilityLiveRegion="polite" style={styles.state}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading children…</Text>
        </View>
      ) : error ? (
        <View style={styles.state}>
          <Text accessibilityLiveRegion="polite" style={styles.errorText}>
            Children could not be loaded.
          </Text>
          <Text style={styles.stateText}>{error}</Text>
          <ActionButton label="Retry children" onPress={onRefresh} primary />
        </View>
      ) : children.length === 0 ? (
        <View style={styles.state}>
          <Text style={styles.recordTitle}>No children are configured.</Text>
        </View>
      ) : (
        <View style={styles.rows}>
          {children.map((child) => (
            <View key={child.id} style={styles.row}>
              <View
                accessible
                accessibilityLabel={`${child.name}, display order ${child.displayOrder}`}
                style={styles.rowCopy}
              >
                <Text style={styles.recordTitle}>{child.name}</Text>
                <Text style={styles.metadata}>
                  Display order {child.displayOrder} · Child ID {child.id}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <ActionButton
                  accessibilityHint={`Edits ${child.name}`}
                  disabled={isMutating}
                  label="Edit"
                  onPress={() => beginEdit(child)}
                />
                <ActionButton
                  accessibilityHint={`Opens deletion confirmation for ${child.name}`}
                  destructive
                  disabled={isMutating}
                  label="Delete"
                  onPress={() => {
                    setFormMode(null);
                    setMutationError(null);
                    setSuccessMessage(null);
                    setDeleteTarget(child);
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ChildForm({
  isSubmitting,
  mode,
  onCancel,
  onSave,
}: {
  isSubmitting: boolean;
  mode: FormMode;
  onCancel: () => void;
  onSave: (request: ChildWriteRequest) => Promise<void>;
}) {
  const [name, setName] = useState(mode.kind === 'edit' ? mode.child.name : '');
  const [displayOrder, setDisplayOrder] = useState(
    mode.kind === 'edit' ? String(mode.child.displayOrder) : '',
  );
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string[]>>({});

  const normalizedName = name.trim();
  const parsedOrder = Number(displayOrder);
  const nameError =
    normalizedName.length === 0
      ? 'Name is required.'
      : normalizedName.length > 100
        ? 'Name must be 100 characters or fewer.'
        : null;
  const orderError =
    !Number.isInteger(parsedOrder) || parsedOrder < 1 || parsedOrder > 10_000
      ? 'Display order must be a whole number from 1 to 10000.'
      : null;
  const isValid = !nameError && !orderError;

  const submit = async () => {
    if (!isValid || isSubmitting) return;
    setServerFieldErrors({});
    try {
      await onSave({ name: normalizedName, displayOrder: parsedOrder });
    } catch (saveError: unknown) {
      if (saveError instanceof ChildApiError) {
        setServerFieldErrors(saveError.fieldErrors);
      }
    }
  };

  return (
    <View
      accessibilityLabel={mode.kind === 'create' ? 'Add child form' : `Edit ${mode.child.name} form`}
      style={styles.form}
    >
      <Text accessibilityRole="header" style={styles.formTitle}>
        {mode.kind === 'create' ? 'Add child' : `Edit ${mode.child.name}`}
      </Text>
      <View style={styles.field}>
        <Text nativeID="child-name-label" style={styles.label}>Name</Text>
        <TextInput
          accessibilityLabelledBy="child-name-label"
          autoFocus
          editable={!isSubmitting}
          maxLength={101}
          onChangeText={setName}
          placeholder="Fictional child name"
          placeholderTextColor={theme.colors.disabled}
          style={styles.input}
          value={name}
        />
        {nameError || serverFieldErrors.Name?.[0] ? (
          <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
            {nameError ?? serverFieldErrors.Name[0]}
          </Text>
        ) : null}
      </View>
      <View style={styles.field}>
        <Text nativeID="display-order-label" style={styles.label}>Display order</Text>
        <TextInput
          accessibilityLabelledBy="display-order-label"
          editable={!isSubmitting}
          inputMode="numeric"
          onChangeText={setDisplayOrder}
          placeholder="1"
          placeholderTextColor={theme.colors.disabled}
          style={styles.input}
          value={displayOrder}
        />
        {orderError || serverFieldErrors.DisplayOrder?.[0] ? (
          <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
            {orderError ?? serverFieldErrors.DisplayOrder[0]}
          </Text>
        ) : null}
      </View>
      <View style={styles.buttonRow}>
        <ActionButton
          disabled={!isValid || isSubmitting}
          label={isSubmitting ? 'Saving…' : 'Save'}
          onPress={() => void submit()}
          primary
        />
        <ActionButton disabled={isSubmitting} label="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}

function ActionButton({
  accessibilityHint,
  destructive = false,
  disabled = false,
  label,
  onPress,
  primary = false,
}: {
  accessibilityHint?: string;
  destructive?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onBlur={() => setIsFocused(false)}
      onFocus={() => setIsFocused(true)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary && styles.primaryButton,
        destructive && styles.destructiveButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressedButton,
        isFocused && styles.focusedButton,
      ]}
    >
      <Text style={[styles.buttonText, primary && styles.primaryButtonText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    padding: theme.spacing.lg,
  },
  sectionHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: theme.spacing.md, justifyContent: 'space-between' },
  headingCopy: { flex: 1, minWidth: 0 },
  sectionHeading: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '700' },
  sectionDescription: { color: theme.colors.textSecondary, lineHeight: 21, marginTop: theme.spacing.xs },
  successText: { color: theme.colors.success, fontWeight: '700', marginTop: theme.spacing.md },
  errorText: { color: theme.colors.error, fontSize: 16, fontWeight: '700', marginTop: theme.spacing.md },
  form: { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border, borderRadius: theme.radius.sm, borderWidth: 1, gap: theme.spacing.md, marginTop: theme.spacing.lg, padding: theme.spacing.lg },
  formTitle: { color: theme.colors.textPrimary, fontSize: 19, fontWeight: '700' },
  field: { gap: theme.spacing.xs },
  label: { color: theme.colors.textPrimary, fontWeight: '700' },
  input: { backgroundColor: theme.colors.background, borderColor: theme.colors.border, borderRadius: theme.radius.sm, borderWidth: 2, color: theme.colors.textPrimary, minHeight: 46, paddingHorizontal: theme.spacing.md },
  fieldError: { color: theme.colors.error, lineHeight: 20 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  button: { alignItems: 'center', borderColor: theme.colors.border, borderRadius: theme.radius.sm, borderWidth: 2, justifyContent: 'center', minHeight: 44, minWidth: 76, paddingHorizontal: theme.spacing.md },
  primaryButton: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  destructiveButton: { borderColor: theme.colors.error },
  disabledButton: { opacity: 0.5 },
  pressedButton: { backgroundColor: theme.colors.surfacePressed },
  focusedButton: { borderColor: theme.colors.primary },
  buttonText: { color: theme.colors.textPrimary, fontWeight: '700' },
  primaryButtonText: { color: theme.colors.background },
  confirmation: { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.error, borderRadius: theme.radius.sm, borderWidth: 1, gap: theme.spacing.sm, marginTop: theme.spacing.lg, padding: theme.spacing.lg },
  confirmationTitle: { color: theme.colors.textPrimary, fontSize: 19, fontWeight: '700' },
  confirmationCopy: { color: theme.colors.textSecondary, lineHeight: 21 },
  state: { alignItems: 'flex-start', backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radius.sm, gap: theme.spacing.sm, marginTop: theme.spacing.lg, padding: theme.spacing.lg },
  stateText: { color: theme.colors.textSecondary, lineHeight: 21 },
  rows: { gap: theme.spacing.sm, marginTop: theme.spacing.lg },
  row: { alignItems: 'center', backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border, borderRadius: theme.radius.sm, borderWidth: 1, flexDirection: 'row', gap: theme.spacing.md, justifyContent: 'space-between', padding: theme.spacing.md },
  rowCopy: { flex: 1, minWidth: 0 },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  recordTitle: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '700' },
  metadata: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginTop: theme.spacing.xs },
});
