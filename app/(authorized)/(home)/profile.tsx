import React from "react";
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Image } from "@/components/ui/image";
import { VStack } from '@/components/ui/vstack';

import { Button, ButtonText } from "@/components/ui/button";
import { useAuthSession } from "@/providers/AuthProvider";

export default function ProfileScreen() {
    const { user } = useAuthSession()
    const { signOut } = useAuthSession();
    const API_URL: String = process.env.EXPO_PUBLIC_API_BASEURL || '';
    return (
        <>
            <ThemedView style={styles.container}>
                <VStack className='mt-3 overflow-auto' space="md">
                    <Image
                        size="md"
                        className='rounded-lg border bg-gray-200'
                        source={{
                            uri: user?.current?.profilePicture
                                ? `${API_URL}/${user?.current?.profilePicture}`
                                : ''
                        }}
                        alt="image"
                    />
                    <ThemedText type="title">Profile</ThemedText>
                    <ThemedText type="default">{user?.current?.firstName} {user?.current?.lastName}</ThemedText>
                    <VStack space="sm">
                        <ThemedText type="subtitle">Email</ThemedText>
                        <ThemedText type="default">{user?.current?.email}</ThemedText>
                    </VStack>
                    <Button action="negative" onPress={signOut}>
                        <ButtonText>Se deconnecter</ButtonText>
                    </Button>
                </VStack>
            </ThemedView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
});
