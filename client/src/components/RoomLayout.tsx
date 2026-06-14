import { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, Button, Space, Tag, message } from 'antd';
import { BorderOutlined } from '@ant-design/icons';
import { useAppTranslation } from '../i18n/useAppTranslation';

interface DeviceNode {
  id: number;
  device_type: string;
  model: string;
  pos_x: number;
  pos_y: number;
  segment_id: number;
}

interface SegRoute {
  id: number;
  segment_type: string;
  cable_model: string | null;
  cross_section_mm2: number | null;
  from_x: number | null;
  from_y: number | null;
  to_x: number | null;
  to_y: number | null;
  length_m: number;
  estimated_length: number | null;
  devices: DeviceNode[];
  circuit_name: string;
  filter_model: string | null;
}

interface RoomLayoutProps {
  visible: boolean;
  onClose: () => void;
  room: { id: number; room_type: string; length_m: number; width_m: number; height_m: number };
  routes: SegRoute[];
  onDeviceMove: (deviceId: number, posX: number, posY: number) => Promise<void>;
  onRouteChange: (segmentId: number, fromX: number, fromY: number, toX: number, toY: number, lengthM: number) => Promise<void>;
}

// Data lookup keys - these use Chinese values from the DB, not UI text
const DEVICE_COLORS: Record<string, string> = {
  照明: '#faad14',
  天线塔: '#1677ff',
  摄像头: '#13c2c2',
  转台: '#52c41a',
  插座: '#fa8c16',
  功放: '#ff4d4f',
  接收机: '#722ed1',
  滤波器: '#eb2f96',
};

const DEVICE_ICONS: Record<string, string> = {
  照明: '💡',
  天线塔: '📡',
  摄像头: '📷',
  转台: '⚙',
  插座: '🔌',
  功放: '🔊',
  接收机: '📻',
};

function getDeviceColor(type: string): string {
  return DEVICE_COLORS[type] || '#8c8c8c';
}

function getDeviceIcon(type: string): string {
  return DEVICE_ICONS[type] || '📦';
}

function manhattanPath(fx: number, fy: number, tx: number, ty: number, offset: number = 0.3): string {
  // Route: go vertically first, then horizontally (L-shaped), with a small offset from origin
  const mx = fx;
  const my = ty;
  return `M ${fx} ${fy} L ${fx} ${my} L ${tx} ${ty}`;
}

// NOTE: Keep in sync with server/src/engine/calculator.ts:estimateCableLength()
function estimateLength(
  roomLength: number, roomWidth: number, roomHeight: number,
  fromX: number, fromY: number, toX: number, toY: number,
  viaCeiling: boolean = true, heightOffset: number = 2.5
): number {
  const horizontal = Math.abs(fromX - toX) + Math.abs(fromY - toY);
  const vertical = viaCeiling ? (roomHeight - heightOffset) * 2 : 0;
  const extra = 2;
  return Math.round((horizontal + vertical + extra) * 10) / 10;
}

