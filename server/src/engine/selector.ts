// 选型引擎：根据滤波器参数自动推荐线缆规格和附件类型
import { getDb } from '../db/schema.js';
import { LOAD_SAFETY_FACTOR, DRAG_CHAIN_STRAIGHT_MARGIN } from '../config.js';

interface FilterParams {
  current_rating_a: number;
  phases: string;
  voltage_rating_v: number;
}

interface CableRecommendation {
  cable_spec_id: number;
  model_name: string;
  cross_section_mm2: number;
  max_current_a: number;
  unit_price: number;
  connector_type: string;
  min_cross_section_mm2: number;
}

export function recommendCable(filter: FilterParams): CableRecommendation | null {
  const db = getDb();
  const loadCurrent = filter.current_rating_a * LOAD_SAFETY_FACTOR;

  // Find matching selection rule
  const rule = db.prepare(`
    SELECT * FROM selection_rules
    WHERE (filter_current_min IS NULL OR ? >= filter_current_min)
      AND (filter_current_max IS NULL OR ? <= filter_current_max)
      AND (phases = ? OR phases = '通用')
    ORDER BY filter_current_max ASC
    LIMIT 1
  `).get(loadCurrent, loadCurrent, filter.phases) as any;

  if (rule) {
    const cable = db.prepare('SELECT * FROM cable_specs WHERE id = ?').get(rule.recommended_cable_id) as any;
    if (cable) {
      return {
        cable_spec_id: cable.id,
        model_name: cable.model_name,
        cross_section_mm2: cable.cross_section_mm2,
        max_current_a: cable.max_current_a,
        unit_price: cable.unit_price,
        connector_type: rule.connector_type || '',
        min_cross_section_mm2: rule.min_cross_section_mm2 || cable.cross_section_mm2,
      };
    }
  }

  // Fallback: find cable by ampacity
  const cable = db.prepare(`
    SELECT * FROM cable_specs
    WHERE max_current_a >= ?
    ORDER BY max_current_a ASC
    LIMIT 1
  `).get(loadCurrent) as any;

  if (cable) {
    return {
      cable_spec_id: cable.id,
      model_name: cable.model_name,
      cross_section_mm2: cable.cross_section_mm2,
      max_current_a: cable.max_current_a,
      unit_price: cable.unit_price,
      connector_type: filter.phases === '三相' ? '工业连接器' : '插座',
      min_cross_section_mm2: cable.cross_section_mm2,
    };
  }

  return null;
}

export function suggestInitialSegments(filter: FilterParams, purpose: string): any[] {
  const cable = recommendCable(filter);
  if (!cable) return [];

  const segments = [{
    segment_type: purpose === '转台' ? 'dragchain' : 'trunk',
    cable_spec_id: cable.cable_spec_id,
    length_m: 20,
    parallel_count: purpose === '转台' ? 3 : 1,
    from_location: '滤波器输出端',
    to_location: purpose === '转台' ? '拖链入口' : '末端接线点',
  }];

  return segments;
}
