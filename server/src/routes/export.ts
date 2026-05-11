import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema.js';
import ExcelJS from 'exceljs';
import { runSafetyCheck } from '../engine/gb/safety-check.js';

export const exportRouter = Router();

exportRouter.get('/project/:id/bom', (req: Request, res: Response) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any;
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  const rooms = db.prepare('SELECT * FROM rooms WHERE project_id = ?').all(req.params.id) as any[];
  const items: any[] = [];
  let grandTotal = 0;
  let filtersCount = 0;
  let cableTotalM = 0;
  let deviceCount = 0;

  for (const room of rooms) {
    const circuits = db.prepare(`
      SELECT c.*, f.model_name as filter_model, f.unit_price as filter_price, f.current_rating_a, f.phases
      FROM circuits c LEFT JOIN filters f ON c.filter_id = f.id
      WHERE c.room_id = ? ORDER BY c.id
    `).all(room.id) as any[];

    for (const circuit of circuits) {
      if (circuit.filter_model) {
        items.push({
          category: '滤波器', description: `${circuit.filter_model} ${circuit.voltage_type}`,
          spec: `${circuit.current_rating_a}A`,
          quantity: 1, unit: '台', unit_price: circuit.filter_price || 0,
          subtotal: circuit.filter_price || 0,
        });
        grandTotal += circuit.filter_price || 0;
        filtersCount++;
      }

      const segments = db.prepare(`
        SELECT s.*, cs.model_name as cable_model, cs.cross_section_mm2, cs.unit_price as cable_price
        FROM cable_segments s LEFT JOIN cable_specs cs ON s.cable_spec_id = cs.id
        WHERE s.circuit_id = ? ORDER BY s.id
      `).all(circuit.id) as any[];

      for (const seg of segments) {
        const totalLength = seg.length_m * seg.parallel_count;
        const subtotal = totalLength * (seg.cable_price || 0);
        if (seg.cable_model) {
          const typeLabel: Record<string, string> = { dragchain: '拖链', branch: '分支', parallel: '并联' };
          items.push({
            category: '电缆',
            description: `${typeLabel[seg.segment_type] || '主干'} ${seg.cable_model}`,
            spec: `${seg.cross_section_mm2}mm² × ${seg.parallel_count}根`,
            quantity: totalLength, unit: 'm', unit_price: seg.cable_price || 0,
            subtotal,
          });
          grandTotal += subtotal;
          cableTotalM += totalLength;
        }

        const devices = db.prepare('SELECT * FROM devices WHERE segment_id = ?').all(seg.id) as any[];
        for (const dev of devices) {
          const subtotal = dev.quantity * (dev.unit_price || 0);
          items.push({
            category: '附件', description: dev.device_type,
            spec: dev.model || `${dev.rating_v}V/${dev.rating_a}A`,
            quantity: dev.quantity, unit: '个', unit_price: dev.unit_price || 0,
            subtotal,
          });
          grandTotal += subtotal;
          deviceCount += dev.quantity;
        }
      }
    }
  }

  res.json({
    items,
    grand_total: grandTotal,
    summary: { filters_count: filtersCount, cable_total_m: cableTotalM, device_count: deviceCount },
  });
});

exportRouter.get('/project/:id/check', (req: Request, res: Response) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any;
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  const check = runSafetyCheck(Number(req.params.id));
  res.json({ project_name: project.name, ...check });
});

