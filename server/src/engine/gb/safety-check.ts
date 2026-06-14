// GB 安全校验引擎：对每条线路执行独立安全检查
import { getDb } from '../../db/schema.js';
import { LOAD_SAFETY_FACTOR, COPPER_CONDUCTIVITY } from '../../config.js';

export interface CheckResult {
  check_name: string;
  standard: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  detail: string;
}

export function runSafetyCheck(projectId: number): { results: CheckResult[]; summary: { pass: number; warn: number; fail: number } } {
  const db = getDb();
  const results: CheckResult[] = [];
  let passCount = 0, warnCount = 0, failCount = 0;

  const rooms = db.prepare('SELECT * FROM rooms WHERE project_id = ?').all(projectId) as any[];

  for (const room of rooms) {
    const circuits = db.prepare(`
      SELECT c.*, f.model_name as filter_model, f.voltage_rating_v, f.current_rating_a as filter_current, f.phases
      FROM circuits c LEFT JOIN filters f ON c.filter_id = f.id
      WHERE c.room_id = ?
    `).all(room.id) as any[];

    for (const circuit of circuits) {
      const circuitLabel = `${room.room_type}/${circuit.name}`;
      const loadCurrent = circuit.load_current_a || circuit.filter_current || 0;

      // Check 1: 电压等级匹配
      if (circuit.voltage_rating_v && circuit.voltage_type) {
        const systemV = parseInt(circuit.voltage_type.match(/\d+/)?.[0] || '220');
        if (circuit.voltage_rating_v >= systemV) {
          results.push({ check_name: '电压等级匹配', standard: 'GB 50052', status: 'pass', message: `滤波器额定电压${circuit.voltage_rating_v}V ≥ 系统电压${systemV}V`, detail: '' });
          passCount++;
        } else {
          results.push({ check_name: '电压等级匹配', standard: 'GB 50052', status: 'fail', message: `滤波器额定电压${circuit.voltage_rating_v}V < 系统电压${systemV}V`, detail: '' });
          failCount++;
        }
      }

      // Check cable segments
      const segments = db.prepare(`
        SELECT s.*, cs.max_current_a, cs.cross_section_mm2, cs.model_name
        FROM cable_segments s LEFT JOIN cable_specs cs ON s.cable_spec_id = cs.id
        WHERE s.circuit_id = ?
      `).all(circuit.id) as any[];

      for (const seg of segments) {
        // Check 2: 载流量校验 (Iz ≥ 1.25 × Ib)
        if (seg.max_current_a && loadCurrent > 0) {
          const required = loadCurrent * LOAD_SAFETY_FACTOR;
          if (seg.max_current_a >= required) {
            results.push({ check_name: '载流量校验', standard: 'GB/T 16895', status: 'pass', message: `电缆${seg.model_name}载流量${seg.max_current_a}A ≥ ${loadCurrent}A×${LOAD_SAFETY_FACTOR}=${required.toFixed(1)}A`, detail: `${circuitLabel}` });
            passCount++;
          } else {
            results.push({ check_name: '载流量校验', standard: 'GB/T 16895', status: 'fail', message: `电缆${seg.model_name}载流量${seg.max_current_a}A < ${loadCurrent}A×${LOAD_SAFETY_FACTOR}=${required.toFixed(1)}A，需增大截面`, detail: `${circuitLabel}` });
            failCount++;
          }
        }

        // Check 3: 最小截面校验 (GB 50054)
        if (seg.cross_section_mm2) {
          const minSpec = circuit.voltage_type?.includes('三相') || circuit.voltage_type?.includes('动力') ? 2.5 : 1.5;
          if (seg.cross_section_mm2 >= minSpec) {
            results.push({ check_name: '最小截面校验', standard: 'GB 50054', status: 'pass', message: `截面${seg.cross_section_mm2}mm² ≥ 最小${minSpec}mm²`, detail: `${circuitLabel}/${seg.model_name}` });
            passCount++;
          } else {
            results.push({ check_name: '最小截面校验', standard: 'GB 50054', status: 'fail', message: `截面${seg.cross_section_mm2}mm² < 最小${minSpec}mm²`, detail: `${circuitLabel}/${seg.model_name}` });
            failCount++;
          }
        }

        // Check 4: 电压降校验 (ΔU% ≤ 5%)
        if (seg.cross_section_mm2 && seg.length_m && loadCurrent > 0) {
          const isThreePhase = circuit.voltage_type?.includes('380') ?? true;
          const du = calcVoltageDrop(loadCurrent, seg.length_m, seg.cross_section_mm2, isThreePhase);
          const limit = circuit.purpose?.includes('照明') ? 3 : 5;
          if (du <= limit) {
            results.push({ check_name: '电压降校验', standard: 'GB 50052', status: 'pass', message: `ΔU=${du.toFixed(2)}% ≤ ${limit}%`, detail: `${circuitLabel}/${seg.model_name} ${seg.length_m}m` });
            passCount++;
          } else {
            results.push({ check_name: '电压降校验', standard: 'GB 50052', status: 'warn', message: `ΔU=${du.toFixed(2)}% > ${limit}%，建议增大截面或缩短距离`, detail: `${circuitLabel}/${seg.model_name} ${seg.length_m}m` });
            warnCount++;
          }
        }
      }
    }
  }

  return { results, summary: { pass: passCount, warn: warnCount, fail: failCount } };
}

// Calculate voltage drop ΔU%
export function calcVoltageDrop(
  current_A: number, length_m: number, cross_section_mm2: number,
  isThreePhase: boolean = true, cosPhi: number = 0.85
): number {
  const conductivity = COPPER_CONDUCTIVITY; // Copper conductivity at 70°C (m/Ω·mm²)
  const R = length_m / (conductivity * cross_section_mm2);
  const X = 0.08 * length_m / 1000; // Approximate reactance
  const I = current_A;
  if (isThreePhase) {
    return (Math.sqrt(3) * I * (R * cosPhi + X * Math.sin(Math.acos(cosPhi))) / 380) * 100;
  } else {
    return (2 * I * (R * cosPhi + X * Math.sin(Math.acos(cosPhi))) / 220) * 100;
  }
}
