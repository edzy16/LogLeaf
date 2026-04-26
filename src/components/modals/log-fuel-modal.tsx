import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Colors, Spacing } from '@/constants/theme';
import { addFuelLog } from '@/db/fuelLogs';
import { ModalSheet } from '@/components/modal-sheet';
import { ThemedText } from '@/components/themed-text';

interface LogFuelModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  vehicleId: number;
  currentKm: number;
}

export function LogFuelModal({
  visible,
  onClose,
  onSaved,
  vehicleId,
  currentKm,
}: LogFuelModalProps) {
  const db = useSQLiteContext();
  const [odometerStr, setOdometerStr] = useState('');
  const [litresStr, setLitresStr] = useState('');
  const [isFullTank, setIsFullTank] = useState(true);

  useEffect(() => {
    if (visible) {
      setOdometerStr(String(currentKm));
      setLitresStr('');
      setIsFullTank(true);
    }
  }, [visible, currentKm]);

  const odometer = parseFloat(odometerStr);
  const litres = parseFloat(litresStr);
  const isValid = !isNaN(odometer) && odometer >= 0 && !isNaN(litres) && litres > 0;

  async function handleSave() {
    if (!isValid) return;
    await addFuelLog(db, vehicleId, odometer, litres, isFullTank);
    onSaved();
    onClose();
  }

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <ThemedText type="subtitle" style={styles.title}>
        Log Fill-up
      </ThemedText>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Odometer (km)
        </ThemedText>
        <TextInput
          style={styles.input}
          value={odometerStr}
          onChangeText={setOdometerStr}
          keyboardType="numeric"
          placeholderTextColor={Colors.dark.textSecondary}
          autoFocus
          selectTextOnFocus
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Fuel added (litres)
        </ThemedText>
        <TextInput
          style={styles.input}
          value={litresStr}
          onChangeText={setLitresStr}
          placeholder="e.g. 4.5"
          placeholderTextColor={Colors.dark.textSecondary}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleText}>
          <ThemedText type="default">Filled to full</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Improves mileage accuracy
          </ThemedText>
        </View>
        <Switch
          value={isFullTank}
          onValueChange={setIsFullTank}
          trackColor={{ false: Colors.dark.backgroundSelected, true: Colors.dark.primary }}
          thumbColor="#fff"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, !isValid && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={!isValid}>
        <ThemedText type="default" style={styles.buttonText}>
          Log Fill-up
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  toggleText: {
    flex: 1,
    gap: Spacing.half,
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
