import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import ChatBubble from "@/components/ChatBubble";
import { useColorScheme } from '@/hooks/useColorScheme';
import AuthProvider from "@/providers/AuthProvider";
import { ChatBubbleProvider, useChatBubble } from "@/providers/ChatBubbleProvider";
import { CircleUserRound } from "lucide-react-native";
import { StyleSheet, TouchableOpacity, View } from "react-native";

function RootLayoutContent() {
    const colorScheme = useColorScheme();
    const { showBubble, openChat } = useChatBubble();

    return (
        <GluestackUIProvider mode={colorScheme === 'dark' ? 'dark' : 'light'}>
            <View style={styles.container}>
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

                {/* Bulle de chat globale */}
                {showBubble && <ChatBubble onPress={openChat} />}

                <StatusBar style="auto" />
            </View>
        </GluestackUIProvider>
    );
}

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const [loaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });

    if (!loaded) return null;

    return (
        <AuthProvider>
            <ChatBubbleProvider>
                <RootLayoutContent />
            </ChatBubbleProvider>
        </AuthProvider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
});
