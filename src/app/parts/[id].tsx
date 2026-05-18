import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AddPartModal } from "@/components/modals/add-part-modal";
import { LogReplacementModal } from "@/components/modals/log-replacement-modal";
import { PartStatusRow } from "@/components/part-status-row";
import { ThemedText } from "@/components/themed-text";
import { BottomTabInset, Colors, Spacing } from "@/constants/theme";
import {
  deletePart,
  deleteReplacementLog,
  getPartById,
  getReplacementLogsByPart,
} from "@/db/parts";
import { getVehicleById } from "@/db/vehicles";
import { Part, PartReplacementLog, Vehicle } from "@/types";

const INITIAL_LOG_LIMIT = 3;

export default function PartDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const partId = parseInt(id, 10);

  const [part, setPart] = useState<Part | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [logs, setLogs] = useState<PartReplacementLog[]>([]);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [editPartOpen, setEditPartOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<PartReplacementLog | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadData = useCallback(async () => {
    if (isNaN(partId)) {
      setNotFound(true);
      return;
    }

    const loadedPart = await getPartById(db, partId);
    if (!loadedPart) {
      setNotFound(true);
      return;
    }

    const [loadedVehicle, loadedLogs] = await Promise.all([
      getVehicleById(db, loadedPart.vehicle_id),
      getReplacementLogsByPart(db, loadedPart.id),
    ]);

    setNotFound(!loadedVehicle);
    setPart(loadedPart);
    setVehicle(loadedVehicle);
    setLogs(loadedLogs);
  }, [db, partId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const visibleLogs = useMemo(
    () => (showAllLogs ? logs : logs.slice(0, INITIAL_LOG_LIMIT)),
    [logs, showAllLogs],
  );
  const latestLog = logs[0] ?? null;

  if (notFound) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={["top"]} style={styles.notFound}>
          <ThemedText type="subtitle">Part not found</ThemedText>
          <ThemedText themeColor="textSecondary">
            This part no longer exists.
          </ThemedText>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons
              name="arrow-back"
              size={16}
              color={Colors.dark.primary}
            />
            <ThemedText themeColor="primary">Back</ThemedText>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  if (!part || !vehicle) return null;

  function confirmDeletePart() {
    if (!part) return;
    Alert.alert("Delete Part", `Delete "${part.name}" and its history?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deletePart(db, part.id);
          router.back();
        },
      },
    ]);
  }

  function confirmDeleteLatestLog() {
    if (!part || !latestLog) return;
    Alert.alert(
      "Delete Latest Log",
      "Remove the most recent replacement log?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteReplacementLog(db, latestLog.id, part.id);
            loadData();
          },
        },
      ],
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: BottomTabInset + Spacing.six },
        ]}
      >
        <SafeAreaView edges={["top"]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons
              name="arrow-back"
              size={16}
              color={Colors.dark.primary}
            />
            <ThemedText themeColor="primary">Back</ThemedText>
          </TouchableOpacity>
          <View style={styles.titleRow}>
            <View style={styles.titleCopy}>
              <ThemedText type="subtitle" selectable>
                {part.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" selectable>
                {vehicle.name}
              </ThemedText>
            </View>
            <View style={styles.editIconRow}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setEditPartOpen(true)}
              >
                <MaterialIcons
                  name="edit"
                  size={18}
                  color={Colors.dark.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDeletePart}
                style={styles.iconButton}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={22}
                  color={Colors.dark.danger}
                />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        <PartStatusRow
          part={part}
          currentKm={vehicle.current_km}
          onPress={() => setLogOpen(true)}
        />

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setLogOpen(true)}
          >
            <MaterialIcons
              name="add"
              size={18}
              color={Colors.dark.primaryText}
            />
            <ThemedText style={styles.primaryButtonText}>Add Log</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="default" style={styles.sectionTitle}>
              Change History
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {logs.length} total
            </ThemedText>
          </View>

          {logs.length === 0 && (
            <ThemedText themeColor="textSecondary">
              No replacement logs yet.
            </ThemedText>
          )}

          {visibleLogs.map((log, index) => {
            const isLatest = log.id === latestLog?.id;
            return (
              <View key={log.id} style={styles.logRow}>
                <View style={styles.logInfo}>
                  <ThemedText type="default" style={styles.logKm} selectable>
                    {log.replaced_at_km.toLocaleString()} km
                  </ThemedText>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    selectable
                  >
                    {log.logged_at
                      ? new Date(log.logged_at).toLocaleDateString()
                      : "Imported from part"}
                  </ThemedText>
                </View>
                {isLatest ? (
                  <View style={styles.logActions}>
                    <TouchableOpacity
                      onPress={() => setEditingLog(log)}
                      style={styles.iconButton}
                    >
                      <MaterialIcons
                        name="edit"
                        size={18}
                        color={Colors.dark.primary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={confirmDeleteLatestLog}
                      style={styles.iconButton}
                    >
                      <MaterialIcons
                        name="delete-outline"
                        size={18}
                        color={Colors.dark.danger}
                      />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    #{index + 1}
                  </ThemedText>
                )}
              </View>
            );
          })}

          {logs.length > INITIAL_LOG_LIMIT && (
            <TouchableOpacity
              onPress={() => setShowAllLogs((value) => !value)}
              style={styles.showMoreButton}
            >
              <ThemedText themeColor="primary">
                {showAllLogs
                  ? "Show Less"
                  : `Show ${logs.length - INITIAL_LOG_LIMIT} More`}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <AddPartModal
        visible={editPartOpen}
        onClose={() => setEditPartOpen(false)}
        onSaved={() => {
          loadData();
          setEditPartOpen(false);
        }}
        vehicleId={vehicle.id}
        currentKm={vehicle.current_km}
        existing={part}
      />

      <LogReplacementModal
        visible={logOpen}
        onClose={() => setLogOpen(false)}
        onSaved={loadData}
        part={part}
        vehicleId={vehicle.id}
        currentKm={vehicle.current_km}
      />

      <LogReplacementModal
        visible={editingLog !== null}
        onClose={() => setEditingLog(null)}
        onSaved={() => {
          loadData();
          setEditingLog(null);
        }}
        part={part}
        vehicleId={vehicle.id}
        currentKm={vehicle.current_km}
        existingLog={editingLog ?? undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  notFound: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    gap: Spacing.two,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  titleCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  editIconRow: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: Spacing.two,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.one,
  },
  primaryButtonText: {
    color: Colors.dark.primaryText,
    fontWeight: "700",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: Colors.dark.backgroundSelected,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontWeight: "700",
    fontSize: 18,
  },
  logRow: {
    minHeight: 68,
    borderRadius: Spacing.two,
    backgroundColor: Colors.dark.backgroundElement,
    padding: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  logInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  logKm: {
    fontWeight: "700",
  },
  logActions: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.backgroundSelected,
  },
  showMoreButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
