import "@/global.css";
import { Redirect, Stack } from 'expo-router';
import 'react-native-reanimated';

import { useAuthSession } from "@/providers/AuthProvider";

export default function RootLayout() {
    const { token, isLoading } = useAuthSession()

    if (!token?.current) {
        return <Redirect href="/(auth)/signin" />;
    }

    return (
        <Stack>
            <Stack.Screen name="(home)" options={{ headerShown: false }} />
        </Stack>
    );
}
