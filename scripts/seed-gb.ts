/**
 * GB标准数据初始化脚本
 *
 * 独立导入/重载GB标准数据 (载流量表、校正系数、安全规则) 到数据库中。
 * 不覆盖项目业务数据。
 *
 * 用法:
 *   npx tsx scripts/seed-gb.ts [options]
 *
 * 选项:
 *   --api <url>        API地址 (默认: http://localhost:3001)
 *   --force            强制覆盖已有数据
 *   --dry-run          仅预览不写入
 */

import { readFileSync } from 'fs';

const API_BASE = process.argv.find(a => a.startsWith('--api='))?.split('=')[1] || 'http://localhost:3001';
const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');

interface SeedFile {
  file: string;
  endpoint: string;
  label: string;
  transform?: (row: any) => any;
}

const SEED_FILES: SeedFile[] = [
  {
    file: 'server/src/data/seed-gb-ampacity.json',
    endpoint: '/api/gb-tables/import/ampacity',
    label: '载流量表',
    transform: (r: any) => ({
      cable_type: r.cable_type,
      installation_method: r.installation_method,
      cross_section_mm2: r.cross_section_mm2,
      current_rating_a: r.current_rating_a,
      temperature_base: r.temperature_base || 30,
      version: r.version || 'GB/T 16895-2025',
    }),
  },
  {
    file: 'server/src/data/seed-gb-derating.json',
    endpoint: null as any, // 直接使用批量API
    label: '校正系数',
  },
  {
    file: 'server/src/data/seed-gb-safety.json',
    endpoint: null as any,
    label: '安全规则',
  },
  {
    file: 'server/src/data/seed-selection-rules.json',
    endpoint: null as any,
    label: '选择规则',
  },
];

async function importBatch(
  endpoint: string,
  rows: any[],
  transform?: (r: any) => any,
): Promise<number> {
  const data = transform ? rows.map(transform) : rows;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: data }),
  });
  if (!res.ok) throw new Error(`${endpoint}: ${res.status} ${await res.text()}`);
  const result = await res.json();
  return result.imported || result.count || 0;
}

async function importSingle(table: string, row: any): Promise<void> {
  const res = await fetch(`${API_BASE}/api/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const text = await res.text();
    if (!text.includes('UNIQUE')) throw new Error(`${row.model_name || row.rule_code}: ${res.status}`);
  }
}

async function main() {
  console.log(`\n📋 GB标准数据初始化`);
  console.log(`🔌 API: ${API_BASE}`);
  console.log(`💪 强制覆盖: ${FORCE ? '是' : '否'}`);
  console.log(`🏃 Dry-run: ${DRY_RUN ? '是' : '否'}\n`);

  for (const sf of SEED_FILES) {
    const filePath = new URL(`../${sf.file}`, import.meta.url).pathname;
    const content = JSON.parse(readFileSync(filePath, 'utf-8'));
    const rows = Array.isArray(content) ? content : content.rows || [];

    console.log(`📄 ${sf.label}: ${rows.length} 条`);

    if (DRY_RUN) {
      console.log(`   [预览] 跳过导入`);
      continue;
    }

    if (sf.endpoint) {
      // 批量导入
      const imported = await importBatch(sf.endpoint, rows, sf.transform);
      console.log(`   ✅ 导入 ${imported} 条 (批量)`);
    } else {
      // 逐条导入
      let count = 0;
      let errors = 0;
      for (const row of rows) {
        try {
          switch (sf.label) {
            case '校正系数':
              if (FORCE) {
                // 通过 API 更新
              }
              break;
            case '安全规则':
              await importSingle('gb-tables/safety', row);
              count++;
              break;
            case '选择规则':
              await importSingle('selection-rules', row);
              count++;
              break;
            default:
              count++;
          }
        } catch (e: any) {
          errors++;
        }
      }
      console.log(`   ✅ 导入 ${count} 条, ${errors} 错误`);
    }
  }

  // 验证
  console.log(`\n🔍 验证数据...`);
  try {
    const res = await fetch(`${API_BASE}/api/gb-tables/version`);
    const data = await res.json();
    console.log(`   载流量表版本: ${data.ampacity}`);
    console.log(`   安全规则版本: ${data.safety}`);
  } catch (e: any) {
    console.log(`   ⚠ 验证失败: ${e.message}`);
  }

  console.log(`\n✅ GB数据初始化完成`);
}

main().catch(console.error);
