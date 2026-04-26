import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, BottomTabInset, Spacing } from '@/constants/theme';
import { Vehicle } from '@/types';
import { getVehicles, deleteVehicle } from '@/db/vehicles';
import { ThemedText } from '@/components/themed-text';
import { AddVehicleModal } from '@/components/modals/add-vehicle-modal';

export default function VehiclesScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);

  const loadVehicles = useCallback(async () => {
    setVehicles(await getVehicles(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadVehicles();
    }, [loadVehicles])
  );

  function handleLongPress(vehicle: Vehicle) {
    Alert.alert(vehicle.name, 'What would you like to do?', [
      { text: 'Edit', onPress: () => setEditVehicle(vehicle) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            'Delete Vehicle',
            `Delete "${vehicle.name}" and all its data?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await deleteVehicle(db, vehicle.id);
                  loadVehicles();
                },
              },
            ]
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: BottomTabInset + Spacing.six },
        ]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Vehicles</ThemedText>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setAddModalOpen(true)}>
              <ThemedText style={styles.addButtonText}>+ Add</ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {vehicles.length === 0 && (
          <View style={styles.emptyState}>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              No vehicles yet.{'\n'}Tap "+ Add" to get started.
            </ThemedText>
          </View>
        )}

        {vehicles.map(vehicle => (
          <Pressable
            key={vehicle.id}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => router.push(`/vehicles/${vehicle.id}`)}
            onLongPress={() => handleLongPress(vehicle)}>
            <ThemedText type="default" style={styles.vehicleName}>
              {vehicle.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {vehicle.current_km.toLocaleString()} km
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <AddVehicleModal
        visible={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSaved={loadVehicles}
      />

      {editVehicle && (
        <AddVehicleModal
          visible
          onClose={() => setEditVehicle(null)}
          onSaved={() => {
            loadVehicles();
            setEditVehicle(null);
          }}
          existing={editVehicle}
        />
      )}
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
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  addButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.dark.backgroundSelected,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
  vehicleName: {
    fontWeight: '600',
  },
});
