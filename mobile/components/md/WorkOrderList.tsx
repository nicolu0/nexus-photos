import React from 'react';
import { View, Text, FlatList, RefreshControl, StyleProp, ViewStyle } from 'react-native';
import { WorkOrderRow } from '../../types'
import { Ionicons } from '@expo/vector-icons';

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

    return (
        <FlatList
            data={workOrders}
            keyExtractor={(item) => item.id}
            // id, property_label, unit_label, vendor_phone, vendor_name, vendor_trade, summary, status, created_at, updated_at
            renderItem={({ item }) => (
                <View className="mb-3 mx-4 rounded-xl bg-white border border-gray-200 px-4 py-3">
                    <View className="flex-row justify-between items-center mb-1">
                        <View className="flex-row items-center">
                            <Text className="ml-1.5 text-sm font-semibold text-stone-800">
                                {item.property_label} · {item.unit_label}
                            </Text>
                        </View>

                        <View
                            className={`px-2 py-0.5 rounded-full ${item.status === 'completed'
                                ? 'bg-emerald-100'
                                : 'bg-amber-100'
                                }`}
                        >
                            <Text
                                className={`text-[11px] font-semibold ${item.status === 'completed'
                                    ? 'text-emerald-700'
                                    : 'text-amber-700'
                                    }`}
                            >
                                {item.status}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
            contentContainerStyle={contentContainerStyle}
        />
    )
}