import { Link } from 'expo-router';
import React from "react";
import { Platform, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button, ButtonText } from "@/components/ui/button";
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
import { AlertCircleIcon, ChevronDownIcon, EyeIcon, EyeOffIcon } from "@/components/ui/icon";
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
import DateTimePicker from '@react-native-community/datetimepicker';

export default function SignUpScreen() {
    const [date, setDate] = React.useState(new Date());
    const [showDatePicker, setShowDatePicker] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false)

    const handleShowPassword = () => {
        setShowPassword((showState) => {
            return !showState
        })
    }
    const handleSubmit = () => {
        
    }

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
                <ThemedText type="title">Inscription</ThemedText>
                <VStack className='mt-3 overflow-scroll' space="md">
                    <FormControl
                        size="sm"
                        isRequired={true}
                    >
                        <FormControlLabel>
                            <FormControlLabelText>Nom</FormControlLabelText>
                        </FormControlLabel>
                        <Input className="my-1">
                            <InputField
                                type="text"
                                placeholder="Nom"
                            />
                        </Input>
                    </FormControl>
                    <FormControl
                        size="sm"
                        isRequired={true}
                    >
                        <FormControlLabel>
                            <FormControlLabelText>Prénom</FormControlLabelText>
                        </FormControlLabel>
                        <Input className="my-1">
                            <InputField
                                type="text"
                                placeholder="Prénom"
                            />
                        </Input>
                    </FormControl>
                    <FormControl isRequired>
                        <FormControlLabel>
                            <FormControlLabelText>Sexe</FormControlLabelText>
                        </FormControlLabel>
                        <Select>
                            <SelectTrigger variant="outline" size="md">
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
                    </FormControl>
                    <FormControl isRequired>
                        <FormControlLabel>
                            <FormControlLabelText>Date de naissance</FormControlLabelText>
                        </FormControlLabel>
                        <Input className="my-1">
                            <InputField
                                type="text"
                                placeholder="Date de naissance"
                                onPress={() => setShowDatePicker(true)}
                                value={date.toLocaleDateString()}
                            />
                        </Input>
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
                    </FormControl>
                    <FormControl isRequired>
                        <FormControlLabel>
                            <FormControlLabelText>Type</FormControlLabelText>
                        </FormControlLabel>
                        <Select>
                            <SelectTrigger variant="outline" size="md">
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
                    </FormControl>
                    <FormControl
                        size="sm"
                        isRequired={true}
                    >
                        <FormControlLabel>
                            <FormControlLabelText>Email</FormControlLabelText>
                        </FormControlLabel>
                        <Input className="my-1">
                            <InputField
                                type="text"
                                placeholder="Email"
                            />
                        </Input>
                    </FormControl>
                    <FormControl
                        size="sm"
                        isRequired={true}
                    >
                        <FormControlLabel>
                            <FormControlLabelText>Mot de passe</FormControlLabelText>
                        </FormControlLabel>
                        <Input>
                            <InputField
                                type={showPassword ? "text" : "password"}
                                placeholder="Mot de passe"
                            />
                            <InputSlot className="pr-3" onPress={handleShowPassword}>
                                <InputIcon as={showPassword ? EyeIcon : EyeOffIcon} />
                            </InputSlot>
                        </Input>
                        <FormControlHelper>
                            <FormControlHelperText>
                                Must be atleast 6 characters.
                            </FormControlHelperText>
                        </FormControlHelper>
                        <FormControlError>
                            <FormControlErrorIcon as={AlertCircleIcon} />
                            <FormControlErrorText>
                                Atleast 6 characters are required.
                            </FormControlErrorText>
                        </FormControlError>
                    </FormControl>
                    <Button className="w-100" size="sm" onPress={handleSubmit}>
                        <ButtonText>Se connecter</ButtonText>
                    </Button>
                </VStack>
                <Link href="/(auth)/signin" style={styles.link}>
                    <ThemedText type="link">Se connecter ?</ThemedText>
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
