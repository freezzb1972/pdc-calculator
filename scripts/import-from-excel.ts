/**
 * Excel 导入脚本
 *
 * 从项目Excel文件导入滤波器、电缆、项目数据到PDC系统。
 *
 * 用法:
 *   npx tsx scripts/import-from-excel.ts <path-to-excel> [options]
 *
 * 选项:
 *   --type filters|cables|all    导入类型 (默认: all)
 *   --sheet <name>               指定工作表名
 *   --api <url>                  API地址 (默认: http://localhost:3001)
 *   --dry-run                   仅预览不导入
 *
 * Excel 期望的列标题映射:
 *   滤波器: 型号/名称, 厂商, 电压, 电流, 相数, 线数, 单价, 类别
 *   电缆:   型号/名称, 导体, 绝缘, 截面mm², 芯数, 载流量A, 单价
 */

import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const API_BASE = process.argv.find(a => a.startsWith('--api='))?.split('=')[1] || 'http://localhost:3001';
const IMPORT_TYPE = process.argv.find(a => a.startsWith('--type='))?.split('=')[1] || 'all';
const SHEET = process.argv.find(a => a.startsWith('--sheet='))?.split('=')[1];
const DRY_RUN = process.argv.includes('--dry-run');

const excelPath = process.argv[2];
if (!excelPath || excelPath.startsWith('--')) {
  console.error('用法: npx tsx import-from-excel.ts <path-to-excel> [--type=all|filters|cables] [--api=url] [--dry-run]');
  process.exit(1);
}

// ============================================================
// 列名模糊匹配
// ============================================================
function matchColumn(headers: string[], keywords: string[]): number {
  return headers.findIndex(h =>
    keywords.some(kw => h.toLowerCase().includes(kw.toLowerCase()))
  );
}

