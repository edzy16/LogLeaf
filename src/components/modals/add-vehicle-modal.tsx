import { ModalSheet } from "@/components/modal-sheet";
import { ThemedText } from "@/components/themed-text";
import { Colors, Spacing } from "@/constants/theme";
import { addVehicle, updateVehicle } from "@/db/vehicles";
import { Vehicle } from "@/types";
import { useSQLiteContext } from "expo-sqlite";
import React, { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
  const [name, setName] = useState(existing?.name ?? "");
  const [kmStr, setKmStr] = useState(
    existing ? String(existing.current_km) : "",
  );

  // Snapshot props at open time so a parent refetch doesn't clobber user edits.
  useEffect(() => {
    if (!visible) return;
    if (existing) {
      setName(existing.name);
      setKmStr(String(existing.current_km));
    } else {
      setName("");
      setKmStr("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, existing?.id]);

  const isEdit = !!existing;
  const trimmedName = name.trim();
  const kmRaw = Number(kmStr);
  const kmValid = isEdit || (kmStr.trim() === "" || (Number.isFinite(kmRaw) && kmRaw >= 0));
  const isValid = !!trimmedName && kmValid;

  async function handleSave() {
    if (!isValid) return;
    const km = kmStr.trim() === "" ? 0 : Math.round(kmRaw);

    try {
      if (isEdit) {
        await updateVehicle(db, existing.id, trimmedName);
      } else {
        await addVehicle(db, trimmedName, km);
      }
      onSaved();
      onClose();
      setName("");
      setKmStr("");
    } catch (error) {
      Alert.alert(
        "Save failed",
        error instanceof Error ? error.message : "Could not save vehicle.",
      );
    }
  }

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <ThemedText type="subtitle" style={styles.title}>
        {isEdit ? "Edit Vehicle" : "Add Vehicle"}
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
        style={[styles.button, !isValid && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={!isValid}
      >
        <ThemedText type="default" style={styles.buttonText}>
          {isEdit ? "Save Changes" : "Add Vehicle"}
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
