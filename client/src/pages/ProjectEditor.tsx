import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Form, Input, InputNumber, Select, Button, Space, Table, Modal, message,
  Tabs, Popconfirm, Tag, Descriptions, Typography, Empty,
} from 'antd';
import { PlusOutlined, DeleteOutlined, BarChartOutlined, SafetyOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import type { Project, Room, Circuit, CableSegment, Device } from '../types';
import ComplianceReport from '../components/ComplianceReport';
import DragChainCalc from '../components/DragChainCalc';
import RoomLayout from '../components/RoomLayout';

const { Title } = Typography;

/* ---------- Room Form ---------- */
function RoomForm({ visible, onClose, onSave, initial }: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initial?: Room | null;
}) {
  const [form] = Form.useForm();
  useEffect(() => {
    if (initial) form.setFieldsValue(initial);
    else form.resetFields();
  }, [initial, visible]);

  return (
    <Modal title={initial ? '编辑房间' : '新增房间'} open={visible} onOk={async () => {
      await onSave(await form.validateFields());
      onClose();
    }} onCancel={onClose} width={520}>
      <Form form={form} layout="vertical">
        <Form.Item name="room_type" label="房间类型" rules={[{ required: true }]}>
          <Select options={[
            { value: '暗室', label: '暗室' },
            { value: '控制室', label: '控制室' },
            { value: '功放室', label: '功放室' },
            { value: '传导室', label: '传导室' },
            { value: '负载室', label: '负载室' },
            { value: '屏蔽室', label: '屏蔽室' },
          ]} />
        </Form.Item>
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="length_m" label="长(m)" rules={[{ required: true }]}><InputNumber style={{ width: 140 }} step={0.1} /></Form.Item>
          <Form.Item name="width_m" label="宽(m)" rules={[{ required: true }]}><InputNumber style={{ width: 140 }} step={0.1} /></Form.Item>
          <Form.Item name="height_m" label="高(m)" rules={[{ required: true }]}><InputNumber style={{ width: 140 }} step={0.1} /></Form.Item>
        </Space>
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="light_model" label="照明型号"><Input style={{ width: 180 }} /></Form.Item>
          <Form.Item name="light_count" label="照明数量"><InputNumber style={{ width: 120 }} /></Form.Item>
          <Form.Item name="light_circuits" label="照明回路数"><InputNumber style={{ width: 120 }} /></Form.Item>
        </Space>
      </Form>
    </Modal>
  );
}

