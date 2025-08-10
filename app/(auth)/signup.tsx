import { Link, useRouter } from 'expo-router';
import React from "react";
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

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
    FormControlHelper,
    FormControlHelperText,
    FormControlLabel,
    FormControlLabelText,
} from "@/components/ui/form-control";
import { AlertCircleIcon, ChevronDownIcon, EyeIcon, EyeOffIcon, InfoIcon } from "@/components/ui/icon";
import { Image } from "@/components/ui/image";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import {
    Select,
    SelectBackdrop,
    SelectContent,
    SelectDragIndicator,
    SelectDragIndicatorWrapper,
    SelectIcon,
    SelectInput,
    SelectItem,
    SelectPortal,
    SelectTrigger,
} from "@/components/ui/select";
import { VStack } from '@/components/ui/vstack';
import UserService from '@/services/UserService';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function SignUpScreen() {
    const router = useRouter();
    const [date, setDate] = React.useState(new Date());
    const [showDatePicker, setShowDatePicker] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [signUpError, setSignUpError] = React.useState(null);
    const [isInvalid, setIsInvalid] = React.useState({
        lastName: false,
        firstName: false,
        email: false,
        password: false,
        birthDate: false
    });
    const [validationError, setValidationError] = React.useState({
        lastName: '',
        firstName: '',
        email: '',
        password: '',
        birthDate: ''
    });

    const { control, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            firstName: 'Toky',
            lastName: 'Lucas',
            email: 'toky.andrianina401@gmail.com',
            password: '12345678',
            birthDate: '1970-01-01',
            gender: 'HOMME',
            type: 'CONDUCTEUR'
        },
    });

    const getLocalDateString = (date: Date) => {
        return (
            date.getFullYear() +
            '-' +
            String(date.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(date.getDate()).padStart(2, '0')
        );
    };
    const handleShowPassword = () => {
        setShowPassword((showState) => {
            return !showState
        })
    }
    const onSubmit = async (data: any) => {
        let creds = JSON.stringify(data);
        try {
            setIsLoading(true);
            setSignUpError(null);
            setValidationError({
                lastName: '',
                firstName: '',
                email: '',
                password: '',
                birthDate: ''
            });
            setIsInvalid({
                lastName: false,
                firstName: false,
                email: false,
                password: false,
                birthDate: false
            });
            await UserService.signUp(creds);
            router.push({
                pathname: '/signin',
                params: { infoMessage: 'Inscris avec succes. Veuillez vous connecter.' }
            });
        } catch (error: any) {
            setSignUpError(error.message || 'An error occurred during signup.');
            setValidationError(error.fields);
            setIsInvalid({
                lastName: !!error.fields.lastName,
                firstName: !!error.fields.firstName,
                email: !!error.fields.email,
                password: !!error.fields.password,
                birthDate: !!error.fields.email,
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
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
                    <ThemedText type="title">Inscription</ThemedText>
                    <VStack className='mt-3 overflow-scroll' space="md">
                        {signUpError && (
                            <Alert action="error" variant="solid">
                                <AlertIcon as={InfoIcon} />
                                <AlertText>{signUpError}</AlertText>
                            </Alert>
                        )}
                        <FormControl
                            size="sm"
                            isRequired={true}
                            isInvalid={isInvalid.lastName}
                        >
                            <FormControlLabel>
                                <FormControlLabelText>Nom</FormControlLabelText>
                            </FormControlLabel>
                            <Controller
                                control={control}
                                name="lastName"
                                render={({ field: { onChange, value } }) => (
                                    <Input className="my-1">
                                        <InputField
                                            type="text"
                                            placeholder="Nom"
                                            value={value}
                                            onChangeText={onChange}
                                        />
                                    </Input>
                                )}
                            />
                            <FormControlError>
                                <FormControlErrorIcon as={AlertCircleIcon} />
                                <FormControlErrorText>
                                    {validationError.lastName || ''}
                                </FormControlErrorText>
                            </FormControlError>
                        </FormControl>
                        <FormControl
                            size="sm"
                            isRequired={true}
                            isInvalid={isInvalid.firstName}
                        >
                            <FormControlLabel>
                                <FormControlLabelText>Prénom</FormControlLabelText>
                            </FormControlLabel>
                            <Controller
                                control={control}
                                name="firstName"
                                render={({ field: { onChange, value } }) => (
                                    <Input className="my-1">
                                        <InputField
                                            type="text"
                                            placeholder="Prénom"
                                            value={value}
                                            onChangeText={onChange}
                                        />
                                    </Input>
                                )}
                            />
                            <FormControlError>
                                <FormControlErrorIcon as={AlertCircleIcon} />
                                <FormControlErrorText>
                                    {validationError.firstName || ''}
                                </FormControlErrorText>
                            </FormControlError>
                        </FormControl>
                        <FormControl isRequired>
                            <FormControlLabel>
                                <FormControlLabelText>Sexe</FormControlLabelText>
                            </FormControlLabel>
                            <Controller
                                control={control}
                                name="gender"
                                render={({ field: { onChange, value } }) => (
                                    <Select
                                        selectedValue={value}
                                        onValueChange={onChange}
                                    >
                                        <SelectTrigger variant="outline" size="md" className="flex flex-row justify-between items-center" style={{ height: 38 }}>
                                            <SelectInput placeholder="Select option" />
                                            <SelectIcon className="mr-3" as={ChevronDownIcon} />
                                        </SelectTrigger>
                                        <SelectPortal>
                                            <SelectBackdrop />
                                            <SelectContent>
                                                <SelectDragIndicatorWrapper>
                                                    <SelectDragIndicator />
                                                </SelectDragIndicatorWrapper>
                                                <SelectItem label="Homme" value="HOMME" />
                                                <SelectItem label="Femme" value="FEMME" />
                                            </SelectContent>
                                        </SelectPortal>
                                    </Select>
                                )}
                            />
                        </FormControl>
                        <FormControl
                            isRequired
                            isInvalid={isInvalid.birthDate}
                        >
                            <FormControlLabel>
                                <FormControlLabelText>Date de naissance</FormControlLabelText>
                            </FormControlLabel>
                            <Controller
                                control={control}
                                name="birthDate"
                                render={({ field: { onChange, value } }) => (
                                    <Input className="my-1">
                                        <InputField
                                            type="text"
                                            placeholder="Date de naissance"
                                            onPress={() => setShowDatePicker(true)}
                                            onChangeText={onChange}
                                            value={getLocalDateString(date)}
                                        />
                                    </Input>
                                )}
                            />
                            {showDatePicker && (
                                <DateTimePicker
                                    value={date}
                                    mode="date"
                                    display="default"
                                    onChange={(event, selectedDate) => {
                                        if (Platform.OS === 'android') setShowDatePicker(false);
                                        if (selectedDate) setDate(selectedDate);
                                    }
                                    }
                                />
                            )}
                            <FormControlError>
                                <FormControlErrorIcon as={AlertCircleIcon} />
                                <FormControlErrorText>
                                    {validationError.birthDate || ''}
                                </FormControlErrorText>
                            </FormControlError>
                        </FormControl>
                        <FormControl isRequired>
                            <FormControlLabel>
                                <FormControlLabelText>Type</FormControlLabelText>
                            </FormControlLabel>
                            <Controller
                                control={control}
                                name="type"
                                render={({ field: { onChange, value } }) => (
                                    <Select
                                        selectedValue={value}
                                        onValueChange={onChange}
                                    >
                                        <SelectTrigger variant="outline" size="md" className="flex flex-row justify-between items-center" style={{ height: 38 }}>
                                            <SelectInput placeholder="Select option" />
                                            <SelectIcon className="mr-3" as={ChevronDownIcon} />
                                        </SelectTrigger>
                                        <SelectPortal>
                                            <SelectBackdrop />
                                            <SelectContent>
                                                <SelectDragIndicatorWrapper>
                                                    <SelectDragIndicator />
                                                </SelectDragIndicatorWrapper>
                                                <SelectItem label="Conducteur" value="CONDUCTEUR" />
                                                <SelectItem label="Passager" value="PASSAGER" />
                                            </SelectContent>
                                        </SelectPortal>
                                    </Select>
                                )}
                            />
                        </FormControl>
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
                            <FormControlHelper>
                                <FormControlHelperText>
                                    Must be atleast 6 characters.
                                </FormControlHelperText>
                            </FormControlHelper>
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
                                <ButtonText>S'inscrire</ButtonText>
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
                    <Link href="/(auth)/signin" style={styles.link}>
                        <ThemedText type="link">Se connecter ?</ThemedText>
                    </Link>
                </ThemedView>
            </KeyboardAvoidingView>
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
