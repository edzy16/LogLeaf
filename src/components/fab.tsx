import React from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { BottomTabInset, Colors, Spacing } from "@/constants/theme";

interface FABProps {
  onPress: () => void;
}

export function FAB({ onPress }: FABProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Add"
    >
      <MaterialIcons name="add" size={28} color={Colors.dark.primaryText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: BottomTabInset + Spacing.three,
    right: Spacing.four,
    zIndex: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3.84,
      },
    }),
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
});
