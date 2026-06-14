# PDC Calculator — EMC 暗室配电计算

## Tech Stack

- **Frontend**: React 18 + Ant Design 5 + Vite + TypeScript
- **Backend**: Express + better-sqlite3 + TypeScript (tsx watch dev)
- **Monorepo**: npm workspaces (client/ + server/ + scripts/)
- **Auth**: JWT + bcryptjs, 7-day expiry, admin/editor roles

## Data Model

```
Project → Room → Circuit → CableSegment → Device
```

- **rooms**: `project_id`, `room_type`, `length_m`, `width_m`, `height_m`, `light_model`, `light_count`, `light_circuits`
- **circuits**: `room_id`, `name`, `filter_id`, `cable_spec_id`, `load_rating_a`, `voltage_drop_mv`
- **cable_segments**: `circuit_id`, `cable_spec_id`, `from_x/y`, `to_x/y`, `length_m`, `cable_model`, `cross_section_mm2`
- **devices**: `segment_id`, `device_type`, `model`, `pos_x`, `pos_y`, `power_w`, `quantity`
- **Reference tables**: `filters`, `cable_specs`, `selection_rules`, `gb_ampacity`, `gb_derating`, `gb_safety_rules`, `prices`

## Dev Commands

```bash
# Start both (from project root)
npm run dev

# Or individually
npm -w server run dev    # http://localhost:3001
npm -w client run dev    # http://localhost:5173

# Database seeding
npm run seed             # populates filters, cables, GB tables
npm run import-excel     # import from Excel

# Build & production
npm run build
npm start                # serves client build + API on :3001

# Server test
npm -w server run test
```

## Key Files

| Path | Purpose |
|------|---------|
| `server/src/index.ts` | Express entry, routes mounting |
| `server/src/db/schema.ts` | SQLite schema init + DB connection |
| `server/src/engine/calculator.ts` | BOM generation, cable length estimation |
| `server/src/engine/selector.ts` | Cable recommendation logic |
| `server/src/engine/safety-check.ts` | GB compliance checks |
| `server/src/routes/projects.ts` | Project + room + layout endpoints |
| `server/src/routes/circuits.ts` | Circuit + segment + device endpoints |
| `client/src/pages/ProjectEditor.tsx` | Main project editor page |
| `client/src/components/RoomLayout.tsx` | SVG layout editor (Phase 1b) |
| `client/src/api/client.ts` | API client |

## Phase 1b — Visual Layout Editor

SVG-based 2D room layout for drag-and-drop device placement with auto cable length calculation. See `RoomLayout.tsx`.

**Open issues**:
- Adding new devices from the layout view (currently must add via circuit editor)
- Filter position customization (currently fixed at from_x/from_y)
- Cable path waypoint editing (currently L-shaped Manhattan only)
- Undo/redo for device drag operations

## DB Path

`server/data/pdc.db` — SQLite, WAL mode, foreign keys ON. Server creates it automatically on first start.

## Architecture Notes

- Cable length estimated via Manhattan distance + ceiling vertical offset: `estimateCableLength()` in `calculator.ts`
- Cable selection based on `selection_rules` table mapping filter current range to cable specs
- GB compliance compares selected cables against `gb_ampacity` / `gb_derating` tables
- Prices stored in `prices` table with history tracking, importable via Excel


## Skill & Agent Routing (智能路由)

项目同时加载三个来源的技能/代理/命令：gstack、everything-claude-code、官方插件。

### 路由决策表 (PDC Calculator 专用)

| 任务场景 | 优先调用 | 说明 |
|---------|---------|------|
| **React 前端开发** | everything frontend-patterns skill | 组件设计/状态管理 |
| **Express 后端开发** | everything backend-patterns skill | API 设计/数据库模式 |
| **代码审查** | everything code-reviewer agent + /code-review | 结构化 PR review |
| **Bug 修复/TypeScript 错误** | everything build-error-resolver agent + /build-fix | TS 编译错误诊断 |
| **重构清理** | everything refactor-cleaner agent + /refactor-clean | 安全重构 |
| **TDD 开发** | everything tdd-guide agent + /tdd + tdd-workflow skill | 测试驱动 |
| **安全审查** | everything security-reviewer agent + security-review skill | 代码级安全 |
| **E2E 测试** | everything e2e-runner agent + /e2e | Playwright 测试 |
| **验证变更** | everything verification-loop skill + /verify | 功能验证 |
| **项目规划** | everything planner agent + /plan | 任务分解 |
| **文档更新** | everything doc-updater agent + /update-docs | 同步文档 |
| **编码规范** | everything coding-standards skill | 代码风格 |
| **部署发布** | gstack ship + land-and-deploy | gstack 部署 |
| **上下文管理** | gstack context-save/restore + everything hooks | 手动+自动 |

### 后台自动化 (Hooks)
- SessionStart: 自动恢复上次会话上下文
- SessionEnd: 自动持久化会话状态
- PreCompact: 压缩前保存状态
- PostToolUse: 自动建议战略压缩时机
