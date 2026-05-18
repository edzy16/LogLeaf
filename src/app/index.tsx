import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { Colors, BottomTabInset, Spacing } from '@/constants/theme';
import { Part, Vehicle } from '@/types';
import { getVehicles } from '@/db/vehicles';
import { getPartsByVehicle } from '@/db/parts';
import { getPartStatus } from '@/utils/partStatus';
import { VehicleCard } from '@/components/vehicle-card';
import { ThemedText } from '@/components/themed-text';
import { LogReplacementModal } from '@/components/modals/log-replacement-modal';
import { GlobalAddLauncher } from '@/components/global-add-launcher';

interface VehicleWithFlaggedParts {
  vehicle: Vehicle;
  flaggedParts: Part[];
}

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [data, setData] = useState<VehicleWithFlaggedParts[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const loadData = useCallback(async () => {
    const vehicles = await getVehicles(db);
    const results = await Promise.all(
      vehicles.map(async vehicle => {
        const parts = await getPartsByVehicle(db, vehicle.id);
        const flaggedParts = parts.filter(p => {
          const status = getPartStatus(p, vehicle.current_km);
          return status === 'due-soon' || status === 'overdue';
        });
        return { vehicle, flaggedParts };
      })
    );
    setData(results);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const hasFlags = data.some(d => d.flaggedParts.length > 0);

  function handlePartPress(part: Part, vehicle: Vehicle) {
    setSelectedPart(part);
    setSelectedVehicle(vehicle);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: BottomTabInset + Spacing.six },
        ]}>
        <SafeAreaView edges={['top']}>
          <ThemedText type="subtitle" style={styles.heading}>
            Maintenance
          </ThemedText>
        </SafeAreaView>

        {data.length === 0 && (
          <View style={styles.emptyState}>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              No vehicles yet.{'\n'}Add one from the Vehicles tab.
            </ThemedText>
          </View>
        )}

        {!hasFlags && data.length > 0 && (
          <View style={styles.allGood}>
            <MaterialIcons
              name="check-circle"
              size={20}
              color={Colors.dark.success}
            />
            <ThemedText type="default">All parts are up to date</ThemedText>
          </View>
        )}

        {data
          .filter(d => d.flaggedParts.length > 0)
          .map(({ vehicle, flaggedParts }) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              flaggedParts={flaggedParts}
              onPartPress={part => handlePartPress(part, vehicle)}
            />
          ))}
      </ScrollView>

      {selectedPart && selectedVehicle && (
        <LogReplacementModal
          visible
          onClose={() => {
            setSelectedPart(null);
            setSelectedVehicle(null);
          }}
          onSaved={() => {
            loadData();
            setSelectedPart(null);
            setSelectedVehicle(null);
          }}
          part={selectedPart}
          vehicleId={selectedVehicle.id}
          currentKm={selectedVehicle.current_km}
        />
      )}

      <GlobalAddLauncher />
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
  heading: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  emptyState: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 24,
  },
  allGood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
});