/* ---------- Circuit Form ---------- */
function CircuitForm({ visible, onClose, onSave, initial, roomId }: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initial?: Circuit | null;
  roomId: number;
}) {
  const [filters, setFilters] = useState<any[]>([]);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    api.getFilters().then(setFilters);
  }, []);

  useEffect(() => {
    if (initial) {
      form.setFieldsValue({
        filter_id: initial.filter_id,
        name: initial.name,
        purpose: initial.purpose,
        voltage_type: initial.voltage_type,
        load_current_a: initial.load_current_a,
        notes: initial.notes,
      });
      if (initial.filter_id) loadRecommendation(initial.filter_id);
    } else {
      form.resetFields();
      form.setFieldsValue({ voltage_type: 'AC380V' });
    }
  }, [initial, visible]);

  const loadRecommendation = async (filterId: number) => {
    try {
      const res = await api.recommendCable(filterId);
      setRecommendation(res.recommended);
    } catch { setRecommendation(null); }
  };

  const handleFilterChange = (filterId: number) => {
    if (!filterId) return;
    loadRecommendation(filterId);
    // Auto-fill load_current_a from filter's rated current
    const filter = filters.find(f => f.id === filterId);
    if (filter && !initial) {
      form.setFieldValue('load_current_a', filter.current_rating_a);
    }
  };

  return (
    <Modal title={initial ? '编辑回路' : '新增回路'} open={visible} onOk={async () => {
      await onSave(await form.validateFields());
      onClose();
    }} onCancel={onClose} width={600}>
      <Form form={form} layout="vertical">
        <Form.Item name="filter_id" label="滤波器" rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder="搜索滤波器型号"
            filterOption={(input, option) => (option?.label as string || '').includes(input)}
            onChange={(val) => val && handleFilterChange(val)}
            options={filters.map(f => ({ value: f.id, label: `${f.model_name} (${f.current_rating_a}A ${f.phases})` }))}
          />
        </Form.Item>
        {recommendation && (
          <div style={{ padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, marginBottom: 12 }}>
            <strong>推荐电缆:</strong> {recommendation.model_name}
             ({recommendation.cross_section_mm2}mm², {recommendation.max_current_a}A)
            &nbsp;连接器: {recommendation.connector_type || '--'}
            &nbsp;¥{recommendation.unit_price}/m
          </div>
        )}
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="name" label="回路名称"><Input style={{ width: 200 }} placeholder="如 主回路" /></Form.Item>
          <Form.Item name="purpose" label="用途"><Input style={{ width: 200 }} placeholder="如 暗室供电" /></Form.Item>
        </Space>
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="voltage_type" label="电压类型">
            <Select style={{ width: 160 }} options={[
              { value: 'AC380V', label: 'AC 380V' },
              { value: 'AC220V', label: 'AC 220V' },
              { value: 'DC24V', label: 'DC 24V' },
              { value: 'DC48V', label: 'DC 48V' },
            ]} />
          </Form.Item>
          <Form.Item name="load_current_a" label="负载电流(A)" rules={[{ required: true }]}>
            <InputNumber style={{ width: 160 }} step={0.1} />
          </Form.Item>
        </Space>
        <Form.Item name="notes" label="备注"><Input.TextArea rows={2} /></Form.Item>
      </Form>
    </Modal>
  );
}