export default function RoomLayout({
  visible, onClose, room,
  routes, onDeviceMove, onRouteChange,
}: RoomLayoutProps) {
  const { t } = useAppTranslation('roomlayout');
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ deviceId: number; segId: number; origX: number; origY: number } | null>(null);
  const [scale, setScale] = useState(40);
  const [selectedDevice, setSelectedDevice] = useState<DeviceNode | null>(null);
  const [draftPos, setDraftPos] = useState<{ x: number; y: number } | null>(null);
  const autoLayoutDone = useRef(false);

  const pad = 1.5;
  const viewW = room.length_m + pad * 2;
  const viewH = room.width_m + pad * 2;

  const updateScale = useCallback(() => {
    if (!svgRef.current) return;
    const parent = svgRef.current.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    const sx = (w - 40) / room.length_m;
    const sy = (h - 40) / room.width_m;
    setScale(Math.min(sx, sy, 60));
  }, [room.length_m, room.width_m]);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  // Auto-assign positions for uninitialized devices (pos 0,0) — runs once per open
  useEffect(() => {
    if (!visible) {
      autoLayoutDone.current = false;
      return;
    }
    if (autoLayoutDone.current) return;
    let hasUnplaced = false;
    for (const route of routes) {
      for (const dev of route.devices) {
        if (dev.pos_x === 0 && dev.pos_y === 0) {
          hasUnplaced = true;
          break;
        }
      }
      if (hasUnplaced) break;
    }
    if (!hasUnplaced) return;

    // Collect all unplaced devices and assign positions in one pass
    const updates: Promise<void>[] = [];
    for (const route of routes) {
      for (const dev of route.devices) {
        if (dev.pos_x === 0 && dev.pos_y === 0) {
          const idx = routes.indexOf(route) * 100 + route.devices.indexOf(dev);
          const nx = 1.5 + (idx % Math.max(1, Math.floor(room.length_m - 1)));
          const ny = 1.5 + (Math.floor(idx / Math.max(1, Math.floor(room.length_m - 1)))) * 1.2;
          if (ny < room.width_m - 0.5) {
            dev.pos_x = Math.round(nx * 2) / 2;
            dev.pos_y = Math.round(ny * 2) / 2;
            updates.push(onDeviceMove(dev.id, dev.pos_x, dev.pos_y));
          }
        }
      }
    }
    autoLayoutDone.current = true;
  }, [visible, routes, room]);

  const svgX = (x: number) => pad + x;
  const svgY = (y: number) => pad + (room.width_m - y); // flip Y so origin is bottom-left

  const handleMouseDown = (dev: DeviceNode, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedDevice(dev);
    setDragging({ deviceId: dev.id, segId: dev.segment_id, origX: dev.pos_x, origY: dev.pos_y });
    setDraftPos({ x: dev.pos_x, y: dev.pos_y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = (room.length_m + pad * 2) / rect.width;
    const scaleY = (room.width_m + pad * 2) / rect.height;
    const mx = (e.clientX - rect.left) * scaleX - pad;
    const my = room.width_m - ((e.clientY - rect.top) * scaleY - pad);
    // Snap to 0.5m grid
    const sx = Math.round(Math.max(0.5, Math.min(room.length_m - 0.5, mx)) * 2) / 2;
    const sy = Math.round(Math.max(0.5, Math.min(room.width_m - 0.5, my)) * 2) / 2;
    setDraftPos({ x: sx, y: sy });
  };

  const handleMouseUp = async () => {
    if (!dragging || !draftPos) return;
    const { deviceId, segId, origX, origY } = dragging;
    if (draftPos.x !== origX || draftPos.y !== origY) {
      await onDeviceMove(deviceId, draftPos.x, draftPos.y);
      // Update all routes that connect to devices on this segment
      for (const route of routes) {
        if (route.id === segId) {
          const len = estimateLength(
            room.length_m, room.width_m, room.height_m,
            route.from_x ?? 1, route.from_y ?? 1,
            draftPos.x, draftPos.y,
            true, 2.5
          );
          await onRouteChange(route.id, route.from_x ?? 1, route.from_y ?? 1, draftPos.x, draftPos.y, len);
          break;
        }
      }
    }
    setDragging(null);
    setDraftPos(null);
  };

  // Build a lookup for device type display names via i18n
  const deviceTypeLabels: Record<string, string> = {
    '照明': t('deviceTypes.照明'),
    '天线塔': t('deviceTypes.天线塔'),
    '摄像头': t('deviceTypes.摄像头'),
    '转台': t('deviceTypes.转台'),
    '插座': t('deviceTypes.插座'),
    '功放': t('deviceTypes.功放'),
    '接收机': t('deviceTypes.接收机'),
    '滤波器': t('deviceTypes.滤波器'),
  };

  // Collect all devices with their segment info
  const allDevices: (DeviceNode & { segIndex: number })[] = [];
  for (let i = 0; i < routes.length; i++) {
    for (const dev of routes[i].devices) {
      allDevices.push({ ...dev, segIndex: i });
    }
  }

  const canvasW = room.length_m + pad * 2;
  const canvasH = room.width_m + pad * 2;

  return (
    <Modal
      title={`${room.room_type} ${t('layoutEdit')} (${room.length_m}×${room.width_m}×${room.height_m}m)`}
      open={visible}
      onCancel={onClose}
      width={960}
      footer={null}
      destroyOnClose
    >
      <div style={{ display: 'flex', gap: 16, height: 560 }}>
        {/* SVG Canvas */}
        <div style={{ flex: 1, height: '100%', border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${canvasW} ${canvasH}`}
            style={{ width: '100%', height: '100%', cursor: dragging ? 'grabbing' : 'default' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Room background */}
            <rect x={pad} y={pad} width={room.length_m} height={room.width_m} fill="#fafafa" stroke="#333" strokeWidth={0.08} />

            {/* Grid */}
            {Array.from({ length: Math.floor(room.length_m) + 1 }, (_, i) => (
              <line key={`gx${i}`} x1={svgX(i)} y1={svgY(0)} x2={svgX(i)} y2={svgY(room.width_m)}
                stroke="#e8e8e8" strokeWidth={0.03} strokeDasharray="0.1 0.1" />
            ))}
            {Array.from({ length: Math.floor(room.width_m) + 1 }, (_, i) => (
              <line key={`gy${i}`} x1={svgX(0)} y1={svgY(i)} x2={svgX(room.length_m)} y2={svgY(i)}
                stroke="#e8e8e8" strokeWidth={0.03} strokeDasharray="0.1 0.1" />
            ))}

            {/* Dimension labels */}
            <text x={svgX(room.length_m / 2)} y={svgY(-0.4)} textAnchor="middle" fontSize={0.3} fill="#888">{room.length_m}m</text>
            <text x={svgX(-0.6)} y={svgY(room.width_m / 2)} textAnchor="middle" fontSize={0.3} fill="#888" transform={`rotate(-90, ${svgX(-0.6)}, ${svgY(room.width_m / 2)})`}>{room.width_m}m</text>

            {/* Room type label */}
            <text x={svgX(room.length_m / 2)} y={svgY(room.width_m / 2)} textAnchor="middle" fontSize={0.5} fill="#ddd" style={{ userSelect: 'none' }}>
              {room.room_type}
            </text>

            {/* Cable paths */}
            {routes.map(route => {
              const fx = route.from_x ?? 1;
              const fy = route.from_y ?? 1;
              // Find device position for this segment (use first device or to_x/to_y)
              const firstDev = route.devices[0];
              const tx = firstDev ? (draftPos && dragging && dragging.segId === route.id && firstDev.id === dragging.deviceId ? draftPos.x : firstDev.pos_x) : (route.to_x ?? 5);
              const ty = firstDev ? (draftPos && dragging && dragging.segId === route.id && firstDev.id === dragging.deviceId ? draftPos.y : firstDev.pos_y) : (route.to_y ?? 3);

              const isDraggingThis = dragging && dragging.segId === route.id;
              const pathColor = isDraggingThis ? '#fa8c16' : '#1677ff';
              const pathWidth = isDraggingThis ? 0.08 : 0.05;

              return (
                <g key={`route${route.id}`}>
                  {/* Manhattan path */}
                  {fx !== tx || fy !== ty ? (
                    <>
                      {/* Vertical then horizontal */}
                      <path
                        d={`M ${svgX(fx)} ${svgY(fy)} L ${svgX(fx)} ${svgY(ty)} L ${svgX(tx)} ${svgY(ty)}`}
                        stroke={pathColor} strokeWidth={pathWidth} fill="none" strokeLinecap="round" strokeLinejoin="round"
                        strokeDasharray={isDraggingThis ? '0.1 0.1' : 'none'}
                      />
                      {/* Length label at midpoint */}
                      {(() => {
                        const len = estimateLength(room.length_m, room.width_m, room.height_m, fx, fy, tx, ty, true, 2.5);
                        return (
                          <text x={svgX((fx + tx) / 2)} y={svgY((fy + ty) / 2)} fontSize={0.25} fill={pathColor}
                            textAnchor="middle" dy={-0.2}>
                            {len}m
                          </text>
                        );
                      })()}
                    </>
                  ) : null}

                  {/* Source (filter) point */}
                  <circle cx={svgX(fx)} cy={svgY(fy)} r={0.2} fill="#eb2f96" stroke="#fff" strokeWidth={0.05} />
                  <text x={svgX(fx)} y={svgY(fy)} fontSize={0.2} fill="#fff" textAnchor="middle" dy={0.07}>{route.filter_model?.[0] || 'F'}</text>
                  <text x={svgX(fx)} y={svgY(fy + 0.5)} fontSize={0.2} fill="#eb2f96" textAnchor="middle">
                    {route.circuit_name}
                  </text>
                </g>
              );
            })}

            {/* Devices */}
            {allDevices.map(dev => {
              const isDraggingThis = dragging && dragging.deviceId === dev.id;
              const cx = isDraggingThis && draftPos ? svgX(draftPos.x) : svgX(dev.pos_x);
              const cy = isDraggingThis && draftPos ? svgY(draftPos.y) : svgY(dev.pos_y);
              const r = 0.3;
              const color = getDeviceColor(dev.device_type);

              return (
                <g key={`dev${dev.id}`}
                  onMouseDown={(e) => handleMouseDown(dev, e)}
                  style={{ cursor: 'move' }}
                >
                  {/* Connection dot */}
                  <circle cx={cx} cy={cy} r={r} fill={color} stroke="#fff" strokeWidth={0.06}
                    style={{ filter: isDraggingThis ? 'brightness(1.2)' : 'none' }} />
                  {/* Device icon */}
                  <text x={cx} y={cy} fontSize={0.3} textAnchor="middle" dy={0.1} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {getDeviceIcon(dev.device_type)}
                  </text>
                  {/* Label */}
                  <text x={cx} y={cy + r + 0.35} fontSize={0.22} textAnchor="middle" fill="#333" style={{ userSelect: 'none' }}>
                    {deviceTypeLabels[dev.device_type] || dev.device_type}{dev.model ? `(${dev.model})` : ''}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Info Panel */}
        <div style={{ width: 240, overflow: 'auto', borderLeft: '1px solid #f0f0f0', paddingLeft: 16 }}>
          <h4 style={{ margin: '0 0 12px' }}>{t('title')}</h4>
          {allDevices.length === 0 ? (
            <div style={{ color: '#999', fontSize: 13 }}>{t('noDevices')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allDevices.map(dev => {
                const route = routes.find(r => r.id === dev.segment_id);
                const isSelected = selectedDevice?.id === dev.id;
                return (
                  <div key={dev.id}
                    onClick={() => setSelectedDevice(dev)}
                    style={{
                      padding: '6px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 13,
                      background: isSelected ? '#e6f4ff' : '#fafafa',
                      border: isSelected ? '1px solid #1677ff' : '1px solid #f0f0f0',
                    }}
                  >
                    <Space>
                      <span style={{ fontSize: 14 }}>{getDeviceIcon(dev.device_type)}</span>
                      <strong>{deviceTypeLabels[dev.device_type] || dev.device_type}</strong>
                    </Space>
                    <div style={{ color: '#666', marginTop: 2, fontSize: 12 }}>
                      pos: ({dev.pos_x.toFixed(1)}, {dev.pos_y.toFixed(1)})
                    </div>
                    {route && (
                      <div style={{ color: '#888', fontSize: 11, marginTop: 1 }}>
                        {route.circuit_name} — {route.cable_model || '?'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 16, padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
            <h5 style={{ margin: '0 0 8px', color: '#666' }}>{t('tips.title')}</h5>
            <ul style={{ fontSize: 12, color: '#888', paddingLeft: 16, margin: 0, lineHeight: 1.8 }}>
              <li>{t('tips.drag')}</li>
              <li>{t('tips.snap')}</li>
              <li>{t('tips.autoCalc')}</li>
              <li>{t('tips.clickDetail')}</li>
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  );
}
