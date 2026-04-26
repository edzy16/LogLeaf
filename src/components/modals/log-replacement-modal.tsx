import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Colors, Spacing } from '@/constants/theme';
import { Part } from '@/types';
import { logReplacement } from '@/db/parts';
import { updateOdometer } from '@/db/vehicles';
import { ModalSheet } from '@/components/modal-sheet';
import { ThemedText } from '@/components/themed-text';

interface LogReplacementModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  part: Part | null;
  vehicleId: number;
  currentKm: number;
}

export function LogReplacementModal({
  visible,
  onClose,
  onSaved,
  part,
  vehicleId,
  currentKm,
}: LogReplacementModalProps) {
  const db = useSQLiteContext();
  const [kmStr, setKmStr] = useState('');

  useEffect(() => {
    if (visible) setKmStr(String(currentKm));
  }, [visible, currentKm]);

  if (!part) return null;

  const km = parseFloat(kmStr);
  const isValid = !isNaN(km) && km >= 0;

  async function handleSave() {
    if (!isValid || !part) return;
    await logReplacement(db, part.id, km);
    if (km > currentKm) {
      await updateOdometer(db, vehicleId, km);
    }
    onSaved();
    onClose();
  }

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <ThemedText type="subtitle" style={styles.title}>
        Log Replacement
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.partName}>
        {part.name}
      </ThemedText>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Replaced at (km)
        </ThemedText>
        <TextInput
          style={styles.input}
          value={kmStr}
          onChangeText={setKmStr}
          keyboardType="numeric"
          placeholderTextColor={Colors.dark.textSecondary}
          autoFocus
          selectTextOnFocus
        />
      </View>

      <TouchableOpacity
        style={[styles.button, !isValid && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={!isValid}>
        <ThemedText type="default" style={styles.buttonText}>
          Log Replacement
        </ThemedText>
      </TouchableOpacity>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.one,
  },
  partName: {
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
