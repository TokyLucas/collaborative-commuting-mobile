import { User } from "@/models/User";
import React from "react";
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Image } from "@/components/ui/image";
import { VStack } from '@/components/ui/vstack';

import { Button, ButtonText } from "@/components/ui/button";
import { useAuthSession } from "@/providers/AuthProvider";
import UserService from "@/services/UserService";

export default function ProfileScreen() {
    const { token, user } = useAuthSession()
    const { signOut } = useAuthSession();
    const API_URL: String = process.env.EXPO_PUBLIC_API_BASEURL || '';

    const [userProfile, setUserProfile] = React.useState<User | null>(null);

    React.useEffect(() => {
        if (user?.current) {
            console.log(user?.current, token?.current);
            UserService.getUserById(user?.current, token?.current)
            .then((response) => {
                return response.json();
            })
            .then((data) => {
                console.log(data);
                setUserProfile(data as User);
            })
        }
    }, [user]);

    return (
        <>
            <ThemedView style={styles.container}>
                <VStack className='mt-3 overflow-auto' space="md">
                    <Image
                        size="md"
                        className='rounded-lg border bg-gray-200'
                        source={{
                            uri: userProfile?.profilePicture
                                ? `${API_URL}/${userProfile?.profilePicture}`
                                : ''
                        }}
                        alt="image"
                    />
                    <ThemedText type="title">Profile</ThemedText>
                    <ThemedText type="default">{userProfile?.firstName} {userProfile?.lastName}</ThemedText>
                    <VStack space="sm">
                        <ThemedText type="subtitle">Email</ThemedText>
                        <ThemedText type="default">{userProfile?.email}</ThemedText>
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
