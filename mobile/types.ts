export type WorkOrderStatus = 'pending' | 'in_progress' | 'completed' | string;

export type WorkOrderRow = {
    id: string;
    property_label: string;
    unit_label: string;
    vendor_phone: string;
    vendor_name: string;
    vendor_trade: string;
    summary: string;
    status: WorkOrderStatus;
    created_at: string;
    updated_at: string;
}