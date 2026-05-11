// 计算引擎：根据线路配置生成 BOM 和成本
import { getDb } from '../db/schema.js';

interface BomItem {
  category: string;
  description: string;
  spec: string;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
}

interface BomResult {
  items: BomItem[];
  grand_total: number;
  summary: {
    filters_count: number;
    cable_total_m: number;
    device_count: number;
  };
}

export function calculateBom(projectId: number): BomResult {
  const db = getDb();
  const items: BomItem[] = [];
  let grandTotal = 0;
  let filtersCount = 0;
  let cableTotalM = 0;
  let deviceCount = 0;

  const rooms = db.prepare('SELECT * FROM rooms WHERE project_id = ?').all(projectId) as any[];

  for (const room of rooms) {
    const circuits = db.prepare(`
      SELECT c.*, f.model_name as filter_model, f.unit_price as filter_price, f.current_rating_a, f.phases
      FROM circuits c LEFT JOIN filters f ON c.filter_id = f.id
      WHERE c.room_id = ? ORDER BY c.id
    `).all(room.id) as any[];

    for (const circuit of circuits) {
      // Add filter as BOM item
      if (circuit.filter_model) {
        items.push({
          category: '滤波器',
          description: `${circuit.filter_model} ${circuit.voltage_type}`,
          spec: `${circuit.current_rating_a}A`,
          quantity: 1,
          unit: '台',
          unit_price: circuit.filter_price || 0,
          subtotal: circuit.filter_price || 0,
        });
        grandTotal += circuit.filter_price || 0;
        filtersCount++;
      }

      // Process cable segments
      const segments = db.prepare(`
        SELECT s.*, cs.model_name as cable_model, cs.cross_section_mm2, cs.unit_price as cable_price
        FROM cable_segments s LEFT JOIN cable_specs cs ON s.cable_spec_id = cs.id
        WHERE s.circuit_id = ? ORDER BY s.id
      `).all(circuit.id) as any[];

      for (const seg of segments) {
        if (!seg.cable_model) continue;
        const totalLength = seg.length_m * seg.parallel_count;
        const subtotal = totalLength * (seg.cable_price || 0);

        const typeLabel = seg.segment_type === 'dragchain' ? '拖链电缆'
          : seg.segment_type === 'branch' ? '分支电缆'
          : seg.segment_type === 'parallel' ? '并联电缆'
          : '主干电缆';

        items.push({
          category: '电缆',
          description: `${typeLabel} ${seg.cable_model}`,
          spec: `${seg.cross_section_mm2}mm² × ${seg.parallel_count}根 × ${seg.length_m}m`,
          quantity: totalLength,
          unit: 'm',
          unit_price: seg.cable_price || 0,
          subtotal,
        });
        grandTotal += subtotal;
        cableTotalM += totalLength;

        // Devices on this segment
        const devices = db.prepare('SELECT * FROM devices WHERE segment_id = ?').all(seg.id) as any[];
        for (const dev of devices) {
          const sub = dev.quantity * (dev.unit_price || 0);
          items.push({
            category: '附件',
            description: dev.device_type,
            spec: dev.model || `${dev.rating_v}V/${dev.rating_a}A`,
            quantity: dev.quantity,
            unit: '个',
            unit_price: dev.unit_price || 0,
            subtotal: sub,
          });
          grandTotal += sub;
          deviceCount += dev.quantity;
        }
      }
    }
  }

  return {
    items,
    grand_total: grandTotal,
    summary: { filters_count: filtersCount, cable_total_m: cableTotalM, device_count: deviceCount },
  };
}

// Estimate cable length from room dimensions and positions
export function estimateCableLength(
  roomLength: number, roomWidth: number, roomHeight: number,
  fromX: number, fromY: number, toX: number, toY: number,
  viaCeiling: boolean = true,
  heightOffset: number = 2.5
): number {
  // Simple Manhattan distance along walls/ceiling
  const horizontal = Math.abs(fromX - toX) + Math.abs(fromY - toY);
  const vertical = viaCeiling ? (roomHeight - heightOffset) * 2 : 0;
  const extra = 2; // Allowance for connections at both ends
  return Math.round((horizontal + vertical + extra) * 10) / 10;
}
