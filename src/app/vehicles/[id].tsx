import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import React, { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StatusPill } from "@/components/status-pill";
import { AddPartModal } from "@/components/modals/add-part-modal";
import { LogFuelModal } from "@/components/modals/log-fuel-modal";
import { LogReplacementModal } from "@/components/modals/log-replacement-modal";
import { PartStatusRow } from "@/components/part-status-row";
import { ThemedText } from "@/components/themed-text";
import { BottomTabInset, Colors, Spacing } from "@/constants/theme";
import {
  deleteFuelLog,
  getFuelLogsByVehicle,
  getMileageForVehicle,
} from "@/db/fuelLogs";
import { deletePart, getPartsByVehicle } from "@/db/parts";
import { getVehicleById, updateOdometer } from "@/db/vehicles";
import { FuelLog, Part, Vehicle } from "@/types";
import { MileageResult } from "@/utils/mileage";

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();

  const vehicleId = parseInt(id, 10);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [mileage, setMileage] = useState<MileageResult | null>(null);
  const [odometerInput, setOdometerInput] = useState("");
  const [editingOdometer, setEditingOdometer] = useState(false);

  const [addPartOpen, setAddPartOpen] = useState(false);
  const [editPart, setEditPart] = useState<Part | null>(null);
  const [replacePart, setReplacePart] = useState<Part | null>(null);
  const [logFuelOpen, setLogFuelOpen] = useState(false);

  const [notFound, setNotFound] = useState(false);

  const loadData = useCallback(async () => {
    if (isNaN(vehicleId)) {
      setNotFound(true);
      return;
    }

    const [v, p, f, m] = await Promise.all([
      getVehicleById(db, vehicleId),
      getPartsByVehicle(db, vehicleId),
      getFuelLogsByVehicle(db, vehicleId),
      getMileageForVehicle(db, vehicleId),
    ]);
    if (!v) {
      setNotFound(true);
      return;
    }
    setNotFound(false);
    setVehicle(v);
    setParts(p);
    setFuelLogs(f);
    setMileage(m);
    setOdometerInput(String(v.current_km));
  }, [db, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  if (notFound) {
    return (
      <View style={styles.screen}>
        <SafeAreaView edges={["top"]} style={styles.notFound}>
          <ThemedText type="subtitle">Vehicle not found</ThemedText>
          <ThemedText themeColor="textSecondary">
            This vehicle no longer exists.
          </ThemedText>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ThemedText themeColor="primary">← Back</ThemedText>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }
  if (!vehicle) return null;

  async function commitOdometer(km: number) {
    if (!vehicle) return;
    try {
      await updateOdometer(db, vehicle.id, km);
      setEditingOdometer(false);
      loadData();
    } catch (error) {
      Alert.alert(
        "Save failed",
        error instanceof Error ? error.message : "Could not update odometer.",
      );
    }
  }

  async function handleOdometerSave() {
    if (!vehicle) return;
    const raw = Number(odometerInput);
    if (!Number.isFinite(raw) || raw < 0) {
      Alert.alert(
        "Invalid Odometer",
        "Please enter a valid non‑negative number for odometer.",
      );
      return;
    }
    const km = Math.round(raw);
    if (km < vehicle.current_km) {
      Alert.alert(
        "Lower the odometer?",
        `New value (${km.toLocaleString()} km) is below the current ${vehicle.current_km.toLocaleString()} km. Mileage history may become inconsistent.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Lower it",
            style: "destructive",
            onPress: () => commitOdometer(km),
          },
        ],
      );
      return;
    }
    await commitOdometer(km);
  }

  function handlePartLongPress(part: Part) {
    Alert.alert(part.name, "What would you like to do?", [
      { text: "Edit", onPress: () => setEditPart(part) },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert("Delete Part", `Delete "${part.name}"?`, [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                await deletePart(db, part.id);
                loadData();
              },
            },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function handleFuelLogLongPress(log: FuelLog) {
    Alert.alert("Delete Entry", "Remove this fuel log entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteFuelLog(db, log.id);
          loadData();
        },
      },
    ]);
  }

  const mileageEmptyLabel = () => {
    if (!mileage) return null;
    if (mileage.status === "no-logs") return "No fill-ups logged yet";
    if (mileage.status === "need-more")
      return "Log one more fill-up to see mileage";
    return null;
  };

  const mileageBadge = () => {
    if (!mileage) return null;
    if (mileage.status === "precise") {
      return { label: "Precise", icon: "check-circle" as const, color: Colors.dark.success };
    }
    return null;
  };

  return (
    <View style={styles.screen}>
      <ScrollView
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
            <MaterialIcons name="arrow-back" size={16} color={Colors.dark.primary} />
            <ThemedText themeColor="primary">Back</ThemedText>
          </TouchableOpacity>
          <ThemedText type="subtitle" style={styles.vehicleName}>
            {vehicle.name}
          </ThemedText>
        </SafeAreaView>

        {/* ── Parts ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="default" style={styles.sectionTitle}>
              Parts
            </ThemedText>
            <TouchableOpacity
              onPress={() => setAddPartOpen(true)}
              style={styles.iconLink}>
              <MaterialIcons name="add" size={18} color={Colors.dark.primary} />
              <ThemedText themeColor="primary">Add</ThemedText>
            </TouchableOpacity>
          </View>

          {parts.length === 0 && (
            <ThemedText themeColor="textSecondary">
              No parts tracked yet.
            </ThemedText>
          )}
          {parts.map((part) => (
            <TouchableOpacity
              key={part.id}
              onLongPress={() => handlePartLongPress(part)}
              activeOpacity={1}
            >
              <PartStatusRow
                part={part}
                currentKm={vehicle.current_km}
                onPress={(p) => setReplacePart(p)}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Odometer ── */}
        <View style={styles.section}>
          <ThemedText type="default" style={styles.sectionTitle}>
            Odometer
          </ThemedText>

          {editingOdometer ? (
            <View style={styles.odometerEdit}>
              <TextInput
                style={styles.odometerInput}
                value={odometerInput}
                onChangeText={setOdometerInput}
                keyboardType="numeric"
                autoFocus
                selectTextOnFocus
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleOdometerSave}
              >
                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingOdometer(false)}>
                <ThemedText themeColor="textSecondary">Cancel</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.odometerRow}>
              <View style={styles.odometerLeft}>
                <MaterialIcons name="speed" size={20} color={Colors.dark.primary} />
                <ThemedText type="default" style={styles.odometerValue}>
                  {vehicle.current_km.toLocaleString()} km
                </ThemedText>
              </View>
              <TouchableOpacity onPress={() => setEditingOdometer(true)}>
                <ThemedText themeColor="primary">Update</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.fuelHeader}>
            <ThemedText type="default" style={styles.sectionTitle}>
              Fuel log
            </ThemedText>
            <TouchableOpacity
              onPress={() => setLogFuelOpen(true)}
              style={styles.iconLink}>
              <MaterialIcons name="add-circle-outline" size={18} color={Colors.dark.primary} />
              <ThemedText themeColor="primary">Add fill-up</ThemedText>
            </TouchableOpacity>
          </View>

          {fuelLogs.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              No fuel entries yet.
            </ThemedText>
          )}
          {[...fuelLogs].reverse().map((log) => (
            <TouchableOpacity
              key={log.id}
              onLongPress={() => handleFuelLogLongPress(log)}
              style={styles.fuelRow}
            >
              <View style={styles.fuelRowLeft}>
                <ThemedText type="default" style={styles.fuelKm}>
                  {log.odometer_km.toLocaleString()} km
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {new Date(log.logged_at).toLocaleDateString()}
                </ThemedText>
              </View>
              <ThemedText style={styles.fuelLitres}>
                {log.fuel_litres} L{log.is_full_tank ? "" : " (partial)"}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Mileage ── */}
        <View style={styles.section}>
          <View style={styles.mileageHeader}>
            <ThemedText type="default" style={styles.sectionTitle}>
              Mileage
            </ThemedText>
            {mileageBadge() && (
              <StatusPill
                label={mileageBadge()!.label}
                icon={mileageBadge()!.icon}
                color={mileageBadge()!.color}
              />
            )}
          </View>

          {mileageEmptyLabel() ? (
            <ThemedText themeColor="textSecondary">
              {mileageEmptyLabel()}
            </ThemedText>
          ) : (
            <View style={styles.mileageCards}>
              <View style={styles.mileageCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  Lifetime avg
                </ThemedText>
                <ThemedText type="subtitle">
                  {mileage?.lifetimeAvg?.toFixed(1) ?? "—"}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  km/L
                </ThemedText>
              </View>
              <View style={styles.mileageCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  Last 5 fills
                </ThemedText>
                <ThemedText type="subtitle">
                  {mileage?.last5Avg?.toFixed(1) ?? "—"}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  km/L
                </ThemedText>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <AddPartModal
        visible={addPartOpen}
        onClose={() => setAddPartOpen(false)}
        onSaved={loadData}
        vehicleId={vehicle.id}
        currentKm={vehicle.current_km}
      />

      {editPart && (
        <AddPartModal
          visible
          onClose={() => setEditPart(null)}
          onSaved={() => {
            loadData();
            setEditPart(null);
          }}
          vehicleId={vehicle.id}
          currentKm={vehicle.current_km}
          existing={editPart}
        />
      )}

      <LogReplacementModal
        visible={replacePart !== null}
        onClose={() => setReplacePart(null)}
        onSaved={() => {
          loadData();
          setReplacePart(null);
        }}
        part={replacePart}
        vehicleId={vehicle.id}
        currentKm={vehicle.current_km}
      />

      <LogFuelModal
        visible={logFuelOpen}
        onClose={() => setLogFuelOpen(false)}
        onSaved={loadData}
        vehicleId={vehicle.id}
        currentKm={vehicle.current_km}
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
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  notFound: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    gap: Spacing.two,
  },
  vehicleName: {
    marginBottom: Spacing.two,
  },
  iconLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontWeight: "700",
    fontSize: 18,
  },
  odometerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  odometerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  odometerValue: {
    fontWeight: "700",
  },
  odometerEdit: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  odometerInput: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundSelected,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    color: Colors.dark.text,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  fuelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fuelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  fuelRowLeft: {
    gap: Spacing.half,
  },
  fuelKm: {
    fontWeight: "700",
  },
  fuelLitres: {
    color: Colors.dark.primary,
    fontWeight: "700",
  },
  mileageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mileageCards: {
    flexDirection: "row",
    gap: Spacing.three,
  },
  mileageCard: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.dark.backgroundSelected,
    padding: Spacing.three,
    alignItems: "center",
    gap: Spacing.half,
  },
});
