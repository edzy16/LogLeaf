import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, BottomTabInset, Spacing } from '@/constants/theme';
import { FuelLog, Part, Vehicle } from '@/types';
import { getVehicleById, updateOdometer } from '@/db/vehicles';
import { getPartsByVehicle, deletePart } from '@/db/parts';
import {
  getFuelLogsByVehicle,
  deleteFuelLog,
  getMileageForVehicle,
} from '@/db/fuelLogs';
import { MileageResult } from '@/utils/mileage';
import { PartStatusRow } from '@/components/part-status-row';
import { ThemedText } from '@/components/themed-text';
import { AddPartModal } from '@/components/modals/add-part-modal';
import { LogReplacementModal } from '@/components/modals/log-replacement-modal';
import { LogFuelModal } from '@/components/modals/log-fuel-modal';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [mileage, setMileage] = useState<MileageResult | null>(null);
  const [odometerInput, setOdometerInput] = useState('');
  const [editingOdometer, setEditingOdometer] = useState(false);

  const [addPartOpen, setAddPartOpen] = useState(false);
  const [editPart, setEditPart] = useState<Part | null>(null);
  const [replacePart, setReplacePart] = useState<Part | null>(null);
  const [logFuelOpen, setLogFuelOpen] = useState(false);

  const vehicleId = parseInt(id, 10);

  const loadData = useCallback(async () => {
    const [v, p, f, m] = await Promise.all([
      getVehicleById(db, vehicleId),
      getPartsByVehicle(db, vehicleId),
      getFuelLogsByVehicle(db, vehicleId),
      getMileageForVehicle(db, vehicleId),
    ]);
    if (!v) {
      router.back();
      return;
    }
    setVehicle(v);
    setParts(p);
    setFuelLogs(f);
    setMileage(m);
    setOdometerInput(String(v.current_km));
  }, [db, vehicleId, router]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (!vehicle) return null;

  async function handleOdometerSave() {
    const km = parseFloat(odometerInput);
    if (isNaN(km) || km < 0 || !vehicle) return;
    await updateOdometer(db, vehicle.id, km);
    setEditingOdometer(false);
    loadData();
  }

  function handlePartLongPress(part: Part) {
    Alert.alert(part.name, 'What would you like to do?', [
      { text: 'Edit', onPress: () => setEditPart(part) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete Part', `Delete "${part.name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                await deletePart(db, part.id);
                loadData();
              },
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleFuelLogLongPress(log: FuelLog) {
    Alert.alert('Delete Entry', 'Remove this fuel log entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteFuelLog(db, log.id);
          loadData();
        },
      },
    ]);
  }

  const mileageEmptyLabel = () => {
    if (!mileage) return null;
    if (mileage.status === 'no-logs') return 'No fill-ups logged yet';
    if (mileage.status === 'need-more')
      return 'Log one more fill-up to see mileage';
    return null;
  };

  const mileageBadge = () => {
    if (!mileage) return null;
    if (mileage.status === 'precise') {
      return { label: '✓ Precise', color: Colors.dark.success };
    }
    if (mileage.status === 'estimated') {
      return { label: '~ Estimated', color: Colors.dark.warning };
    }
    return null;
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: BottomTabInset + Spacing.six },
        ]}>
        <SafeAreaView edges={['top']}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}>
            <ThemedText themeColor="primary">← Back</ThemedText>
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
            <TouchableOpacity onPress={() => setAddPartOpen(true)}>
              <ThemedText themeColor="primary">+ Add</ThemedText>
            </TouchableOpacity>
          </View>

          {parts.length === 0 && (
            <ThemedText themeColor="textSecondary">
              No parts tracked yet.
            </ThemedText>
          )}
          {parts.map(part => (
            <TouchableOpacity
              key={part.id}
              onLongPress={() => handlePartLongPress(part)}
              activeOpacity={1}>
              <PartStatusRow
                part={part}
                currentKm={vehicle.current_km}
                onPress={p => setReplacePart(p)}
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
                onPress={handleOdometerSave}>
                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingOdometer(false)}>
                <ThemedText themeColor="textSecondary">Cancel</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.odometerRow}>
              <ThemedText type="default">
                {vehicle.current_km.toLocaleString()} km
              </ThemedText>
              <TouchableOpacity onPress={() => setEditingOdometer(true)}>
                <ThemedText themeColor="primary">Update</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.fuelHeader}>
            <ThemedText type="small" themeColor="textSecondary">
              Fuel log
            </ThemedText>
            <TouchableOpacity onPress={() => setLogFuelOpen(true)}>
              <ThemedText themeColor="primary" style={styles.smallLink}>
                + Add fill-up
              </ThemedText>
            </TouchableOpacity>
          </View>

          {fuelLogs.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              No fuel entries yet.
            </ThemedText>
          )}
          {[...fuelLogs].reverse().map(log => (
            <TouchableOpacity
              key={log.id}
              onLongPress={() => handleFuelLogLongPress(log)}
              style={styles.fuelRow}>
              <ThemedText type="small">
                {log.odometer_km.toLocaleString()} km
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {log.fuel_litres} L{log.is_full_tank ? '' : ' (partial)'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {new Date(log.logged_at).toLocaleDateString()}
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
              <ThemedText
                type="small"
                style={{ color: mileageBadge()!.color }}>
                {mileageBadge()!.label}
              </ThemedText>
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
                  {mileage?.lifetimeAvg?.toFixed(1)}
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
                  {mileage?.last5Avg?.toFixed(1)}
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
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  vehicleName: {
    marginBottom: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 18,
  },
  odometerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.dark.backgroundSelected,
  },
  odometerEdit: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#fff',
    fontWeight: '600',
  },
  fuelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  smallLink: {
    fontSize: 13,
  },
  fuelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.backgroundSelected,
  },
  mileageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mileageCards: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  mileageCard: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.dark.backgroundSelected,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.half,
  },
});
