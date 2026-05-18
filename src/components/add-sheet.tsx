import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { Colors, Spacing } from '@/constants/theme';
import { Vehicle, Part } from '@/types';
import { getVehicles } from '@/db/vehicles';
import { getPartsByVehicle } from '@/db/parts';
import { ModalSheet } from './modal-sheet';
import { LogReplacementModal } from './modals/log-replacement-modal';
import { LogFuelModal } from './modals/log-fuel-modal';
import { ThemedText } from './themed-text';

type AddAction = 'replacement' | 'fuel' | null;

interface AddSheetProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AddSheet({ visible, onClose, onSaved }: AddSheetProps) {
  const db = useSQLiteContext();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [action, setAction] = useState<AddAction>(null);

  useEffect(() => {
    if (visible) {
      getVehicles(db).then(setVehicles);
      setSelectedVehicle(null);
      setParts([]);
      setSelectedPart(null);
      setAction(null);
    }
  }, [visible, db]);

  async function handleVehicleSelect(vehicle: Vehicle) {
    setSelectedVehicle(vehicle);
    const p = await getPartsByVehicle(db, vehicle.id);
    setParts(p);
  }

  function handleActionSelect(a: AddAction) {
    if (!selectedVehicle) return;
    setAction(a);
  }

  function handleSaved() {
    onSaved();
    onClose();
    setAction(null);
  }

  if (!selectedVehicle) {
    return (
      <ModalSheet visible={visible} onClose={onClose}>
        <ThemedText type="subtitle" style={styles.titleCenter}>
          Select Vehicle
        </ThemedText>
        {vehicles.length === 0 && (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No vehicles yet. Add one from the Vehicles tab.
          </ThemedText>
        )}
        <View style={styles.rowList}>
          {vehicles.map(v => (
            <TouchableOpacity
              key={v.id}
              style={styles.simpleRow}
              onPress={() => handleVehicleSelect(v)}>
              <View style={styles.simpleRowContent}>
                <ThemedText type="default" style={styles.rowTitle}>{v.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {v.current_km.toLocaleString()} km
                </ThemedText>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.dark.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ModalSheet>
    );
  }

  return (
    <>
      <ModalSheet visible={visible && action === null} onClose={onClose}>
        <ThemedText type="subtitle" style={styles.titleCenter}>
          {selectedVehicle.name}
        </ThemedText>
        <ThemedText style={styles.stepCaption} themeColor="textSecondary">
          CHOOSE ACTION
        </ThemedText>
        <View style={styles.rowList}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => handleActionSelect('replacement')}>
            <View style={styles.iconTile}>
              <MaterialIcons name="auto-fix-high" size={24} color={Colors.dark.primary} />
            </View>
            <View style={styles.actionRowContent}>
              <ThemedText type="default" style={styles.rowTitle}>Log Part Replacement</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Reset maintenance interval
              </ThemedText>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.dark.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => handleActionSelect('fuel')}>
            <View style={styles.iconTile}>
              <MaterialIcons name="local-gas-station" size={24} color={Colors.dark.primary} />
            </View>
            <View style={styles.actionRowContent}>
              <ThemedText type="default" style={styles.rowTitle}>Log Fuel Fill-up</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Track mileage and cost
              </ThemedText>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.dark.textMuted} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <ThemedText style={styles.cancelText}>Cancel</ThemedText>
        </TouchableOpacity>
      </ModalSheet>

      {action === 'replacement' && (
        <ModalSheet visible onClose={() => setAction(null)}>
          <ThemedText type="subtitle" style={styles.titleCenter}>
            Select Part
          </ThemedText>
          {parts.length === 0 && (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No parts for this vehicle yet.
            </ThemedText>
          )}
          <View style={styles.rowList}>
            {parts.map(p => (
              <TouchableOpacity
                key={p.id}
                style={styles.simpleRow}
                onPress={() => setSelectedPart(p)}>
                <ThemedText type="default" style={styles.rowTitle}>{p.name}</ThemedText>
                <MaterialIcons name="chevron-right" size={20} color={Colors.dark.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
          <LogReplacementModal
            visible={selectedPart !== null}
            onClose={() => setSelectedPart(null)}
            onSaved={handleSaved}
            part={selectedPart}
            vehicleId={selectedVehicle.id}
            currentKm={selectedVehicle.current_km}
          />
        </ModalSheet>
      )}

      <LogFuelModal
        visible={action === 'fuel'}
        onClose={() => setAction(null)}
        onSaved={handleSaved}
        vehicleId={selectedVehicle.id}
        currentKm={selectedVehicle.current_km}
      />
    </>
  );
}

const styles = StyleSheet.create({
  titleCenter: {
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  stepCaption: {
    textAlign: 'center',
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.four,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  rowList: {
    gap: Spacing.two,
  },
  simpleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: Colors.dark.backgroundElevated,
  },
  simpleRowContent: {
    flex: 1,
    gap: Spacing.half,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: Colors.dark.backgroundElevated,
  },
  actionRowContent: {
    flex: 1,
    gap: Spacing.half,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: Spacing.two,
    backgroundColor: Colors.dark.backgroundSelected,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTitle: {
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  cancelText: {
    color: Colors.dark.primaryText,
    fontWeight: '700',
    fontSize: 16,
  },
});
