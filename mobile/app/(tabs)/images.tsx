import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Modal, ActivityIndicator,
    Alert, Dimensions, TextInput, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImageManipulator from 'expo-image-manipulator';
import { useImages, type CapturedImage } from '../../context/ImagesContext';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

// const API_BASE_URL = 'https://www.nexus.photos';
const API_BASE_URL = 'https://daphne-unradical-barb.ngrok-free.dev';
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ImagesScreen() {
    const isIOS = Platform.OS === 'ios';
    const [glassAvailable, setGlassAvailable] = useState(false);

    useEffect(() => {
        if (!isIOS) return;

        (async () => {
            try {
                // Handles both sync and async implementations
                const available = await Promise.resolve(isLiquidGlassAvailable());
                setGlassAvailable(!!available);
            } catch (err) {
                console.warn('Error checking Liquid Glass availability:', err);
                setGlassAvailable(false);
            }
        })();
    }, [isIOS]);

    const { images } = useImages();
    const insets = useSafeAreaInsets();
    const [selectedImage, setSelectedImage] = useState<CapturedImage | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    async function uploadImageToAPI(imageUri: string, additionalMessage?: string) {
        try {
            // Compress and resize image before uploading to avoid 413 errors
            const manipulatedImage = await ImageManipulator.manipulateAsync(
                imageUri,
                [{ resize: { width: 1920 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );

            const formData = new FormData();
            const fileName = imageUri.split('/').pop() ?? 'damage.jpg';
            formData.append('image', {
                // @ts-ignore React Native file
                uri: manipulatedImage.uri,
                type: 'image/jpeg',
                name: fileName
            } as any);
            
            // Add message if provided
            if (additionalMessage && additionalMessage.trim()) {
                formData.append('message', additionalMessage.trim());
            }

            if (additionalMessage && additionalMessage.trim()) {
                formData.append('message', additionalMessage.trim());
            }

            const res = await fetch(`${API_BASE_URL}/api/photo`, {
                method: 'POST',
                body: formData
            });

            const responseText = await res.text();

            let json: any;
            try {
                json = JSON.parse(responseText);
            } catch {
                throw new Error(
                    `Server error (${res.status}): ${responseText.substring(0, 200)}`
                );
            }

            if (!res.ok) {
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
                Alert.alert('Sent', 'Damage summary sent to vendor.', [{ text: 'OK' }]);
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
            await uploadImageToAPI(selectedImage.uri, message);
            setSelectedImage(null);
            setMessage('');
        } catch (error: any) {
            Alert.alert('Error', error?.message ?? 'Failed to send image. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    const imageHeight = SCREEN_HEIGHT * 0.25;
    let imageWidth = (imageHeight * 4) / 3;
    const maxWidth = SCREEN_WIDTH - 64;
    if (imageWidth > maxWidth) {
        imageWidth = maxWidth;
    }

    const Panel: any = glassAvailable ? GlassView : View;
    const panelExtraProps = glassAvailable
        ? {
              glassEffectStyle: 'regular' as const,
              tintColor: 'rgba(20, 20, 20, 0.2)'
          }
        : {};

    return (
        <View className="flex-1 bg-stone-50 px-4 py-6" style={{ paddingTop: insets.top + 24 }}>
            <Text className="text-stone-900 text-xl font-semibold mb-3">Images</Text>

            {images.length === 0 ? (
                <Text className="text-stone-500 text-sm">
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
                            className="flex-1 aspect-square overflow-hidden"
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
                transparent
                animationType="fade"
                onRequestClose={() => {
                    setSelectedImage(null);
                    setMessage('');
                }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="bg-black/60 flex-1"
                >
                    <View className="flex-1 justify-center items-center px-4">
                        <ScrollView
                            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                            keyboardShouldPersistTaps="handled"
                        >
                            <Panel
                                {...panelExtraProps}
                                className="rounded-2xl w-full"
                                style={{
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                    borderWidth: glassAvailable ? 1 : 0,
                                    borderColor: glassAvailable
                                        ? 'rgba(255, 255, 255, 0.1)'
                                        : 'transparent'
                                }}
                            >
                                <View
                                    style={{
                                        backgroundColor: glassAvailable
                                            ? 'rgba(0, 0, 0, 0.3)'
                                            : 'rgba(0, 0, 0, 0.8)',
                                        padding: 24,
                                        alignItems: 'center',
                                    }}
                                >
                                    {selectedImage && (
                                        <>
                                            <View
                                                className="items-center mb-4"
                                                style={{ width: '100%' }}
                                            >
                                                <Image
                                                    source={{ uri: selectedImage.uri }}
                                                    style={{
                                                        width: imageWidth,
                                                        height: imageHeight,
                                                        maxWidth: '100%'
                                                    }}
                                                    resizeMode="contain"
                                                />
                                            </View>

                                            <View className="w-full mb-4">
                                                <Text className="text-white text-sm font-medium mb-2">
                                                    Additional Details (Optional)
                                                </Text>
                                                <TextInput
                                                    className="bg-white/10 text-white rounded-lg px-4 py-3 text-base border border-white/10"
                                                    placeholder="e.g., Unit 302, Property: 123 Main St..."
                                                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                                                    value={message}
                                                    onChangeText={setMessage}
                                                    multiline
                                                    numberOfLines={3}
                                                    textAlignVertical="top"
                                                    editable={!loading}
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
                                                onPress={() => {
                                                    setSelectedImage(null);
                                                    setMessage('');
                                                }}
                                                className="mt-3 bg-slate-700 rounded-lg px-6 py-3 items-center w-full active:bg-slate-600"
                                            >
                                                <Text className="text-white text-base font-semibold">
                                                    Cancel
                                                </Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            </Panel>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
