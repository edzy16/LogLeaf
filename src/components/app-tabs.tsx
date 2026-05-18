import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

import MotorbikeFill from "@/assets/icons/bike";
import { Colors } from "@/constants/theme";

export default function AppTabs() {
  const colors = Colors.dark;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.backgroundElement,
          borderTopColor: colors.backgroundSelected,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="home" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="vehicles"
        options={{
          title: "Vehicles",
          tabBarIcon: ({ color }) => <MotorbikeFill color={color} size={20} />,
        }}
      />

      <Tabs.Screen
        name="vehicles/[id]"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="parts/[id]"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