// ============================================================
// 导入滤波器
// ============================================================
async function importFilters(rows: Record<string, any>[], headers: string[]): Promise<{ imported: number; errors: string[] }> {
  const colModel = matchColumn(headers, ['型号', '名称', 'model']);
  const colMfr = matchColumn(headers, ['厂商', '厂家', '制造商', '品牌', 'manufacturer']);
  const colVolt = matchColumn(headers, ['电压', '额定电压', 'voltage']);
  const colCurr = matchColumn(headers, ['电流', '额定电流', 'current']);
  const colPhase = matchColumn(headers, ['相数', '相', 'phase']);
  const colWire = matchColumn(headers, ['线数', '线', 'wire', '芯数']);
  const colPrice = matchColumn(headers, ['单价', '价格', 'price']);
  const colCat = matchColumn(headers, ['类别', '类型', 'category', '用途']);

  if (colModel === -1) {
    return { imported: 0, errors: ['未找到型号/名列'] };
  }

  const filters: any[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const model_name = String(r[headers[colModel]] || '').trim();
    if (!model_name || model_name === '型号' || model_name === '-') continue;

    const filter: any = {
      model_name,
      manufacturer: colMfr >= 0 ? String(r[headers[colMfr]] || '坚力').trim() : '坚力',
      voltage_rating_v: colVolt >= 0 ? parseFloat(r[headers[colVolt]]) || null : null,
      current_rating_a: colCurr >= 0 ? parseFloat(r[headers[colCurr]]) || null : null,
      phases: colPhase >= 0 ? String(r[headers[colPhase]] || '三相').trim() : '三相',
      wire_count: colWire >= 0 ? parseInt(r[headers[colWire]]) || 4 : 4,
      unit_price: colPrice >= 0 ? parseFloat(r[headers[colPrice]]) || 0 : 0,
      category: colCat >= 0 ? String(r[headers[colCat]] || '暗室设备').trim() : '暗室设备',
    };
    filters.push(filter);
  }

  if (!DRY_RUN) {
    for (const f of filters) {
      try {
        const res = await fetch(`${API_BASE}/api/filters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(f),
        });
        if (!res.ok) {
          const text = await res.text();
          // 跳过已存在的
          if (!text.includes('UNIQUE')) errors.push(`${f.model_name}: ${res.status}`);
        }
      } catch (e: any) {
        errors.push(`${f.model_name}: ${e.message}`);
      }
    }
  }

  return { imported: filters.length, errors };
}

// ============================================================
// 导入电缆
// ============================================================
async function importCables(rows: Record<string, any>[], headers: string[]): Promise<{ imported: number; errors: string[] }> {
  const colModel = matchColumn(headers, ['型号', '名称', 'model']);
  const colCond = matchColumn(headers, ['导体', '导体材料', '材质', 'conductor']);
  const colIns = matchColumn(headers, ['绝缘', '绝缘材料', 'insulation']);
  const colCS = matchColumn(headers, ['截面', '截面积', 'cross', 'mm²']);
  const colCore = matchColumn(headers, ['芯数', 'core']);
  const colCurr = matchColumn(headers, ['载流量', '电流', 'current', 'max']);
  const colPrice = matchColumn(headers, ['单价', '价格', 'price']);

  if (colModel === -1) {
    return { imported: 0, errors: ['未找到型号/名列'] };
  }

  const cables: any[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const model_name = String(r[headers[colModel]] || '').trim();
    if (!model_name || model_name === '型号' || model_name === '-') continue;

    const cable: any = {
      model_name,
      conductor_material: colCond >= 0 ? String(r[headers[colCond]] || '铜芯').trim() : '铜芯',
      insulation: colIns >= 0 ? String(r[headers[colIns]] || 'PVC').trim() : 'PVC',
      cross_section_mm2: colCS >= 0 ? parseFloat(r[headers[colCS]]) || 0 : 0,
      core_count: colCore >= 0 ? parseInt(r[headers[colCore]]) || 3 : 3,
      max_current_a: colCurr >= 0 ? parseFloat(r[headers[colCurr]]) || 0 : 0,
      unit_price: colPrice >= 0 ? parseFloat(r[headers[colPrice]]) || 0 : 0,
    };
    cables.push(cable);
  }

  if (!DRY_RUN) {
    for (const c of cables) {
      try {
        const res = await fetch(`${API_BASE}/api/cables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(c),
        });
        if (!res.ok) {
          const text = await res.text();
          if (!text.includes('UNIQUE')) errors.push(`${c.model_name}: ${res.status}`);
        }
      } catch (e: any) {
        errors.push(`${c.model_name}: ${e.message}`);
      }
    }
  }

  return { imported: cables.length, errors };
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  console.log(`\n📂 文件: ${path.basename(excelPath)}`);
  console.log(`🔌 API: ${API_BASE}`);
  console.log(`📋 类型: ${IMPORT_TYPE}`);
  console.log(`🏃 Dry-run: ${DRY_RUN ? '是 (仅预览)' : '否'}\n`);

  if (!fs.existsSync(excelPath)) {
    console.error(`❌ 文件不存在: ${excelPath}`);
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);

  const sheets = SHEET
    ? [workbook.getWorksheet(SHEET)!].filter(Boolean)
    : workbook.worksheets;

  if (sheets.length === 0) {
    console.error(`❌ 未找到工作表${SHEET ? `: ${SHEET}` : ''}`);
    console.log(`   可用工作表: ${workbook.worksheets.map(s => `"${s.name}"`).join(', ')}`);
    process.exit(1);
  }

  for (const ws of sheets) {
    console.log(`\n═══ 工作表: ${ws.name} ═══`);
    const rows = ws.getRows(1, ws.rowCount)!;
    if (rows.length < 2) { console.log('  空表'); continue; }

    const headerRow = rows[0];
    const headers = headerRow.values as string[];
    // values returns 1-indexed array
    const headerValues: string[] = [];
    for (let i = 1; i < headers.length; i++) {
      if (headers[i] !== undefined) headerValues.push(String(headers[i]).trim());
    }
    console.log(`  列: ${headerValues.join(', ')}`);

    const dataRows: Record<string, any>[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const vals = row.values as any[];
      if (!vals || vals.length < 2) continue;
      const obj: Record<string, any> = {};
      for (let j = 0; j < headerValues.length; j++) {
        obj[headerValues[j]] = vals[j + 1];
      }
      dataRows.push(obj);
    }
    console.log(`  数据行: ${dataRows.length}`);

    if (IMPORT_TYPE === 'all' || IMPORT_TYPE === 'filters') {
      const result = await importFilters(dataRows, headerValues);
      console.log(`  滤波器: ${result.imported} 条${DRY_RUN ? ' (预览)' : ' 已导入'}${result.errors.length ? `, ${result.errors.length} 错误` : ''}`);
      if (result.errors.length > 0) {
        result.errors.slice(0, 5).forEach(e => console.log(`    ⚠ ${e}`));
      }
    }

    if (IMPORT_TYPE === 'all' || IMPORT_TYPE === 'cables') {
      const result = await importCables(dataRows, headerValues);
      console.log(`  电缆: ${result.imported} 条${DRY_RUN ? ' (预览)' : ' 已导入'}${result.errors.length ? `, ${result.errors.length} 错误` : ''}`);
    }
  }

  console.log('\n✅ 导入完成');
}

main().catch(console.error);
