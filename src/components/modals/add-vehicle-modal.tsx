import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Colors, Spacing } from '@/constants/theme';
import { Vehicle } from '@/types';
import { addVehicle, updateVehicle } from '@/db/vehicles';
import { ModalSheet } from '@/components/modal-sheet';
import { ThemedText } from '@/components/themed-text';

interface AddVehicleModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Pass to edit an existing vehicle */
  existing?: Vehicle;
}

export function AddVehicleModal({
  visible,
  onClose,
  onSaved,
  existing,
}: AddVehicleModalProps) {
  const db = useSQLiteContext();
  const [name, setName] = useState(existing?.name ?? '');
  const [kmStr, setKmStr] = useState(
    existing ? String(existing.current_km) : ''
  );

  const isEdit = !!existing;

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const km = parseFloat(kmStr) || 0;

    if (isEdit) {
      await updateVehicle(db, existing.id, trimmed);
    } else {
      await addVehicle(db, trimmed, km);
    }
    onSaved();
    onClose();
    setName('');
    setKmStr('');
  }

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <ThemedText type="subtitle" style={styles.title}>
        {isEdit ? 'Edit Vehicle' : 'Add Vehicle'}
      </ThemedText>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Vehicle name
        </ThemedText>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Honda CB150"
          placeholderTextColor={Colors.dark.textSecondary}
          autoFocus
        />
      </View>

      {!isEdit && (
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Current odometer (km)
          </ThemedText>
          <TextInput
            style={styles.input}
            value={kmStr}
            onChangeText={setKmStr}
            placeholder="e.g. 15000"
            placeholderTextColor={Colors.dark.textSecondary}
            keyboardType="numeric"
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, !name.trim() && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={!name.trim()}>
        <ThemedText type="default" style={styles.buttonText}>
          {isEdit ? 'Save Changes' : 'Add Vehicle'}
        </ThemedText>
      </TouchableOpacity>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.four,
  },
  field: {
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  input: {
    backgroundColor: Colors.dark.backgroundSelected,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    color: Colors.dark.text,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.dark.primary,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
