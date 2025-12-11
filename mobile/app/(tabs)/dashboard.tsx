import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CameraScreen() {
    const insets = useSafeAreaInsets();

    return (
        <View className="flex-1 bg-stone-50 px-4 py-6" style={{ paddingTop: insets.top + 24 }}>
            <Text className="text-stone-900 text-xl font-semibold mb-1">
                Dashboard
            </Text>
            <Text className="text-stone-500 text-xs mb-4">
                Start a work order and view them here.
            </Text>
        </View>
    );
}
