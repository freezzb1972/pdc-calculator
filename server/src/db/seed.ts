import { getDb } from './schema.js';
import filters from '../data/seed-filters.json' with { type: 'json' };
import cables from '../data/seed-cables.json' with { type: 'json' };
import gbAmpacity from '../data/seed-gb-ampacity.json' with { type: 'json' };
import gbDerating from '../data/seed-gb-derating.json' with { type: 'json' };
import gbSafety from '../data/seed-gb-safety.json' with { type: 'json' };
import selectionRules from '../data/seed-selection-rules.json' with { type: 'json' };

export function seedDatabase() {
  const db = getDb();
  const seeded: string[] = [];

  // Filters
  const filterCount = (db.prepare('SELECT COUNT(*) as cnt FROM filters').get() as any).cnt;
  if (filterCount === 0) {
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO filters (model_name, manufacturer, voltage_rating_v, current_rating_a, phases, wire_count, unit_price, category)
       VALUES (@model_name, @manufacturer, @voltage_rating_v, @current_rating_a, @phases, @wire_count, @unit_price, @category)`
    );
    db.transaction(() => { for (const f of filters) stmt.run(f as any); })();
    seeded.push(`${filters.length} filters`);
  }

  // Cable specs
  const cableCount = (db.prepare('SELECT COUNT(*) as cnt FROM cable_specs').get() as any).cnt;
  if (cableCount === 0) {
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO cable_specs (model_name, conductor_material, insulation, cross_section_mm2, core_count, max_current_a, unit_price)
       VALUES (@model_name, @conductor_material, @insulation, @cross_section_mm2, @core_count, @max_current_a, @unit_price)`
    );
    db.transaction(() => { for (const c of cables) stmt.run(c as any); })();
    seeded.push(`${cables.length} cable specs`);
  }

  // GB Ampacity table
  const ampCount = (db.prepare('SELECT COUNT(*) as cnt FROM gb_ampacity').get() as any).cnt;
  if (ampCount === 0) {
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO gb_ampacity (cable_type, installation_method, cross_section_mm2, current_rating_a, temperature_base, version)
       VALUES (@cable_type, @installation_method, @cross_section_mm2, @current_rating_a, @temperature_base, @version)`
    );
    db.transaction(() => { for (const r of gbAmpacity) stmt.run(r as any); })();
    seeded.push(`${(gbAmpacity as any[]).length} gb_ampacity rows`);
  }

  // GB Derating factors
  const derCount = (db.prepare('SELECT COUNT(*) as cnt FROM gb_derating').get() as any).cnt;
  if (derCount === 0) {
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO gb_derating (factor_type, condition_desc, factor_value, version)
       VALUES (@factor_type, @condition_desc, @factor_value, @version)`
    );
    db.transaction(() => { for (const r of gbDerating) stmt.run(r as any); })();
    seeded.push(`${(gbDerating as any[]).length} gb_derating rows`);
  }

  // GB Safety rules
  const safCount = (db.prepare('SELECT COUNT(*) as cnt FROM gb_safety_rules').get() as any).cnt;
  if (safCount === 0) {
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO gb_safety_rules (rule_code, rule_name, description, check_formula, min_value, max_value, unit, severity, version)
       VALUES (@rule_code, @rule_name, @description, @check_formula, @min_value, @max_value, @unit, @severity, @version)`
    );
    db.transaction(() => { for (const r of gbSafety) stmt.run(r as any); })();
    seeded.push(`${(gbSafety as any[]).length} gb_safety_rules rows`);
  }

  // Selection rules
  const selCount = (db.prepare('SELECT COUNT(*) as cnt FROM selection_rules').get() as any).cnt;
  if (selCount === 0) {
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO selection_rules (filter_current_min, filter_current_max, phases, min_cross_section_mm2, recommended_cable_id, connector_type, notes)
       VALUES (@filter_current_min, @filter_current_max, @phases, @min_cross_section_mm2, @recommended_cable_id, @connector_type, @notes)`
    );
    db.transaction(() => { for (const r of selectionRules) stmt.run(r as any); })();
    seeded.push(`${(selectionRules as any[]).length} selection_rules rows`);
  }

  if (seeded.length > 0) {
    console.log('Seeded: ' + seeded.join(', '));
  }
}
