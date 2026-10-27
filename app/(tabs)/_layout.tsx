import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { colors, tabBar } from '@/theme';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'treino', title: 'Treino', icon: 'dumbbell' },
  { name: 'alimentacao', title: 'Alimentação', icon: 'food' },
  { name: 'perfil', title: 'Perfil', icon: 'user' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tabBar.activeTint,
        tabBarInactiveTintColor: tabBar.inactiveTint,
        tabBarLabelStyle: tabBar.label,
        tabBarStyle: {
          height: tabBar.height + insets.bottom,
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color }) => <Icon name={t.icon} size={tabBar.iconSize} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
