import { ModalSheet } from "@/components/modal-sheet";
import { ThemedText } from "@/components/themed-text";
import { Colors, Spacing } from "@/constants/theme";
import { logReplacement } from "@/db/parts";
import { bumpOdometer } from "@/db/vehicles";
import { Part } from "@/types";
import { useSQLiteContext } from "expo-sqlite";
import React, { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Anything more than this km above the current odometer triggers a confirmation.
const SUSPICIOUS_BUMP_KM = 1000;

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
  const [kmStr, setKmStr] = useState("");

  // Snapshot currentKm at open time so parent refetches don't wipe user input.
  useEffect(() => {
    if (visible) setKmStr(String(currentKm));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!part) return null;

  const km = Number(kmStr);
  const isValid = kmStr.trim() !== "" && Number.isFinite(km) && km >= 0;
  async function commit(rawKm: number) {
    if (!part) return;
    const replacedAtKm = Math.round(rawKm);
    try {
      await logReplacement(db, part.id, replacedAtKm);
      await bumpOdometer(db, vehicleId, replacedAtKm);
      onSaved();
      onClose();
    } catch (error) {
      Alert.alert(
        "Save failed",
        error instanceof Error ? error.message : "Could not log replacement.",
      );
    }
  }

  async function handleSave() {
    if (!isValid) return;
    const delta = km - currentKm;
    if (Math.abs(delta) > SUSPICIOUS_BUMP_KM) {
      const isJump = delta > 0;
      const title = isJump ? "Odometer jump" : "Odometer drop";
      const direction = isJump ? "well above" : "well below";
      Alert.alert(
        title,
        `${km.toLocaleString()} km is ${direction} the current ${currentKm.toLocaleString()} km. Save anyway?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Save", onPress: () => commit(km) },
        ],
      );
      return;
    }
    await commit(km);
  }

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <ThemedText type="subtitle" style={styles.title}>
        Log Replacement
      </ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.partName}
      >
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
        disabled={!isValid}
      >
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