/* ---------- Segment Form ---------- */
function SegmentForm({ visible, onClose, onSave, initial, circuitId, parentSegments, circuitLoadA }: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initial?: CableSegment | null;
  circuitId: number;
  parentSegments: CableSegment[];
  circuitLoadA?: number;
}) {
  const LOAD_SAFETY_FACTOR = 1.25; // keep in sync with server/src/config.ts
  const [cables, setCables] = useState<any[]>([]);
  const [highlightCable, setHighlightCable] = useState<number | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    api.getCables().then(setCables);
  }, []);

  useEffect(() => {
    if (initial) form.setFieldsValue(initial);
    else form.resetFields();
  }, [initial, visible]);

  // Auto-recommend: highlight cable that meets load requirement
  useEffect(() => {
    if (!circuitLoadA || cables.length === 0) return;
    const required = circuitLoadA * LOAD_SAFETY_FACTOR;
    const match = cables.find(c => c.max_current_a >= required);
    if (match) setHighlightCable(match.id);
  }, [circuitLoadA, cables, visible]);

  const labels = cables.map(c => {
    const isRec = c.id === highlightCable;
    return {
      value: c.id,
      label: `${isRec ? '★ ' : ''}${c.model_name} (${c.cross_section_mm2}mm²/${c.max_current_a}A) ¥${c.unit_price}/m`,
    };
  });

  return (
    <Modal title={initial ? '编辑线缆段' : '新增线缆段'} open={visible} onOk={async () => {
      await onSave({ ...await form.validateFields(), circuit_id: circuitId });
      onClose();
    }} onCancel={onClose} width={640}>
      <Form form={form} layout="vertical">
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="segment_type" label="类型" rules={[{ required: true }]}>
            <Select style={{ width: 160 }} options={[
              { value: 'trunk', label: '主干' },
              { value: 'branch', label: '分支' },
              { value: 'parallel', label: '并联' },
              { value: 'dragchain', label: '拖链' },
            ]} />
          </Form.Item>
          {parentSegments.length > 0 && (
            <Form.Item name="parent_segment_id" label="父段">
              <Select style={{ width: 200 }} allowClear placeholder="无(主干)" options={parentSegments.map(s => ({ value: s.id, label: s.segment_type + ' #' + s.id }))} />
            </Form.Item>
          )}
        </Space>
        <Form.Item name="cable_spec_id" label="电缆规格" rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder="搜索电缆型号"
            filterOption={(input, option) => (option?.label as string || '').includes(input)}
            options={labels}
          />
        </Form.Item>
        {highlightCable && circuitLoadA && (
          <div style={{ padding: '8px 12px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, marginBottom: 12 }}>
            推荐: 负载{circuitLoadA}A × {LOAD_SAFETY_FACTOR} = {(circuitLoadA * LOAD_SAFETY_FACTOR).toFixed(1)}A，推荐使用标★电缆
          </div>
        )}
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="length_m" label="长度(m)" rules={[{ required: true }]}><InputNumber style={{ width: 160 }} step={0.5} /></Form.Item>
          <Form.Item name="parallel_count" label="并联根数"><InputNumber style={{ width: 160 }} min={1} /></Form.Item>
        </Space>
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="from_location" label="起点"><Input style={{ width: 220 }} placeholder="如 滤波器出线端" /></Form.Item>
          <Form.Item name="to_location" label="终点"><Input style={{ width: 220 }} placeholder="如 转台接线盒" /></Form.Item>
        </Space>
      </Form>
    </Modal>
  );
}

/* ---------- Device Form ---------- */
function DeviceForm({ visible, onClose, onSave, initial, segmentId }: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initial?: Device | null;
  segmentId: number;
}) {
  const [form] = Form.useForm();
  useEffect(() => {
    if (initial) form.setFieldsValue(initial);
    else form.resetFields();
  }, [initial, visible]);

  return (
    <Modal title={initial ? '编辑设备' : '新增设备'} open={visible} onOk={async () => {
      await onSave({ ...await form.validateFields(), segment_id: segmentId });
      onClose();
    }} onCancel={onClose} width={520}>
      <Form form={form} layout="vertical">
        <Form.Item name="device_type" label="设备类型" rules={[{ required: true }]}>
          <Select options={[
            { value: '照明', label: '照明' },
            { value: '天线塔', label: '天线塔' },
            { value: '摄像头', label: '摄像头' },
            { value: '转台', label: '转台' },
            { value: '插座', label: '插座' },
            { value: '功放', label: '功放' },
            { value: '接收机', label: '接收机' },
            { value: '其他', label: '其他' },
          ]} />
        </Form.Item>
        <Form.Item name="model" label="型号"><Input /></Form.Item>
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="rating_v" label="额定电压(V)"><InputNumber style={{ width: 140 }} /></Form.Item>
          <Form.Item name="rating_a" label="额定电流(A)"><InputNumber style={{ width: 140 }} /></Form.Item>
          <Form.Item name="quantity" label="数量"><InputNumber style={{ width: 120 }} min={1} /></Form.Item>
        </Space>
        <Form.Item name="unit_price" label="单价(¥)"><InputNumber style={{ width: 200 }} precision={2} /></Form.Item>
      </Form>
    </Modal>
  );
}

