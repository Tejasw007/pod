// Shared row types for the two order workflows.

export type OrderKind = "print" | "stationery";

export interface PodInfo {
  name: string;
  location: string;
}

export interface PrintOrder {
  id: string;
  user_id: string;
  file_name: string;
  file_drive_id: string | null;
  file_drive_link: string | null;
  page_count: number;
  copies: number;
  paper_size: string;
  color_mode: string;
  print_side: string;
  total_price: number;
  pickup_code: string | null;
  pod_id: string | null;
  status: string;
  created_at: string;
  pods?: PodInfo | null;
  user_name?: string;
}

export interface StationeryOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  stationery_products?: { name: string; price: number } | null;
}

export interface StationeryOrder {
  id: string;
  user_id: string;
  total_price: number;
  pickup_code: string | null;
  pod_id: string | null;
  status: string;
  created_at: string;
  pods?: PodInfo | null;
  stationery_order_items?: StationeryOrderItem[];
  user_name?: string;
}

/** Payload broadcast to a kiosk on the `pod_<id>` realtime channel. */
export type PodOrderEvent =
  | (PrintOrder & { order_type: "print" })
  | (StationeryOrder & { order_type: "stationery" });

export const PRINT_ACTIVE = ["READY_FOR_PRINT", "POD_CONNECTED", "AWAITING_CONFIRMATION", "PRINTING"];
export const PRINT_DONE = ["PRINTED", "CANCELLED", "PRINT_FAILED", "EXPIRED"];
export const STATIONERY_ACTIVE = ["PAYMENT_PENDING", "READY_FOR_PICKUP", "POD_CONNECTED", "DISPENSING"];
export const STATIONERY_DONE = ["PICKED_UP", "CANCELLED"];
