import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import AuthProvider, { useAuthSession } from "@/providers/AuthProvider";
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const [loaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });

    if (!loaded) {
        // Async font loading only occurs in development.
        return null;
    }

    return (
        <AuthProvider>
            <GluestackUIProvider mode={colorScheme === 'dark' ? 'dark' : 'light'}>
                <SafeAreaView style={{ flex: 1 }}>
                    <Stack>
                        <Stack.Screen name="(authorized)" options={{ headerShown: false }} />
                        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                        <Stack.Screen name="+not-found" />
                    </Stack>
                    <StatusBar style="auto" />
                </SafeAreaView>
            </GluestackUIProvider>
        </AuthProvider>
    );
}
