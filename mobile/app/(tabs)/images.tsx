import React, { useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Modal, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImageManipulator from 'expo-image-manipulator';
import { useImages, type CapturedImage } from '../../context/ImagesContext';

// const API_BASE_URL = 'https://www.nexus.photos';
const API_BASE_URL = 'https://daphne-unradical-barb.ngrok-free.dev';
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ImagesScreen() {
    const { images } = useImages();
    const insets = useSafeAreaInsets();
    const [selectedImage, setSelectedImage] = useState<CapturedImage | null>(null);
    const [loading, setLoading] = useState(false);

    async function uploadImageToAPI(imageUri: string) {
        try {
            // Compress and resize image before uploading to avoid 413 errors
            const manipulatedImage = await ImageManipulator.manipulateAsync(
                imageUri,
                [{ resize: { width: 1920 } }], // Resize to max width of 1920px (maintains aspect ratio)
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // Compress to 70% quality
            );

            // Create FormData for React Native
            const formData = new FormData();
            const fileName = imageUri.split('/').pop() ?? 'damage.jpg';
            formData.append('image', {
                // @ts-ignore React Native file
                uri: manipulatedImage.uri,
                type: 'image/jpeg',
                name: fileName,
            } as any);

            // Make API call
            // Note: Don't set Content-Type header - React Native will set it automatically with boundary
            const res = await fetch(`${API_BASE_URL}/api/photo`, {
                method: 'POST',
                body: formData,
            });

            /**
            const base64 = await FileSystem.readAsStringAsync(imageUri, {
                encoding: 'base64'
            });

            const payload = {
                imageBase64: base64,
                mimeType: 'image/jpeg'
            };

            const res = await fetch(`${API_BASE_URL}/api/photo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            **/

            // Read response as text first, then parse as JSON
            // This allows us to handle both JSON and non-JSON error responses
            const responseText = await res.text();
            
            let json;
            try {
                json = JSON.parse(responseText);
            } catch (parseError) {
                // If it's not JSON, show the raw response (likely an error page)
                throw new Error(`Server error (${res.status}): ${responseText.substring(0, 200)}`);
            }

            if (!res.ok) {
                // Handle 413 Payload Too Large error specifically
                if (res.status === 413) {
                    Alert.alert(
                        'Image Too Large',
                        'The image is too large to upload. Please try taking a photo with lower quality or resolution.',
                        [{ text: 'OK' }]
                    );
                } else {
                    Alert.alert('Error', json.error ?? 'Failed to analyze image.');
                }
                return;
            }

            if (json.name === null || json.trade === null) {
                Alert.alert(
                    'No Damage Detected',
                    'The image was analyzed and no visible damage was found.',
                    [{ text: 'OK' }]
                );
            } else if (json.sentToVendor) {
                Alert.alert('Sent', 'Damage summary sent to vendor.', [
                    { text: 'OK' }
                ]);
            } else {
                Alert.alert(
                    'Analyzed only',
                    json.sendError ??
                        'Damage summary generated, but SMS was not sent to vendor.'
                );
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    async function handleSendToVendor() {
        if (!selectedImage) return;

        setLoading(true);
        try {
            await uploadImageToAPI(selectedImage.uri);
            setSelectedImage(null);
        } catch (error: any) {
            Alert.alert('Error', error?.message ?? 'Failed to send image. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    // Calculate image dimensions: 50% of screen height with 4:3 aspect ratio
    const imageHeight = SCREEN_HEIGHT * 0.5;
    let imageWidth = (imageHeight * 4) / 3; // 4:3 aspect ratio
    
    // Ensure image fits within screen width (accounting for modal padding)
    const maxWidth = SCREEN_WIDTH - 64; // 32px padding on each side
    if (imageWidth > maxWidth) {
        imageWidth = maxWidth;
    }

    return (
        <View className="flex-1 bg-slate-950 px-4 py-6" style={{ paddingTop: insets.top + 24 }}>
            <Text className="text-white text-xl font-semibold mb-3">
                Images
            </Text>

            {images.length === 0 ? (
                <Text className="text-slate-400 text-sm">
                    No images yet. Take a photo in the Camera tab.
                </Text>
            ) : (
                <FlatList
                    data={images}
                    numColumns={3}
                    keyExtractor={(item) => item.createdAt.toString() + item.uri}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            className="flex-1 aspect-square border border-slate-800 overflow-hidden bg-slate-900"
                            onPress={() => setSelectedImage(item)}
                            activeOpacity={0.8}
                        >
                            <Image
                                source={{ uri: item.uri }}
                                className="w-full h-full"
                                resizeMode="cover"
                            />
                        </TouchableOpacity>
                    )}
                />
            )}

            <Modal
                visible={selectedImage !== null}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <View className="flex-1 bg-black/80 justify-center items-center px-4">
                    <View className="bg-slate-900 rounded-2xl p-6 w-full items-center">
                        {selectedImage && (
                            <>
                                <View className="items-center mb-6" style={{ width: '100%' }}>
                                    <Image
                                        source={{ uri: selectedImage.uri }}
                                        style={{ width: imageWidth, height: imageHeight, maxWidth: '100%' }}
                                        resizeMode="contain"
                                    />
                                </View>
                                <TouchableOpacity
                                    onPress={handleSendToVendor}
                                    disabled={loading}
                                    className="bg-indigo-500 rounded-lg px-6 py-3 items-center w-full active:bg-indigo-400 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                        <Text className="text-white text-base font-semibold">
                                            Send to Vendor
                                        </Text>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setSelectedImage(null)}
                                    className="mt-3 bg-slate-700 rounded-lg px-6 py-3 items-center w-full active:bg-slate-600"
                                >
                                    <Text className="text-white text-base font-semibold">
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
