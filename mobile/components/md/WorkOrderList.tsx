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
    const formatDateTime = (iso: string | null) => {
        if (!iso) return '—';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

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
                <View className="mb-3 mx-2 rounded-xl bg-white border border-gray-200 px-4 py-3">
                    <View className="flex-row justify-between items-center mb-1">
                        <View className="flex-row items-center">
                            <Text className="text-sm font-semibold text-stone-800">
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

                    <Text className="text-xs text-stone-500 mb-1">
                        {item.vendor_name} - {item.vendor_trade}
                    </Text>

                    <View className="flex-row justify-between items-center mt-1">
                        <Text className="text-[11px] text-stone-500">
                            Started {formatDateTime(item.created_at)}
                        </Text>
                        <Text className="text-[11px] text-stone-400">
                            Last activity {formatDateTime(item.updated_at)}
                        </Text>
                    </View>

                    <Text className="text-stone-600 mt-2">
                        {item.summary}
                    </Text>
                </View>
            )}
            contentContainerStyle={contentContainerStyle}
        />
    )
}