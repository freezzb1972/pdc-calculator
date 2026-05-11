export interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  rooms?: Room[];
}

export interface Room {
  id: number;
  project_id: number;
  room_type: string;
  length_m: number;
  width_m: number;
  height_m: number;
  light_model: string;
  light_count: number;
  light_circuits: number;
}

export interface Filter {
  id: number;
  model_name: string;
  manufacturer: string;
  voltage_rating_v: number;
  current_rating_a: number;
  phases: string;
  wire_count: number;
  dimensions: string;
  unit_price: number;
  category: string;
  notes: string;
}

export interface CableSpec {
  id: number;
  model_name: string;
  conductor_material: string;
  insulation: string;
  cross_section_mm2: number;
  core_count: number;
  max_current_a: number;
  unit_price: number;
}

export interface Circuit {
  id: number;
  room_id: number;
  filter_id: number;
  name: string;
  purpose: string;
  voltage_type: string;
  load_current_a: number;
  notes: string;
  filter_model?: string;
  phases?: string;
  current_rating_a?: number;
  segments?: CableSegment[];
}

export interface CableSegment {
  id: number;
  circuit_id: number;
  parent_segment_id: number | null;
  segment_type: string;
  cable_spec_id: number;
  length_m: number;
  parallel_count: number;
  from_location: string;
  to_location: string;
  cable_model?: string;
  cross_section_mm2?: number;
  max_current_a?: number;
  cable_price?: number;
  devices?: Device[];
}

export interface Device {
  id: number;
  segment_id: number;
  device_type: string;
  model: string;
  rating_v: number;
  rating_a: number;
  quantity: number;
  unit_price: number;
}

export interface BomItem {
  category: string;
  description: string;
  spec: string;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
}

export interface BomResult {
  items: BomItem[];
  grand_total: number;
  summary: { filters_count: number; cable_total_m: number; device_count: number };
}

export interface GBCheckResult {
  check_name: string;
  standard: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  detail: string;
}

export interface GbTables {
  ampacity: any[];
  derating: any[];
  safety: any[];
  versions: any;
}
