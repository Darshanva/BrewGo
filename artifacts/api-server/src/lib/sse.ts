import { EventEmitter } from "node:events";

const orderEmitter = new EventEmitter();
orderEmitter.setMaxListeners(2000);

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
