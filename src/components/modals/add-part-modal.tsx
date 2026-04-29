import { ModalSheet } from "@/components/modal-sheet";
import { ThemedText } from "@/components/themed-text";
import { Colors, Spacing } from "@/constants/theme";
import { addPart, updatePart } from "@/db/parts";
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

interface AddPartModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  vehicleId: number;
  currentKm: number;
  /** Pass to edit an existing part */
  existing?: Part;
}

export function AddPartModal({
  visible,
  onClose,
  onSaved,
  vehicleId,
  currentKm,
  existing,
}: AddPartModalProps) {
  const db = useSQLiteContext();
  const [name, setName] = useState("");
  const [replacedAtStr, setReplacedAtStr] = useState("");
  const [intervalStr, setIntervalStr] = useState("");

  // Snapshot props at open time so a parent refetch doesn't clobber user edits.
  useEffect(() => {
    if (!visible) return;
    if (existing) {
      setName(existing.name);
      setReplacedAtStr(String(existing.replaced_at_km));
      setIntervalStr(
        existing.interval_km == null ? "" : String(existing.interval_km),
      );
    } else {
      setName("");
      setReplacedAtStr(String(currentKm));
      setIntervalStr("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, existing?.id]);

  const isEdit = !!existing;
  const replacedAtRaw = Number(replacedAtStr);
  const replacedAtValid =
    isEdit ||
    (replacedAtStr.trim() !== "" &&
      Number.isFinite(replacedAtRaw) &&
      replacedAtRaw >= 0);
  const isValid = !!name.trim() && replacedAtValid;

  function parseInterval(): number | null {
    const trimmed = intervalStr.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.round(parsed);
  }

  async function handleSave() {
    if (!isValid) return;
    const interval = parseInterval();
    const replacedAt = isEdit ? 0 : Math.round(replacedAtRaw);

    try {
      if (isEdit) {
        if (!existing) return;
        await updatePart(db, existing.id, name.trim(), interval);
      } else {
        await addPart(db, vehicleId, name.trim(), replacedAt, interval);
      }
      onSaved();
      onClose();
    } catch (error) {
      Alert.alert(
        "Save failed",
        error instanceof Error ? error.message : "Could not save part.",
      );
    }
  }

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <ThemedText type="subtitle" style={styles.title}>
        {isEdit ? "Edit Part" : "Add Part"}
      </ThemedText>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Part name
        </ThemedText>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Engine Oil"
          placeholderTextColor={Colors.dark.textSecondary}
          autoFocus
        />
      </View>

      {!isEdit && (
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Replaced at (km)
          </ThemedText>
          <TextInput
            style={styles.input}
            value={replacedAtStr}
            onChangeText={setReplacedAtStr}
            keyboardType="numeric"
            placeholderTextColor={Colors.dark.textSecondary}
          />
        </View>
      )}

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Replace every (km)
        </ThemedText>
        <TextInput
          style={styles.input}
          value={intervalStr}
          onChangeText={setIntervalStr}
          placeholder="e.g. 3000"
          placeholderTextColor={Colors.dark.textSecondary}
          keyboardType="numeric"
        />
        <ThemedText type="small" themeColor="textSecondary">
          Leave blank if you just want to track replacements.
        </ThemedText>
      </View>

      <TouchableOpacity
        style={[styles.button, !isValid && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={!isValid}
      >
        <ThemedText type="default" style={styles.buttonText}>
          {isEdit ? "Save Changes" : "Add Part"}
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
