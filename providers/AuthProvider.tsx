
import { router } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { createContext, MutableRefObject, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

const AuthContext = createContext<{
    signIn: (arg0: string) => void,
    signOut: () => void,
    token: MutableRefObject<string | null> | null,
    user: MutableRefObject<string | null> | null,
    isLoading: boolean,
}>({
    signIn: () => null,
    signOut: () => null,
    token: null,
    user: null,
    isLoading: true
});

// Access the context as a hook
export function useAuthSession() {
    return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }): ReactNode {
    const API_URL: string = process.env.EXPO_PUBLIC_API_BASEURL || '';
    const tokenRef = useRef<string | null>(null);
    const userRef = useRef<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async (): Promise<void> => {
            let token = null;
            let user = null;

            if (Platform.OS !== 'web') {
                token = await SecureStore.getItemAsync('userToken');
                user = await SecureStore.getItemAsync('userId');
            } else {
                token = localStorage.getItem('userToken');
                user = localStorage.getItem('userId');
            }

            tokenRef.current = token || '';
            userRef.current = user || '';
            setIsLoading(false);
        })()
    }, []);

    const signIn = useCallback(async (creds: string) => {
        const response = await fetch(`${API_URL}/api/auth/signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: creds,
        });
        const data = await response.json();
        console.log("Login reponse iid:", data);
        if (!response.ok) {
            const error = new Error();

            let fields: any = data.fields || [];
            let fieldskv: any = {};
            fields.forEach((item: any) => {
                const [key, ...rest] = item.split(':');
                fieldskv[key.trim()] = rest.join(':').trim();
            });

            (error as any).fields = fieldskv;
            (error as any).message = data.message;
            throw error;
        }

        if (Platform.OS !== 'web') {
            await SecureStore.setItemAsync('userToken', data.token);
            await SecureStore.setItemAsync('userId', data.userId);
        } else {
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userId', data.userId);
        }

        tokenRef.current = data.token;
        userRef.current = data.userId;

        router.replace("/(authorized)/cond");


    }, []);

    const signOut = useCallback(async () => {
        if (Platform.OS !== 'web') {
            await SecureStore.deleteItemAsync('userToken');
            await SecureStore.deleteItemAsync('userId');
        } else {
            localStorage.removeItem('userToken');
            localStorage.removeItem('userId');
        }

        tokenRef.current = null;
        userRef.current = null;
        router.replace('/(auth)/signin');
    }, []);

    return (
        <AuthContext.Provider
            value={{
                signIn,
                signOut,
                token: tokenRef,
                user: userRef,
                isLoading
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};