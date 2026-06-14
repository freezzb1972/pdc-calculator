// 轻量级请求参数校验工具
// 避免引入 zod/joi 等重型依赖，用简单函数实现核心校验

type FieldRule = {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
  min?: number;
  max?: number;
  minLength?: number;
};

type ValidationResult = { valid: true } | { valid: false; errors: string[] };

export function validate(
  body: Record<string, any>,
  rules: Record<string, FieldRule>,
): ValidationResult {
  const errors: string[] = [];
  for (const [field, rule] of Object.entries(rules)) {
    const value = body[field];
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} 为必填字段`);
      continue;
    }
    if (value === undefined || value === null) continue;
    if (rule.type === 'number') {
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`${field} 必须是数字`);
        continue;
      }
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${field} 最小值为 ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${field} 最大值为 ${rule.max}`);
      }
    }
    if (rule.type === 'string' && rule.minLength !== undefined && String(value).length < rule.minLength) {
      errors.push(`${field} 最少 ${rule.minLength} 个字符`);
    }
  }
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}
