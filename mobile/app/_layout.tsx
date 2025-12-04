import '../global.css';
import React from 'react';
import { Stack } from 'expo-router';
import { ImagesProvider } from '../context/ImagesContext';

export default function RootLayout() {
    return (
        <ImagesProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
        </ImagesProvider>
    );
}
