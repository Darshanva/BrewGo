import { EventEmitter } from "node:events";

const orderEmitter = new EventEmitter();
orderEmitter.setMaxListeners(2000);

const adminEmitter = new EventEmitter();
adminEmitter.setMaxListeners(200);

/** Broadcast a status change to all clients watching a specific order */
export function emitOrderUpdate(orderId: number, data: Record<string, unknown>) {
  orderEmitter.emit(`order:${orderId}`, data);
}

export function onOrderUpdate(
  orderId: number,
  callback: (data: Record<string, unknown>) => void,
) {
  const event = `order:${orderId}`;
  orderEmitter.on(event, callback);
  return () => orderEmitter.off(event, callback);
}

/** Broadcast a new order to all admin panel clients */
export function emitNewOrder(data: Record<string, unknown>) {
  adminEmitter.emit("new_order", data);
}

/** Broadcast an order status change to all admin panel clients */
export function emitAdminOrderUpdate(data: Record<string, unknown>) {
  adminEmitter.emit("order_update", data);
}

export function onAdminEvent(
  event: "new_order" | "order_update",
  callback: (data: Record<string, unknown>) => void,
) {
  adminEmitter.on(event, callback);
  return () => adminEmitter.off(event, callback);
}
