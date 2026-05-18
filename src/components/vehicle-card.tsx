import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { Part, Vehicle } from '@/types';
import { PartStatusRow } from './part-status-row';
import { ThemedText } from './themed-text';

interface VehicleCardProps {
  vehicle: Vehicle;
  flaggedParts: Part[];
  onPartPress: (part: Part) => void;
}

export function VehicleCard({
  vehicle,
  flaggedParts,
  onPartPress,
}: VehicleCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <ThemedText type="default" style={styles.name}>
          {vehicle.name}
        </ThemedText>
        <View
          style={[
            styles.badge,
            flaggedParts.length > 0 ? styles.badgeAlert : styles.badgeOk,
          ]}>
          <ThemedText
            type="small"
            style={[
              styles.badgeText,
              { color: flaggedParts.length > 0 ? Colors.dark.danger : Colors.dark.success },
            ]}>
            {flaggedParts.length > 0
              ? `${flaggedParts.length} part${flaggedParts.length > 1 ? 's' : ''} due`
              : 'All good'}
          </ThemedText>
        </View>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {vehicle.current_km.toLocaleString()} km
      </ThemedText>
      {flaggedParts.length > 0 && (
        <View style={styles.parts}>
          {flaggedParts.map(part => (
            <PartStatusRow
              key={part.id}
              part={part}
              currentKm={vehicle.current_km}
              onPress={onPartPress}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
    borderRadius: 999,
  },
  badgeAlert: {
    backgroundColor: Colors.dark.danger + '33',
  },
  badgeOk: {
    backgroundColor: Colors.dark.success + '33',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  parts: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
