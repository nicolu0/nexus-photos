import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useImages } from '../../context/ImagesContext';

export default function CameraScreen() {
    const { addImage } = useImages();
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleTakePhoto() {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Camera access is needed to take photos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.7
        });

        if (result.canceled || !result.assets || !result.assets[0]) {
            return;
        }

        const asset = result.assets[0];
        setPreviewUri(asset.uri);

        addImage({
            uri: asset.uri,
            createdAt: Date.now()
        });

        // If you want to call /api/damage-check, you can do it here
        // setLoading(true); await sendToDamageCheck(asset.uri); setLoading(false);
    }

    return (
        <View className="flex-1 bg-slate-950 px-4 py-6">
            <Text className="text-white text-xl font-semibold mb-1">
                Camera
            </Text>
            <Text className="text-slate-400 text-xs mb-4">
                Take a photo of a potential issue. It will show up in the Images tab.
            </Text>

            <TouchableOpacity
                onPress={handleTakePhoto}
                className="mt-2 self-start rounded-full bg-indigo-500 px-5 py-3 active:bg-indigo-400"
            >
                <Text className="text-white text-sm font-semibold">
                    Take photo
                </Text>
            </TouchableOpacity>

            {loading && (
                <View className="mt-4 flex-row items-center gap-2">
                    <ActivityIndicator size="small" color="#6366f1" />
                    <Text className="text-slate-400 text-xs">
                        Analyzing damage…
                    </Text>
                </View>
            )}

            {previewUri && (
                <View className="mt-6 rounded-2xl border border-slate-800 overflow-hidden">
                    <Image
                        source={{ uri: previewUri }}
                        className="w-full h-64"
                        resizeMode="cover"
                    />
                </View>
            )}
        </View>
    );
}
