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
        <ThemedText type="subtitle" style={styles.title}>
          Select Vehicle
        </ThemedText>
        {vehicles.length === 0 && (
          <ThemedText themeColor="textSecondary">
            No vehicles yet. Add one from the Vehicles tab.
          </ThemedText>
        )}
        {vehicles.map(v => (
          <TouchableOpacity
            key={v.id}
            style={styles.option}
            onPress={() => handleVehicleSelect(v)}>
            <ThemedText type="default">{v.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {v.current_km.toLocaleString()} km
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ModalSheet>
    );
  }

  return (
    <>
      <ModalSheet visible={visible && action === null} onClose={onClose}>
        <ThemedText type="subtitle" style={styles.title}>
          {selectedVehicle.name}
        </ThemedText>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleActionSelect('replacement')}>
          <ThemedText type="default">Log Part Replacement</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Mark a part as replaced
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleActionSelect('fuel')}>
          <ThemedText type="default">Log Fuel Fill-up</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Record odometer and litres
          </ThemedText>
        </TouchableOpacity>
      </ModalSheet>

      {action === 'replacement' && (
        <ModalSheet visible onClose={() => setAction(null)}>
          <ThemedText type="subtitle" style={styles.title}>
            Select Part
          </ThemedText>
          {parts.length === 0 && (
            <ThemedText themeColor="textSecondary">
              No parts for this vehicle yet.
            </ThemedText>
          )}
          {parts.map(p => (
            <TouchableOpacity
              key={p.id}
              style={styles.option}
              onPress={() => setSelectedPart(p)}>
              <ThemedText type="default">{p.name}</ThemedText>
            </TouchableOpacity>
          ))}
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
  title: {
    marginBottom: Spacing.four,
  },
  option: {
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.backgroundSelected,
    gap: Spacing.half,
  },
  actionButton: {
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.backgroundSelected,
    gap: Spacing.half,
  },
});
