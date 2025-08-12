import { User } from "@/models/User";
import * as ImagePicker from 'expo-image-picker';
import React from "react";
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Center } from '@/components/ui/center';
import { Image } from "@/components/ui/image";
import {
    Modal,
    ModalBackdrop,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
} from "@/components/ui/modal";
import { VStack } from '@/components/ui/vstack';

import { Button, ButtonText } from "@/components/ui/button";
import { useAuthSession } from "@/providers/AuthProvider";
import UserService from "@/services/UserService";

export default function ProfileScreen() {
    const { token, user } = useAuthSession()
    const { signOut } = useAuthSession();
    const API_URL: String = process.env.EXPO_PUBLIC_API_BASEURL || '';

    const [userProfile, setUserProfile] = React.useState<User | null>(null);

    const [showProfilePictureModal, setProfilePictureModal] = React.useState(false)
    const [profilePicture, setProfilePicture] = React.useState<string | null>(null);
    const [profilePictureUploadError, setProfilePictureUploadError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (user?.current) {
            console.log(user?.current, token?.current);
            UserService.getUserById(token?.current)
                .then((response) => {
                    return response.json();
                })
                .then((data) => {
                    console.log(data);
                    setUserProfile(data as User);
                })
        }
    }, [user]);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });
    
        if (!result.canceled) {
            setProfilePicture(result.assets[0].uri);
        }
    };

    const upadteProfilePicture = async () => {
        if (!profilePicture || !userProfile?.id) return;

        try {
            const response = await UserService.patchProfilePicture(userProfile.id, token?.current, profilePicture);
            const data = await response.json();
        } catch (error: any) {
            setProfilePictureUploadError(error.message);
        }
    }

    return (
        <>
            <ThemedView style={styles.container}>
                <VStack className='mt-3 overflow-auto' space="md">
                    <Pressable onPress={ () =>  { 
                            setProfilePictureModal(true);
                            setProfilePicture(null);
                        } 
                    }>
                        <Image
                            size="md"
                            className='rounded-lg border bg-gray-200'
                            source={
                                userProfile?.profilePicture
                                    ? { uri: `${API_URL}/${userProfile.profilePicture}` }
                                    : require('@/assets/images/react-logo.png')
                            }
                            alt="Profile picture"
                        />
                    </Pressable>
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
                <Modal
                    isOpen={showProfilePictureModal}
                    onClose={() => {
                        setProfilePictureModal(false)
                    }}
                    size="lg"
                >
                    <ModalBackdrop />
                    <ModalContent>
                        <ModalHeader className="flex-col items-start gap-0.5">
                            <ThemedText type="title">Photo de profil</ThemedText>
                        </ModalHeader>
                        <ModalBody className="mb-4">
                        {profilePictureUploadError && <ThemedText type="default">{profilePictureUploadError}</ThemedText>}
                        {profilePicture && 
                            <Center>
                                <Image
                                    size="md"
                                    className='rounded-lg border bg-gray-200 m-2' 
                                    source={{ uri: profilePicture }}
                                    alt="Selected profile picture"  
                                />
                            </Center>
                        }
                        <Button onPress={pickImage} >
                            <ButtonText>Choisir une nouvelle photo</ButtonText>
                        </Button>
                        </ModalBody>
                        <ModalFooter className="flex-col items-start">
                            <Button
                                className="w-full"
                                onPress={ () => upadteProfilePicture() }
                            >
                                <ButtonText>Mettre à jour</ButtonText>
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
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