/* ========== Main Page ========== */
export default function ProjectEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = Number(id);

  const [project, setProject] = useState<Project | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [expandedRoom, setExpandedRoom] = useState<number | null>(null);
  const [roomData, setRoomData] = useState<Record<number, Circuit[]>>({});

  // Modal states
  const [roomModal, setRoomModal] = useState(false);
  const [roomEdit, setRoomEdit] = useState<Room | null>(null);
  const [circuitModal, setCircuitModal] = useState(false);
  const [circuitEdit, setCircuitEdit] = useState<Circuit | null>(null);
  const [activeRoom, setActiveRoom] = useState<number>(0);
  const [segmentModal, setSegmentModal] = useState(false);
  const [segmentEdit, setSegmentEdit] = useState<CableSegment | null>(null);
  const [activeCircuit, setActiveCircuit] = useState<number>(0);
  const [deviceModal, setDeviceModal] = useState(false);
  const [deviceEdit, setDeviceEdit] = useState<Device | null>(null);
  const [activeSegment, setActiveSegment] = useState<number>(0);

  // Compliance report
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [dragChainOpen, setDragChainOpen] = useState(false);

  // Layout editor (Phase 1b)
  const [layoutRoom, setLayoutRoom] = useState<Room | null>(null);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [layoutRoutes, setLayoutRoutes] = useState<any[]>([]);

  const loadProject = useCallback(async () => {
    const p = await api.getProject(projectId);
    setProject(p);
    setRooms(p.rooms || []);
  }, [projectId]);

  const loadCircuits = useCallback(async (roomId: number) => {
    const circuits = await api.getCircuits(roomId);
    // Load segments for each circuit
    const withSegments = await Promise.all(circuits.map(async (c: Circuit) => {
      c.segments = await api.getSegments(c.id);
      return c;
    }));
    setRoomData(prev => ({ ...prev, [roomId]: withSegments }));
  }, []);

  useEffect(() => { loadProject(); }, [loadProject]);

  useEffect(() => {
    if (expandedRoom !== null && !roomData[expandedRoom]) {
      loadCircuits(expandedRoom);
    }
  }, [expandedRoom, loadCircuits]);

  // Room CRUD
  const saveRoom = async (data: any) => {
    if (roomEdit) {
      await api.updateRoom(roomEdit.id, data);
    }
    await loadProject();
  };

  // Since rooms are embedded in project, use updateProject
  const addRoom = async (data: any) => {
    await api.createRoom({ ...data, project_id: projectId });
    await loadProject();
  };

  // Circuit CRUD
  const addCircuit = async (data: any) => {
    await api.createCircuit({ ...data, room_id: activeRoom });
    await loadCircuits(activeRoom);
  };
  const updateCircuit = async (data: any) => {
    if (!circuitEdit) return;
    await api.updateCircuit(circuitEdit.id, data);
    await loadCircuits(activeRoom);
  };
  const deleteCircuit = async (circuitId: number) => {
    await api.deleteCircuit(circuitId);
    await loadCircuits(activeRoom);
  };

  // Segment CRUD
  const addSegment = async (data: any) => {
    await api.createSegment(data);
    await loadCircuits(activeRoom);
  };
  const updateSegment = async (data: any) => {
    if (!segmentEdit) return;
    await api.updateSegment(segmentEdit.id, data);
    await loadCircuits(activeRoom);
  };
  const deleteSegment = async (segmentId: number) => {
    await api.deleteSegment(segmentId);
    await loadCircuits(activeRoom);
  };

  // Device CRUD
  const addDevice = async (data: any) => {
    await api.createDevice(data);
    await loadCircuits(activeRoom);
  };
  const updateDevice = async (data: any) => {
    if (!deviceEdit) return;
    await api.updateDevice(deviceEdit.id, data);
    await loadCircuits(activeRoom);
  };
  const deleteRoom = async (roomId: number) => {
    await api.deleteRoom(roomId);
    await loadProject();
  };
  const deleteDevice = async (deviceId: number) => {
    await api.deleteDevice(deviceId);
    await loadCircuits(activeRoom);
  };

  // Layout editor
  const loadLayout = useCallback(async (roomId: number) => {
    const data = await api.getProjectLayout(projectId);
    const room = data.rooms?.find((r: any) => r.id === roomId);
    if (!room) return;
    const routes: any[] = [];
    for (const circuit of room.circuits || []) {
      for (const seg of circuit.segments || []) {
        routes.push({
          ...seg,
          circuit_name: circuit.name || '未命名',
          filter_model: circuit.filter_model,
        });
      }
    }
    setLayoutRoutes(routes);
  }, [projectId]);

  const handleLayoutOpen = async (room: Room) => {
    setLayoutRoom(room);
    setLayoutOpen(true);
    await loadLayout(room.id);
  };

  const handleDeviceMove = async (deviceId: number, posX: number, posY: number) => {
    await api.updateDevice(deviceId, { pos_x: posX, pos_y: posY });
    // Reload affected circuits
    if (layoutRoom) await loadLayout(layoutRoom.id);
  };

  const handleRouteChange = async (segmentId: number, fromX: number, fromY: number, toX: number, toY: number, lengthM: number) => {
    await api.updateSegmentRoute(segmentId, { from_x: fromX, from_y: fromY, to_x: toX, to_y: toY, length_m: lengthM });
    // Reload circuits for data refresh
    if (layoutRoom) {
      // Find which room has this segment
      const circuits = await api.getCircuits(layoutRoom.id);
      const withSegs = await Promise.all(circuits.map(async (c: any) => {
        c.segments = await api.getSegments(c.id);
        return c;
      }));
      setRoomData(prev => ({ ...prev, [layoutRoom.id]: withSegs }));
    }
  };

  const handleExportExcel = () => {
    api.exportProjectExcel(projectId);
  };

  const circuitColumns = (roomId: number) => [
    { title: '名称', dataIndex: 'name', key: 'name', width: 100 },
    { title: '滤波器', dataIndex: 'filter_model', key: 'filter_model', width: 140 },
    { title: '电压', dataIndex: 'voltage_type', key: 'voltage_type', width: 90 },
    { title: '负载电流(A)', dataIndex: 'load_current_a', key: 'load_current_a', width: 110 },
    { title: '相数', dataIndex: 'phases', key: 'phases', width: 60 },
    { title: '额定电流(A)', dataIndex: 'current_rating_a', key: 'current_rating_a', width: 100 },
    {
      title: '操作', key: 'action', width: 160,
      render: (_: any, row: Circuit) => (
        <Space size="small">
          <Button size="small" type="primary" ghost onClick={() => {
            setActiveRoom(roomId);
            setActiveCircuit(row.id);
            setSegmentModal(true);
            setSegmentEdit(null);
          }}>+线段</Button>
          <Button size="small" onClick={() => {
            setActiveRoom(roomId);
            setCircuitEdit(row);
            setCircuitModal(true);
          }}>编辑</Button>
          <Popconfirm title="删除该回路？" onConfirm={() => deleteCircuit(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const segmentColumns = (roomId: number, circuitId: number) => [
    { title: '类型', dataIndex: 'segment_type', key: 'segment_type', width: 80, render: (v: string) => <Tag>{v}</Tag> },
    { title: '电缆', dataIndex: 'cable_model', key: 'cable_model', width: 160 },
    { title: '截面', dataIndex: 'cross_section_mm2', key: 'cross_section_mm2', width: 80, render: (v: number) => v ? `${v}mm²` : '-' },
    { title: '载流量', dataIndex: 'max_current_a', key: 'max_current_a', width: 70, render: (v: number) => v ? `${v}A` : '-' },
    { title: '长度(m)', dataIndex: 'length_m', key: 'length_m', width: 80 },
    { title: '并联', dataIndex: 'parallel_count', key: 'parallel_count', width: 60 },
    { title: '起点→终点', key: 'location', width: 180,
      render: (_: any, r: CableSegment) => `${r.from_location || '?'} → ${r.to_location || '?'}` },
    { title: '设备', key: 'devices', width: 120,
      render: (_: any, r: CableSegment) => r.devices?.length ? `${r.devices.length}个` : '-' },
    {
      title: '操作', key: 'action', width: 160,
      render: (_: any, row: CableSegment) => (
        <Space size="small">
          <Button size="small" type="primary" ghost onClick={() => {
            setActiveRoom(roomId);
            setActiveCircuit(circuitId);
            setActiveSegment(row.id);
            setDeviceModal(true);
            setDeviceEdit(null);
          }}>+设备</Button>
          <Button size="small" onClick={() => {
            setActiveRoom(roomId);
            setActiveCircuit(circuitId);
            setSegmentEdit(row);
            setSegmentModal(true);
          }}>编辑</Button>
          <Popconfirm title="删除该线段？" onConfirm={() => deleteSegment(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const deviceColumns = [
    { title: '类型', dataIndex: 'device_type', key: 'device_type', width: 100 },
    { title: '型号', dataIndex: 'model', key: 'model', width: 120 },
    { title: '额定电压', dataIndex: 'rating_v', key: 'rating_v', width: 90, render: (v: number) => v ? `${v}V` : '-' },
    { title: '额定电流', dataIndex: 'rating_a', key: 'rating_a', width: 90, render: (v: number) => v ? `${v}A` : '-' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 60 },
    { title: '单价(¥)', dataIndex: 'unit_price', key: 'unit_price', width: 80, render: (v: number) => v?.toFixed(2) },
    {
      title: '操作', key: 'action', width: 100,
      render: (_: any, row: Device) => (
        <Space size="small">
          <Button size="small" onClick={() => {
            setActiveSegment(row.segment_id);
            setDeviceEdit(row);
            setDeviceModal(true);
          }}>编辑</Button>
          <Popconfirm title="删除该设备？" onConfirm={() => deleteDevice(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!project) return <Card loading />;

  return (
    <div>
      <Card
        title={<Title level={4} style={{ margin: 0 }}>{project.name}</Title>}
        extra={
          <Space>
            <Button icon={<SafetyOutlined />} onClick={() => setComplianceOpen(true)}>GB校验</Button>
            <Button onClick={() => setDragChainOpen(true)}>拖链计算</Button>
            <Button icon={<BarChartOutlined />} onClick={() => navigate(`/projects/${projectId}/bom`)}>BOM清单</Button>
            <Button type="primary" onClick={handleExportExcel}>导出Excel</Button>
          </Space>
        }
      >
        <Descriptions size="small" column={3} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="描述">{project.description || '-'}</Descriptions.Item>
          <Descriptions.Item label="房间数">{rooms.length}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{project.created_at?.slice(0, 10)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title="房间与配电"
        style={{ marginTop: 16 }}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setRoomEdit(null);
            setRoomModal(true);
          }}>新增房间</Button>
        }
      >
        {rooms.length === 0 ? (
          <Empty description="暂无房间，请先新增房间" />
        ) : (
          rooms.map(room => (
            <Card
              key={room.id}
              type="inner"
              size="small"
              title={`${room.room_type} (${room.length_m}×${room.width_m}×${room.height_m}m)${room.light_model ? ` 照明:${room.light_model}×${room.light_count}` : ''}`}
              extra={
                <Space>
                  <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={() => {
                    setActiveRoom(room.id);
                    setCircuitEdit(null);
                    setCircuitModal(true);
                  }}>新增回路</Button>
                  <Button size="small" icon={<EnvironmentOutlined />} onClick={() => handleLayoutOpen(room)}>布局</Button>
                  <Button size="small" onClick={() => {
                    setRoomEdit(room);
                    setRoomModal(true);
                  }}>编辑</Button>
                  <Popconfirm title="删除该房间及其所有回路？" onConfirm={() => deleteRoom(room.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              }
              style={{ marginBottom: 12 }}
            >
              {/* Circuits */}
              {(() => {
                const circuits = roomData[room.id] || [];
                if (circuits.length === 0) return <Empty description="暂无回路" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
                return circuits.map(circuit => (
                  <Card
                    key={circuit.id}
                    type="inner"
                    size="small"
                    title={`${circuit.name || '未命名'} ${circuit.purpose ? '(' + circuit.purpose + ')' : ''} — ${circuit.filter_model || '?'} (${circuit.voltage_type} / ${circuit.load_current_a}A)`}
                    extra={
                      <Space size="small">
                        <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={() => {
                          setActiveRoom(room.id);
                          setActiveCircuit(circuit.id);
                          setSegmentEdit(null);
                          setSegmentModal(true);
                        }}>+线段</Button>
                        <Button size="small" onClick={() => {
                          setActiveRoom(room.id);
                          setCircuitEdit(circuit);
                          setCircuitModal(true);
                        }}>编辑</Button>
                        <Popconfirm title="删除回路？" onConfirm={() => deleteCircuit(circuit.id)}>
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    }
                    style={{ marginBottom: 8, marginLeft: 16 }}
                  >
                    {/* Segments */}
                    {(!circuit.segments || circuit.segments.length === 0) ? (
                      <Empty description="暂无线缆段" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                      circuit.segments.map(seg => (
                        <div key={seg.id} style={{ marginBottom: 8, marginLeft: 24, padding: '8px 12px', border: '1px solid #f0f0f0', borderRadius: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <Space>
                              <Tag>{seg.segment_type}</Tag>
                              <strong>{seg.cable_model || '?'}</strong>
                              <span>{seg.cross_section_mm2}mm²</span>
                              <span>{seg.length_m}m</span>
                              {seg.parallel_count > 1 && <Tag color="blue">×{seg.parallel_count}并联</Tag>}
                            </Space>
                            <Space size="small">
                              <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={() => {
                                setActiveRoom(room.id);
                                setActiveCircuit(circuit.id);
                                setActiveSegment(seg.id);
                                setDeviceEdit(null);
                                setDeviceModal(true);
                              }}>+设备</Button>
                              <Button size="small" onClick={() => {
                                setActiveRoom(room.id);
                                setActiveCircuit(circuit.id);
                                setSegmentEdit(seg);
                                setSegmentModal(true);
                              }}>编辑</Button>
                              <Popconfirm title="删除线段？" onConfirm={() => deleteSegment(seg.id)}>
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </Space>
                          </div>
                          {seg.from_location && (
                            <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>
                              {seg.from_location} → {seg.to_location}
                            </div>
                          )}
                          {/* Devices */}
                          {seg.devices && seg.devices.length > 0 && (
                            <Table
                              rowKey="id"
                              columns={deviceColumns}
                              dataSource={seg.devices}
                              size="small"
                              pagination={false}
                              style={{ marginTop: 4 }}
                            />
                          )}
                        </div>
                      ))
                    )}
                  </Card>
                ));
              })()}
            </Card>
          ))
        )}
      </Card>

      {/* Modals */}
      <RoomForm visible={roomModal} onClose={() => { setRoomModal(false); setRoomEdit(null); }}
        onSave={roomEdit ? (d) => saveRoom(d) : addRoom} initial={roomEdit} />

      {circuitModal && (
        <CircuitForm visible={circuitModal} onClose={() => { setCircuitModal(false); setCircuitEdit(null); }}
          onSave={circuitEdit ? updateCircuit : addCircuit} initial={circuitEdit} roomId={activeRoom} />
      )}

      {segmentModal && (
        <SegmentForm visible={segmentModal} onClose={() => { setSegmentModal(false); setSegmentEdit(null); }}
          onSave={segmentEdit ? updateSegment : addSegment} initial={segmentEdit}
          circuitId={activeCircuit}
          parentSegments={(roomData[activeRoom]?.find(c => c.id === activeCircuit)?.segments || [])}
          circuitLoadA={roomData[activeRoom]?.find(c => c.id === activeCircuit)?.load_current_a} />
      )}

      {deviceModal && (
        <DeviceForm visible={deviceModal} onClose={() => { setDeviceModal(false); setDeviceEdit(null); }}
          onSave={deviceEdit ? updateDevice : addDevice} initial={deviceEdit} segmentId={activeSegment} />
      )}

      {layoutRoom && (
        <RoomLayout
          visible={layoutOpen}
          onClose={() => { setLayoutOpen(false); setLayoutRoom(null); }}
          room={layoutRoom}
          routes={layoutRoutes}
          onDeviceMove={handleDeviceMove}
          onRouteChange={handleRouteChange}
        />
      )}
      <ComplianceReport open={complianceOpen} onClose={() => setComplianceOpen(false)} projectId={projectId} />
      <DragChainCalc open={dragChainOpen} onClose={() => setDragChainOpen(false)} />
    </div>
  );
}
