export type CustomerStatus = "Active" | "Inactive";
export type ShipmentStatus = "Created" | "InTransit" | "Delivered" | "Cancelled";

export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  customerId: string;
  origin: string;
  destination: string;
  status: ShipmentStatus;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; company: string };
}

export interface DashboardStats {
  totalCustomers: number;
  totalShipments: number;
  byStatus: Record<ShipmentStatus, number>;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}