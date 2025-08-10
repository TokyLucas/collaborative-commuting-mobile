import { useAuthSession } from "@/providers/AuthProvider";
import { Link, useLocalSearchParams } from 'expo-router';
import React from "react";
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Alert, AlertIcon, AlertText } from "@/components/ui/alert";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Center } from '@/components/ui/center';
import {
    FormControl,
    FormControlError,
    FormControlErrorIcon,
    FormControlErrorText,
    FormControlLabel,
    FormControlLabelText
} from "@/components/ui/form-control";
import { AlertCircleIcon, EyeIcon, EyeOffIcon, InfoIcon } from "@/components/ui/icon";
import { Image } from "@/components/ui/image";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { VStack } from '@/components/ui/vstack';

export default function SignInScreen() {
    const localSearchParams = useLocalSearchParams();
    const [showPassword, setShowPassword] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [signInError, setSignInError] = React.useState(null);
    const [isInvalid, setIsInvalid] = React.useState({
        email: false,
        password: false,
    })
    const [validationError, setValidationError] = React.useState({
        email: '',
        password: '',
    });
    const { signIn } = useAuthSession();

    const { control, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            email: 'toky.andrianina401@gmail.com',
            password: '12345678',
        },
    });

    const handleShowPassword = () => {
        setShowPassword((showState) => {
            return !showState
        })
    }

    const onSubmit = async (data: any) => {
        let creds = JSON.stringify(data)
        try {
            setIsLoading(true);
            setSignInError(null);
            setValidationError({
                email: '',
                password: '',
            });
            setIsInvalid({
                email: false,
                password: false,
            });
            await signIn(creds);
        } catch (error: any) {
            setIsLoading(false);
            setSignInError(error.message || 'An error occurred during login.');
            setValidationError(error.fields);
            setIsInvalid({
                email: !!error.fields.email,
                password: !!error.fields.password,
            });
        }
    };

    return (
        <>
            <ThemedView style={styles.container}>
                <Center
                    className='mb-3 w-full'
                >
                    <Image
                        size="md"
                        className='rounded-lg'
                        source={require('@/assets/images/react-logo.png')}
                        alt="image"
                    />
                </Center>
                <ThemedText type="title">Connexion</ThemedText>
                <VStack className='mt-3' space="md">
                    {localSearchParams.infoMessage && (
                        <Alert action="success" variant="solid">
                            <AlertIcon as={InfoIcon} />
                            <AlertText>{localSearchParams.infoMessage}</AlertText>
                        </Alert>
                    )}
                    {signInError && (
                        <Alert action="error" variant="solid">
                            <AlertIcon as={InfoIcon} />
                            <AlertText>{signInError}</AlertText>
                        </Alert>
                    )}
                    <FormControl
                        size="sm"
                        isRequired={true}
                        isInvalid={isInvalid.email}
                    >
                        <FormControlLabel>
                            <FormControlLabelText>Email</FormControlLabelText>
                        </FormControlLabel>
                        <Controller
                            control={control}
                            name="email"
                            render={({ field: { onChange, value } }) => (
                                <Input className="my-1">
                                    <InputField
                                        type="text"
                                        placeholder="Email"
                                        value={value}
                                        onChangeText={onChange}
                                    />
                                </Input>
                            )}
                        />
                        <FormControlError>
                            <FormControlErrorIcon as={AlertCircleIcon} />
                            <FormControlErrorText>
                                {validationError.email || ''}
                            </FormControlErrorText>
                        </FormControlError>
                    </FormControl>
                    <FormControl
                        size="sm"
                        isRequired={true}
                        isInvalid={isInvalid.password}
                    >
                        <FormControlLabel>
                            <FormControlLabelText>Mot de passe</FormControlLabelText>
                        </FormControlLabel>
                        <Controller
                            control={control}
                            name="password"
                            render={({ field: { onChange, value } }) => (
                                <Input>
                                    <InputField
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Mot de passe"
                                        value={value}
                                        onChangeText={onChange}
                                    />
                                    <InputSlot className="pr-3" onPress={handleShowPassword}>
                                        <InputIcon as={showPassword ? EyeIcon : EyeOffIcon} />
                                    </InputSlot>
                                </Input>
                            )}
                        />
                        <FormControlError>
                            <FormControlErrorIcon as={AlertCircleIcon} />
                            <FormControlErrorText>
                                {validationError.password || ''}
                            </FormControlErrorText>
                        </FormControlError>
                    </FormControl>
                    <Button className="w-100" size="sm" onPress={handleSubmit(onSubmit)}>
                        {(!isLoading 
                            ? 
                                <ButtonText>Se connecter</ButtonText> 
                            :
                                <>
                                    <ButtonSpinner />
                                    <ButtonText className="font-medium text-sm ml-2">
                                        Connexion...
                                    </ButtonText>
                                </>
                        )}
                    </Button>
                </VStack>
                <Link href="/(auth)/signup" style={styles.link}>
                    <ThemedText type="link">S'inscrire ?</ThemedText>
                </Link>
            </ThemedView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    link: {
        marginTop: 15,
        paddingVertical: 15,
    },
});
