// apps/mobile/app/(tabs)/_layout.tsx

import React, { useEffect, useState } from 'react';
import { Platform, DynamicColorIOS } from 'react-native';
import { Tabs, useSegments } from 'expo-router';
import { NativeTabs, Icon, Label, VectorIcon } from 'expo-router/unstable-native-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

export default function TabLayout() {
    const segments = useSegments();
    const currentRoute = segments[segments.length - 1];
    const isCamera = currentRoute === 'camera' || currentRoute === undefined;

    const [useNativeTabs, setUseNativeTabs] = useState(false);

    useEffect(() => {
        // Only relevant on iOS
        if (Platform.OS !== 'ios') return;

        // Get major iOS version
        const rawVersion = Platform.Version;
        const major =
        typeof rawVersion === 'string'
            ? parseInt(rawVersion.split('.')[0], 10)
            : rawVersion;

        if (Number.isNaN(major) || major < 26) return;

        // Check if Liquid Glass is available
        (async () => {
            try {
                const available = await Promise.resolve(isLiquidGlassAvailable());
                if (available) {
                    setUseNativeTabs(true);
                }
            } catch (err) {
                console.warn('Error checking Liquid Glass availability:', err);
            }
        })();
    }, []);

    // --- NativeTabs (iOS 26+ with Liquid Glass) ---
    if (useNativeTabs) {
        const tintColor = DynamicColorIOS({
            dark: 'slateblue',
            light: 'slateblue',
        });

        return (
            <NativeTabs tintColor={tintColor}>
                <NativeTabs.Trigger name="camera">
                    <Label>Camera</Label>
                    {Platform.select({
                        ios: <Icon sf="camera.fill" />,
                        android: (
                            <Icon src={<VectorIcon family={Ionicons} name="camera" />} />
                        ),
                    })}
                </NativeTabs.Trigger>

                <NativeTabs.Trigger name="images">
                    <Label>Images</Label>
                    {Platform.select({
                        ios: <Icon sf="photo.stack.fill" />,
                        android: (
                            <Icon src={<VectorIcon family={Ionicons} name="images" />} />
                        ),
                    })}
                </NativeTabs.Trigger>
            </NativeTabs>
        );
    }

    // --- Fallback: classic Tabs (all other platforms / iOS versions) ---
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: isCamera ? '#171717' : 'white',
                    borderTopWidth: 1,
                    borderTopColor: isCamera ? '#262626' : '#eeeeee',
                    height: 85,
                    paddingBottom: 20,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: isCamera ? 'white' : 'black',
                tabBarInactiveTintColor: isCamera ? 'white' : 'black',
            }}
        >
            <Tabs.Screen
                name="camera"
                options={{
                    title: 'Camera',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? 'camera' : 'camera-outline'}
                            size={28}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="images"
                options={{
                    title: 'Images',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? 'images' : 'images-outline'}
                            size={22}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
