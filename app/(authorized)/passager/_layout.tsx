import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthSession } from '@/providers/AuthProvider';
import UserService from "@/services/UserService";
import { Home } from 'lucide-react-native';

export default function TabLayout1() {
    const { token, user } = useAuthSession()
    const colorScheme = useColorScheme();
    const router = useRouter();

    if (user?.current) {
        let user_data: any = null;
        UserService.getUserById(token?.current)
            .then((response) => {
                return response.json();
            })
            .then((data) => {
                user_data = data;
                if (user_data?.type == "CONDUCTEUR") router.replace('/(authorized)/cond');
            });
    }
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
                headerShown: false,
                tabBarButton: HapticTab,
                tabBarBackground: TabBarBackground,
                tabBarStyle: Platform.select({
                    ios: {
                        // Use a transparent background on iOS to show the blur effect
                        position: 'absolute',
                    },
                    default: {
                        backgroundColor: Colors[colorScheme ?? 'light'].background,
                        borderTopColor: Colors[colorScheme ?? 'light'].tabIconDefault,
                    },
                }),
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Accueil',
                    tabBarIcon: ({ color }) => <Home color={color} size={24} />
                }}
            />
        </Tabs>
    );
}
