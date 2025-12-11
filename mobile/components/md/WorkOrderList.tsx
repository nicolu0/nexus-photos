import React from 'react';
import { View, Text, FlatList, RefreshControl, StyleProp, ViewStyle } from 'react-native';
import { WorkOrderRow } from '../../types'

interface WorkOrderProps {
    workOrders: WorkOrderRow[];
    contentContainerStyle?: StyleProp<ViewStyle>;
}

export function WorkOrderList({
    workOrders,
    contentContainerStyle
}: WorkOrderProps) {
    if (workOrders.length === 0) {
        return (
            <View className="flex-1 justify-center items-center px-8">
                <Text className="text-sm font-medium text-stone-700 mb-1">
                    No work orders yet
                </Text>
                <Text className="text-xs text-stone-500 text-center">
                    Start a work order from the camera tab. We&apos;ll track each work order here.
                </Text>
            </View>
        );
    }
}