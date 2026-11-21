export type Role = "student" | "registrar" | "custodian" | "admin";
export type DocStatus = "requested" | "processing" | "ready" | "claimed" | "cancelled";
export type UniformStatus = "ordered" | "ready" | "claimed" | "cancelled";
export type TailoringStatus = "queued" | "sewing" | "finished";
export type Category = "PE" | "General" | "Nursing";

export interface User {
  id: number;
  username: string;
  role: Role;
  full_name: string;
  email: string | null;
  avatar: string | null;
  student_no: string | null;
}

export interface Student {
  student_no: string;
  full_name: string;
  program: string | null;
  year_level: string | null;
  section: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentWithCounts extends Student {
  ready_documents: number;
  ready_uniforms: number;
  pending_documents: number;
  pending_uniforms: number;
  has_account: number;
  avatar: string | null;
}

export interface DocumentRecord {
  id: number;
  student_no: string;
  doc_type: string;
  status: DocStatus;
  date_requested: string | null;
  date_ready: string | null;
  remarks: string | null;
  encoded_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  full_name?: string;
  program?: string | null;
}

export interface UniformOrder {
  id: number;
  student_no: string;
  category: Category;
  item: PeItem | null;
  size: string | null;
  status: UniformStatus;
  tailoring_status: TailoringStatus | null;
  date_ordered: string;
  time_ordered: string | null;
  remarks: string | null;
  inventory_deducted: number;
  encoded_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  full_name?: string;
  program?: string | null;
}

export type PeItem = "Pants" | "Shirt";

export interface InventoryItem {
  item: PeItem;
  size: string;
  quantity: number;
}

export interface InventoryGroup {
  item: PeItem;
  size_range: string;
  sizes: InventoryItem[];
  total: number;
}

export interface SettingsMap {
  [key: string]: string | undefined;
}

export interface ActivityEntry {
  id: number;
  actor: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: string | null;
  created_at: string;
}

export interface PeStockSize {
  item: PeItem;
  size: string;
  quantity: number;
  available: boolean;
  low: boolean;
}

export interface PeStockGroup {
  item: PeItem;
  size_range: string;
  total_quantity: number;
  available_count: number;
  sizes: PeStockSize[];
}

export interface OverviewResponse {
  student: Student;
  documents: DocumentRecord[];
  uniforms: UniformOrder[];
  account: { has_account: number; username?: string; avatar?: string | null; created_at?: string };
  summary: {
    ready_documents: number;
    ready_uniforms: number;
    ready_total: number;
    pending_documents: number;
    pending_uniforms: number;
    tailoring: { id: number; category: Category; tailoring_status: TailoringStatus | null }[];
  };
  pe_stock: PeStockGroup[];
  settings: SettingsMap;
}

export interface DashboardResponse {
  totals: {
    documents_ready: number;
    uniforms_ready: number;
    documents_pending: number;
    uniforms_pending: number;
    tailoring_active: number;
    claimed_today: number;
    students: number;
    accounts: number;
  };
  documents: Record<string, number>;
  uniforms: Record<string, number>;
  tailoring: Record<string, number>;
  inventory: InventoryGroup[];
  low_stock: InventoryItem[];
  readyDocuments: DocumentRecord[];
  readyUniforms: UniformOrder[];
  recentActivity: ActivityEntry[];
  settings: SettingsMap;
}
