import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import AuthProvider from "@/providers/AuthProvider";
import { CircleUserRound } from "lucide-react-native";
import { TouchableOpacity } from "react-native";

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
                <Stack>
                    <Stack.Screen 
                        name="(authorized)"
                        options={{ 
                            title: "Collaborative Commuting",
                            headerShown: true,
                            headerRight: () => (
                                <TouchableOpacity 
                                    onPress={() => router.replace('/(authorized)/(profile)/profile')}
                                    style={{ marginRight: 15 }}
                                >
                                    <CircleUserRound />
                                </TouchableOpacity>
                            ),
                        }}
                    />
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="auto" />
            </GluestackUIProvider>
        </AuthProvider>
    );
}
