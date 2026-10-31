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

export interface AnalyticsResult {
  summary: {
    rowCount: number;
    totalRevenue: number;
    averageRevenue: number;
    medianRevenue: number;
    topSalesperson: { name: string; revenue: number };
    topRegion: { name: string; revenue: number };
  };
  charts: {
    revenueByRegion: PlotlyFigure;
    topSalespeople: PlotlyFigure;
  };
  warnings: string[];
}

export interface PlotlyFigure {
  data: unknown[];
  layout?: Record<string, unknown>;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ChatResponse {
  conversationId: string;
  mode: "ai" | "mock";
  reply: ChatMessage;
}
