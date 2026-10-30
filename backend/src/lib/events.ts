import { EventEmitter } from "events";

export interface ShipmentStatusChangedEvent {
  event: "shipment_status_changed";
  shipmentId: string;
  status: string;
}

export const appEvents = new EventEmitter();