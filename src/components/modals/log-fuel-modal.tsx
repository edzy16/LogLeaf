import { ModalSheet } from "@/components/modal-sheet";
import { ThemedText } from "@/components/themed-text";
import { Colors, Spacing } from "@/constants/theme";
import { addFuelLog, getMaxFuelLogOdometer } from "@/db/fuelLogs";
import { useSQLiteContext } from "expo-sqlite";
import React, { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
  const [odometerStr, setOdometerStr] = useState("");
  const [litresStr, setLitresStr] = useState("");
  const [isFullTank, setIsFullTank] = useState(true);

  // Snapshot currentKm at open time so a parent refetch mid-edit doesn't wipe user input.
  useEffect(() => {
    if (visible) {
      setOdometerStr(String(currentKm));
      setLitresStr("");
      setIsFullTank(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const odometer = Number(odometerStr);
  const litres = Number(litresStr);
  const isValid =
    Number.isFinite(odometer) &&
    odometer >= 0 &&
    Number.isFinite(litres) &&
    litres > 0;

  async function handleSave() {
    if (!isValid) return;
    const odometerKm = Math.round(odometer);
    const previousMax = await getMaxFuelLogOdometer(db, vehicleId);
    if (previousMax !== null && odometerKm < previousMax) {
      Alert.alert(
        "Odometer too low",
        `Last logged fill-up was at ${previousMax.toLocaleString()} km. The odometer can't go down between fill-ups.`,
      );
      return;
    }
    try {
      await addFuelLog(db, vehicleId, odometerKm, litres, isFullTank);
      onSaved();
      onClose();
    } catch (error) {
      Alert.alert(
        "Save failed",
        error instanceof Error ? error.message : "Could not log fill-up.",
      );
    }
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
          trackColor={{
            false: Colors.dark.backgroundSelected,
            true: Colors.dark.primary,
          }}
          thumbColor="#fff"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, !isValid && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={!isValid}
      >
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    alignItems: "center",
    marginTop: Spacing.two,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
