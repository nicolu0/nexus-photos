import React, { useEffect, useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { WorkOrderList } from '../../components/md/WorkOrderList'
import { WorkOrderRow } from '../../types'

export default function CameraScreen() {
    const insets = useSafeAreaInsets();

    const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);

    const landlord_number = '19496566275'; // set later to authed user number

    const fetchWorkOrders = async (landlordPhone: string) => {
        try {
            const { data, error } = await supabase
                .from('work_orders')
                .select('id, property_label, unit_label, vendor_phone, vendor_name, vendor_trade, summary, status, created_at, updated_at')
                .eq('landlord_phone', landlordPhone)
                .order('created_at')

            if (error) throw error;
            setWorkOrders(data || []);
        } catch (err) {
            console.error('Error fetching work orders:', err);
        }
    };

    return (
        <View className="flex-1 bg-stone-50 px-4 py-6" style={{ paddingTop: insets.top + 24 }}>
            <View>
                <Text className="text-stone-900 text-xl font-semibold mb-1">
                    Dashboard
                </Text>
                <Text className="text-stone-500 text-xs mb-4">
                    Start a work order and view them here.
                </Text>
            </View>

            <WorkOrderList
                workOrders={workOrders}
                contentContainerStyle={{ paddingBottom: insets.bottom + 70 }}
            />
        </View>
    );
}
