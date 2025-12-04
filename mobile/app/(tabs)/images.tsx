import React from 'react';
import { View, Text, FlatList, Image } from 'react-native';
import { useImages } from '../../context/ImagesContext';

export default function ImagesScreen() {
    const { images } = useImages();

    return (
        <View className="flex-1 bg-slate-950 px-4 py-6">
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
                    keyExtractor={(item) => item.createdAt.toString() + item.uri}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    ItemSeparatorComponent={() => <View className="h-3" />}
                    renderItem={({ item }) => (
                        <View className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900">
                            <Image
                                source={{ uri: item.uri }}
                                className="w-full h-56"
                                resizeMode="cover"
                            />
                            <View className="px-3 py-2 bg-slate-950/80">
                                <Text className="text-slate-400 text-[11px]">
                                    {new Date(item.createdAt).toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    )}
                />
            )}
        </View>
    );
}
