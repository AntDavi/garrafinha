import { Redirect } from 'expo-router';

import { useSession } from '@/store/session';

/** Guard: sem perfil → onboarding; com perfil → abas. */
export default function Index() {
  const hasProfile = useSession((s) => s.hasProfile);
  return <Redirect href={hasProfile ? '/(tabs)' : '/(onboarding)'} />;
}
