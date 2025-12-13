import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useImages } from '../../context/ImagesContext';

export default function CameraScreen() {
    const { addImage } = useImages();
    const insets = useSafeAreaInsets();
    const [previewUri, setPreviewUri] = useState<string | null>(null);

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
    }

    async function handlePickFromLibrary() {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Photo library access is needed to select photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
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
    }

    return (
        <View className="flex-1 bg-stone-50 px-4 py-6" style={{ paddingTop: insets.top + 24 }}>
            <Text className="text-stone-900 text-xl font-semibold mb-1">
                Camera
            </Text>
            <Text className="text-stone-500 text-xs mb-4">
                Take a photo or select from your camera roll. It will show up in the Images tab.
            </Text>

            <View className="flex-row gap-3 mt-2">
                <TouchableOpacity
                    onPress={handleTakePhoto}
                    className="flex-1 rounded-full bg-indigo-500 px-5 py-3 active:bg-indigo-400"
                >
                    <Text className="text-white text-sm font-semibold text-center">
                        Take photo
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handlePickFromLibrary}
                    className="flex-1 rounded-full bg-slate-700 px-5 py-3 active:bg-slate-600"
                >
                    <Text className="text-white text-sm font-semibold text-center">
                        Choose from library
                    </Text>
                </TouchableOpacity>
            </View>

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