exportRouter.get('/project/:id/excel', async (req: Request, res: Response) => {
  try {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any;
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  const rooms = db.prepare('SELECT * FROM rooms WHERE project_id = ?').all(req.params.id) as any[];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PDC Calculator';
  workbook.created = new Date();

  // --- Sheet 1: 项目概览 ---
  const ws1 = workbook.addWorksheet('项目概览');
  ws1.columns = [
    { header: '项目名称', key: 'name', width: 30 },
    { header: '描述', key: 'desc', width: 40 },
    { header: '创建时间', key: 'created', width: 20 },
    { header: '更新时间', key: 'updated', width: 20 },
  ];
  ws1.addRow({ name: project.name, desc: project.description, created: project.created_at, updated: project.updated_at });

  // --- Sheet 2: BOM ---
  const ws2 = workbook.addWorksheet('配电物料清单');
  ws2.columns = [
    { header: '房间', key: 'room', width: 12 },
    { header: '线路', key: 'circuit', width: 16 },
    { header: '用途', key: 'purpose', width: 12 },
    { header: '滤波器型号', key: 'filter', width: 30 },
    { header: '物料类别', key: 'category', width: 12 },
    { header: '物料描述', key: 'description', width: 40 },
    { header: '规格', key: 'spec', width: 20 },
    { header: '数量', key: 'qty', width: 10 },
    { header: '单位', key: 'unit', width: 8 },
    { header: '单价', key: 'price', width: 12 },
    { header: '小计', key: 'subtotal', width: 14 },
  ];

  let grandTotal = 0;
  for (const room of rooms) {
    const circuits = db.prepare(`
      SELECT c.*, f.model_name as filter_model, f.unit_price as filter_price, f.current_rating_a
      FROM circuits c LEFT JOIN filters f ON c.filter_id = f.id
      WHERE c.room_id = ? ORDER BY c.id
    `).all(room.id) as any[];

    for (const circuit of circuits) {
      // Filter row
      if (circuit.filter_model) {
        ws2.addRow({
          room: room.room_type, circuit: circuit.name, purpose: circuit.purpose,
          filter: circuit.filter_model, category: '滤波器',
          description: `${circuit.filter_model} ${circuit.voltage_type}`,
          spec: `${circuit.current_rating_a}A`,
          qty: 1, unit: '台', price: circuit.filter_price,
          subtotal: circuit.filter_price,
        });
        grandTotal += circuit.filter_price || 0;
      }

      // Cable segments
      const segments = db.prepare(`
        SELECT s.*, cs.model_name as cable_model, cs.cross_section_mm2, cs.unit_price as cable_price
        FROM cable_segments s LEFT JOIN cable_specs cs ON s.cable_spec_id = cs.id
        WHERE s.circuit_id = ? ORDER BY s.id
      `).all(circuit.id) as any[];

      for (const seg of segments) {
        const totalLength = seg.length_m * seg.parallel_count;
        const subtotal = totalLength * (seg.cable_price || 0);
        if (seg.cable_model) {
          ws2.addRow({
            room: room.room_type, circuit: circuit.name,
            filter: '', category: '电缆',
            description: `${seg.segment_type === 'dragchain' ? '拖链' : seg.segment_type === 'branch' ? '分支' : seg.segment_type === 'parallel' ? '并联' : '主干'} ${seg.cable_model}`,
            spec: `${seg.cross_section_mm2}mm² × ${seg.parallel_count}根`,
            qty: totalLength, unit: 'm', price: seg.cable_price,
            subtotal,
          });
          grandTotal += subtotal;
        }

        // Devices on this segment
        const devices = db.prepare('SELECT * FROM devices WHERE segment_id = ?').all(seg.id) as any[];
        for (const dev of devices) {
          const subtotal = dev.quantity * (dev.unit_price || 0);
          ws2.addRow({
            room: room.room_type, circuit: circuit.name,
            filter: '', category: '附件',
            description: dev.device_type,
            spec: dev.model || `${dev.rating_v}V/${dev.rating_a}A`,
            qty: dev.quantity, unit: '个', price: dev.unit_price,
            subtotal,
          });
          grandTotal += subtotal;
        }
      }
    }
  }

  // Total row
  ws2.addRow({});
  ws2.addRow({ category: '合计', subtotal: grandTotal });
  ws2.lastRow!.getCell(11).font = { bold: true };

  // --- Sheet 3: GB 安全校验报告 ---
  const ws3 = workbook.addWorksheet('GB安全校验');
  ws3.columns = [
    { header: '检查项', key: 'check', width: 20 },
    { header: '标准', key: 'standard', width: 20 },
    { header: '线路', key: 'circuit', width: 16 },
    { header: '结果', key: 'result', width: 10 },
    { header: '说明', key: 'note', width: 50 },
  ];

  // Run GB checks for each circuit
  for (const room of rooms) {
    const circuits = db.prepare('SELECT c.*, f.model_name as filter_model, f.current_rating_a FROM circuits c LEFT JOIN filters f ON c.filter_id = f.id WHERE c.room_id = ?').all(room.id) as any[];
    for (const circuit of circuits) {
      const segments = db.prepare(`SELECT s.*, cs.max_current_a, cs.cross_section_mm2 FROM cable_segments s LEFT JOIN cable_specs cs ON s.cable_spec_id = cs.id WHERE s.circuit_id = ?`).all(circuit.id) as any[];
      for (const seg of segments) {
        if (seg.max_current_a && circuit.current_rating_a) {
          const pass = seg.max_current_a >= circuit.current_rating_a * 1.25;
          ws3.addRow({
            check: '载流量校验', standard: 'GB/T 16895',
            circuit: `${room.room_type}/${circuit.name}`,
            result: pass ? '✓ 通过' : '✗ 不通过',
            note: pass
              ? `电缆载流量${seg.max_current_a}A ≥ 回路电流${circuit.current_rating_a}A×1.25`
              : `电缆载流量${seg.max_current_a}A < 回路电流${circuit.current_rating_a}A×1.25，建议增大截面`,
          });
        }
        if (seg.cross_section_mm2) {
          const minSpec = circuit.voltage_type?.includes('三相') ? 2.5 : 1.5;
          const pass = seg.cross_section_mm2 >= minSpec;
          ws3.addRow({
            check: '最小截面校验', standard: 'GB 50054',
            circuit: `${room.room_type}/${circuit.name}`,
            result: pass ? '✓ 通过' : '✗ 不通过',
            note: pass ? `截面${seg.cross_section_mm2}mm² ≥ 最小值${minSpec}mm²` : `截面${seg.cross_section_mm2}mm² < 最小值${minSpec}mm²`,
          });
        }
      }
    }
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const filename = encodeURIComponent(`${project.name}_BOM.xlsx`);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
  } catch (e: any) {
    console.error('Excel export error:', e);
    res.status(500).json({ error: e.message });
  }
});
