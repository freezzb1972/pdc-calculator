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
import { useAppTranslation } from '../i18n/useAppTranslation';

const { Title } = Typography;

/* ---------- Room Form ---------- */
function RoomForm({ visible, onClose, onSave, initial }: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initial?: Room | null;
}) {
  const { t } = useAppTranslation('projectEditor');
  const [form] = Form.useForm();
  useEffect(() => {
    if (initial) form.setFieldsValue(initial);
    else form.resetFields();
  }, [initial, visible]);

  return (
    <Modal title={initial ? t('room.modalEdit') : t('room.modalNew')} open={visible} onOk={async () => {
      await onSave(await form.validateFields());
      onClose();
    }} onCancel={onClose} width={520}>
      <Form form={form} layout="vertical">
        <Form.Item name="room_type" label={t('room.type')} rules={[{ required: true }]}>
          <Select options={[
            { value: '暗室', label: t('room.types.darkRoom') },
            { value: '控制室', label: t('room.types.controlRoom') },
            { value: '功放室', label: t('room.types.ampRoom') },
            { value: '传导室', label: t('room.types.conductionRoom') },
            { value: '负载室', label: t('room.types.loadRoom') },
            { value: '屏蔽室', label: t('room.types.shieldedRoom') },
          ]} />
        </Form.Item>
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="length_m" label={t('room.length')} rules={[{ required: true }]}><InputNumber style={{ width: 140 }} step={0.1} /></Form.Item>
          <Form.Item name="width_m" label={t('room.width')} rules={[{ required: true }]}><InputNumber style={{ width: 140 }} step={0.1} /></Form.Item>
          <Form.Item name="height_m" label={t('room.height')} rules={[{ required: true }]}><InputNumber style={{ width: 140 }} step={0.1} /></Form.Item>
        </Space>
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="light_model" label={t('room.lightModel')}><Input style={{ width: 180 }} /></Form.Item>
          <Form.Item name="light_count" label={t('room.lightCount')}><InputNumber style={{ width: 120 }} /></Form.Item>
          <Form.Item name="light_circuits" label={t('room.lightCircuits')}><InputNumber style={{ width: 120 }} /></Form.Item>
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
  const { t } = useAppTranslation('projectEditor');
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
    <Modal title={initial ? t('circuit.modalEdit') : t('circuit.modalNew')} open={visible} onOk={async () => {
      await onSave(await form.validateFields());
      onClose();
    }} onCancel={onClose} width={600}>
      <Form form={form} layout="vertical">
        <Form.Item name="filter_id" label={t('circuit.filter')} rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder={t('circuit.filterSearchPlaceholder')}
            filterOption={(input, option) => (option?.label as string || '').includes(input)}
            onChange={(val) => val && handleFilterChange(val)}
            options={filters.map(f => ({ value: f.id, label: `${f.model_name} (${f.current_rating_a}A ${f.phases})` }))}
          />
        </Form.Item>
        {recommendation && (
          <div style={{ padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, marginBottom: 12 }}>
            <strong>{t('circuit.recommendCable')}:</strong> {recommendation.model_name}
             ({recommendation.cross_section_mm2}mm², {recommendation.max_current_a}A)
            &nbsp;{t('circuit.connector')}: {recommendation.connector_type || '--'}
            &nbsp;¥{recommendation.unit_price}/m
          </div>
        )}
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="name" label={t('circuit.name')}><Input style={{ width: 200 }} placeholder={t('circuit.namePlaceholder')} /></Form.Item>
          <Form.Item name="purpose" label={t('circuit.purpose')}><Input style={{ width: 200 }} placeholder={t('circuit.purposePlaceholder')} /></Form.Item>
        </Space>
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="voltage_type" label={t('circuit.voltageType')}>
            <Select style={{ width: 160 }} options={[
              { value: 'AC380V', label: 'AC 380V' },
              { value: 'AC220V', label: 'AC 220V' },
              { value: 'DC24V', label: 'DC 24V' },
              { value: 'DC48V', label: 'DC 48V' },
            ]} />
          </Form.Item>
          <Form.Item name="load_current_a" label={t('circuit.loadCurrent')} rules={[{ required: true }]}>
            <InputNumber style={{ width: 160 }} step={0.1} />
          </Form.Item>
        </Space>
        <Form.Item name="notes" label={t('circuit.notes')}><Input.TextArea rows={2} /></Form.Item>
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
  const { t } = useAppTranslation('projectEditor');
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
    <Modal title={initial ? t('segment.modalEdit') : t('segment.modalNew')} open={visible} onOk={async () => {
      await onSave({ ...await form.validateFields(), circuit_id: circuitId });
      onClose();
    }} onCancel={onClose} width={640}>
      <Form form={form} layout="vertical">
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="segment_type" label={t('segment.type')} rules={[{ required: true }]}>
            <Select style={{ width: 160 }} options={[
              { value: 'trunk', label: t('segment.types.trunk') },
              { value: 'branch', label: t('segment.types.branch') },
              { value: 'parallel', label: t('segment.types.parallel') },
              { value: 'dragchain', label: t('segment.types.dragChain') },
            ]} />
          </Form.Item>
          {parentSegments.length > 0 && (
            <Form.Item name="parent_segment_id" label={t('segment.parentSegment')}>
              <Select style={{ width: 200 }} allowClear placeholder={t('segment.parentPlaceholder')} options={parentSegments.map(s => ({ value: s.id, label: s.segment_type + ' #' + s.id }))} />
            </Form.Item>
          )}
        </Space>
        <Form.Item name="cable_spec_id" label={t('segment.cableSpec')} rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder={t('segment.cableSearchPlaceholder')}
            filterOption={(input, option) => (option?.label as string || '').includes(input)}
            options={labels}
          />
        </Form.Item>
        {highlightCable && circuitLoadA && (
          <div style={{ padding: '8px 12px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, marginBottom: 12 }}>
            {t('segment.recommendation', { loadA: circuitLoadA, requiredA: (circuitLoadA * LOAD_SAFETY_FACTOR).toFixed(1) })}
          </div>
        )}
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="length_m" label={t('segment.length')} rules={[{ required: true }]}><InputNumber style={{ width: 160 }} step={0.5} /></Form.Item>
          <Form.Item name="parallel_count" label={t('segment.parallelCount')}><InputNumber style={{ width: 160 }} min={1} /></Form.Item>
        </Space>
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="from_location" label={t('segment.from')}><Input style={{ width: 220 }} placeholder={t('segment.fromPlaceholder')} /></Form.Item>
          <Form.Item name="to_location" label={t('segment.to')}><Input style={{ width: 220 }} placeholder={t('segment.toPlaceholder')} /></Form.Item>
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
  const { t } = useAppTranslation('projectEditor');
  const [form] = Form.useForm();
  useEffect(() => {
    if (initial) form.setFieldsValue(initial);
    else form.resetFields();
  }, [initial, visible]);

  return (
    <Modal title={initial ? t('device.modalEdit') : t('device.modalNew')} open={visible} onOk={async () => {
      await onSave({ ...await form.validateFields(), segment_id: segmentId });
      onClose();
    }} onCancel={onClose} width={520}>
      <Form form={form} layout="vertical">
        <Form.Item name="device_type" label={t('device.type')} rules={[{ required: true }]}>
          <Select options={[
            { value: '照明', label: t('device.types.lighting') },
            { value: '天线塔', label: t('device.types.antennaTower') },
            { value: '摄像头', label: t('device.types.camera') },
            { value: '转台', label: t('device.types.turntable') },
            { value: '插座', label: t('device.types.socket') },
            { value: '功放', label: t('device.types.amplifier') },
            { value: '接收机', label: t('device.types.receiver') },
            { value: '其他', label: t('device.types.other') },
          ]} />
        </Form.Item>
        <Form.Item name="model" label={t('device.model')}><Input /></Form.Item>
        <Space style={{ width: '100%' }} size={16}>
          <Form.Item name="rating_v" label={t('device.ratedVoltage')}><InputNumber style={{ width: 140 }} /></Form.Item>
          <Form.Item name="rating_a" label={t('device.ratedCurrent')}><InputNumber style={{ width: 140 }} /></Form.Item>
          <Form.Item name="quantity" label={t('device.quantity')}><InputNumber style={{ width: 120 }} min={1} /></Form.Item>
        </Space>
        <Form.Item name="unit_price" label={t('device.unitPrice')}><InputNumber style={{ width: 200 }} precision={2} /></Form.Item>
      </Form>
    </Modal>
  );
}

/* ========== Main Page ========== */
export default function ProjectEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = Number(id);
  const { t } = useAppTranslation('projectEditor');

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
          circuit_name: circuit.name || t('circuit.unnamed'),
          filter_model: circuit.filter_model,
        });
      }
    }
    setLayoutRoutes(routes);
  }, [projectId, t]);

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

  // Column definitions moved inside component to access t()
  const circuitColumns = (roomId: number) => [
    { title: t('circuit.columns.name'), dataIndex: 'name', key: 'name', width: 100 },
    { title: t('circuit.columns.filter'), dataIndex: 'filter_model', key: 'filter_model', width: 140 },
    { title: t('circuit.columns.voltage'), dataIndex: 'voltage_type', key: 'voltage_type', width: 90 },
    { title: t('circuit.columns.loadCurrent'), dataIndex: 'load_current_a', key: 'load_current_a', width: 110 },
    { title: t('circuit.columns.phase'), dataIndex: 'phases', key: 'phases', width: 60 },
    { title: t('circuit.columns.ratedCurrent'), dataIndex: 'current_rating_a', key: 'current_rating_a', width: 100 },
    {
      title: t('circuit.columns.actions'), key: 'action', width: 160,
      render: (_: any, row: Circuit) => (
        <Space size="small">
          <Button size="small" type="primary" ghost onClick={() => {
            setActiveRoom(roomId);
            setActiveCircuit(row.id);
            setSegmentModal(true);
            setSegmentEdit(null);
          }}>{t('circuit.btnAddSegment')}</Button>
          <Button size="small" onClick={() => {
            setActiveRoom(roomId);
            setCircuitEdit(row);
            setCircuitModal(true);
          }}>{t('circuit.btnEdit')}</Button>
          <Popconfirm title={t('circuit.deleteConfirm')} onConfirm={() => deleteCircuit(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const segmentColumns = (roomId: number, circuitId: number) => [
    { title: t('segment.columns.type'), dataIndex: 'segment_type', key: 'segment_type', width: 80, render: (v: string) => <Tag>{v}</Tag> },
    { title: t('segment.columns.cable'), dataIndex: 'cable_model', key: 'cable_model', width: 160 },
    { title: t('segment.columns.crossSection'), dataIndex: 'cross_section_mm2', key: 'cross_section_mm2', width: 80, render: (v: number) => v ? `${v}mm²` : '-' },
    { title: t('segment.columns.ampacity'), dataIndex: 'max_current_a', key: 'max_current_a', width: 70, render: (v: number) => v ? `${v}A` : '-' },
    { title: t('segment.columns.length'), dataIndex: 'length_m', key: 'length_m', width: 80 },
    { title: t('segment.columns.parallel'), dataIndex: 'parallel_count', key: 'parallel_count', width: 60 },
    { title: t('segment.columns.route'), key: 'location', width: 180,
      render: (_: any, r: CableSegment) => `${r.from_location || '?'} → ${r.to_location || '?'}` },
    { title: t('segment.columns.devices'), key: 'devices', width: 120,
      render: (_: any, r: CableSegment) => r.devices?.length ? `${r.devices.length}个` : '-' },
    {
      title: t('segment.columns.actions'), key: 'action', width: 160,
      render: (_: any, row: CableSegment) => (
        <Space size="small">
          <Button size="small" type="primary" ghost onClick={() => {
            setActiveRoom(roomId);
            setActiveCircuit(circuitId);
            setActiveSegment(row.id);
            setDeviceModal(true);
            setDeviceEdit(null);
          }}>{t('segment.btnAddDevice')}</Button>
          <Button size="small" onClick={() => {
            setActiveRoom(roomId);
            setActiveCircuit(circuitId);
            setSegmentEdit(row);
            setSegmentModal(true);
          }}>{t('segment.btnEdit')}</Button>
          <Popconfirm title={t('segment.deleteConfirm')} onConfirm={() => deleteSegment(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const deviceColumns = [
    { title: t('device.columns.type'), dataIndex: 'device_type', key: 'device_type', width: 100 },
    { title: t('device.columns.model'), dataIndex: 'model', key: 'model', width: 120 },
    { title: t('device.columns.ratedVoltage'), dataIndex: 'rating_v', key: 'rating_v', width: 90, render: (v: number) => v ? `${v}V` : '-' },
    { title: t('device.columns.ratedCurrent'), dataIndex: 'rating_a', key: 'rating_a', width: 90, render: (v: number) => v ? `${v}A` : '-' },
    { title: t('device.columns.quantity'), dataIndex: 'quantity', key: 'quantity', width: 60 },
    { title: t('device.columns.unitPrice'), dataIndex: 'unit_price', key: 'unit_price', width: 80, render: (v: number) => v?.toFixed(2) },
    {
      title: t('device.columns.actions'), key: 'action', width: 100,
      render: (_: any, row: Device) => (
        <Space size="small">
          <Button size="small" onClick={() => {
            setActiveSegment(row.segment_id);
            setDeviceEdit(row);
            setDeviceModal(true);
          }}>{t('device.btnEdit')}</Button>
          <Popconfirm title={t('device.deleteConfirm')} onConfirm={() => deleteDevice(row.id)}>
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
            <Button icon={<SafetyOutlined />} onClick={() => setComplianceOpen(true)}>{t('toolbar.gbCheck')}</Button>
            <Button onClick={() => setDragChainOpen(true)}>{t('toolbar.dragChainCalc')}</Button>
            <Button icon={<BarChartOutlined />} onClick={() => navigate(`/projects/${projectId}/bom`)}>{t('toolbar.bomList')}</Button>
            <Button type="primary" onClick={handleExportExcel}>{t('toolbar.exportExcel')}</Button>
          </Space>
        }
      >
        <Descriptions size="small" column={3} style={{ marginBottom: 16 }}>
          <Descriptions.Item label={t('info.description')}>{project.description || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('info.roomCount')}>{rooms.length}</Descriptions.Item>
          <Descriptions.Item label={t('info.createdAt')}>{project.created_at?.slice(0, 10)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={t('room.sectionTitle')}
        style={{ marginTop: 16 }}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setRoomEdit(null);
            setRoomModal(true);
          }}>{t('room.btnAdd')}</Button>
        }
      >
        {rooms.length === 0 ? (
          <Empty description={t('room.emptyHint')} />
        ) : (
          rooms.map(room => (
            <Card
              key={room.id}
              type="inner"
              size="small"
              title={`${room.room_type} (${room.length_m}×${room.width_m}×${room.height_m}m)${room.light_model ? ` ${t('room.lighting')}:${room.light_model}×${room.light_count}` : ''}`}
              extra={
                <Space>
                  <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={() => {
                    setActiveRoom(room.id);
                    setCircuitEdit(null);
                    setCircuitModal(true);
                  }}>{t('circuit.btnAdd')}</Button>
                  <Button size="small" icon={<EnvironmentOutlined />} onClick={() => handleLayoutOpen(room)}>{t('room.btnLayout')}</Button>
                  <Button size="small" onClick={() => {
                    setRoomEdit(room);
                    setRoomModal(true);
                  }}>{t('room.btnEdit')}</Button>
                  <Popconfirm title={t('room.deleteConfirm')} onConfirm={() => deleteRoom(room.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              }
              style={{ marginBottom: 12 }}
            >
              {/* Circuits */}
              {(() => {
                const circuits = roomData[room.id] || [];
                if (circuits.length === 0) return <Empty description={t('circuit.emptyHint')} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
                return circuits.map(circuit => (
                  <Card
                    key={circuit.id}
                    type="inner"
                    size="small"
                    title={`${circuit.name || t('circuit.unnamed')} ${circuit.purpose ? '(' + circuit.purpose + ')' : ''} — ${circuit.filter_model || '?'} (${circuit.voltage_type} / ${circuit.load_current_a}A)`}
                    extra={
                      <Space size="small">
                        <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={() => {
                          setActiveRoom(room.id);
                          setActiveCircuit(circuit.id);
                          setSegmentEdit(null);
                          setSegmentModal(true);
                        }}>{t('circuit.btnAddSegment')}</Button>
                        <Button size="small" onClick={() => {
                          setActiveRoom(room.id);
                          setCircuitEdit(circuit);
                          setCircuitModal(true);
                        }}>{t('circuit.btnEdit')}</Button>
                        <Popconfirm title={t('circuit.deleteConfirmShort')} onConfirm={() => deleteCircuit(circuit.id)}>
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    }
                    style={{ marginBottom: 8, marginLeft: 16 }}
                  >
                    {/* Segments */}
                    {(!circuit.segments || circuit.segments.length === 0) ? (
                      <Empty description={t('segment.emptyHint')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                      circuit.segments.map(seg => (
                        <div key={seg.id} style={{ marginBottom: 8, marginLeft: 24, padding: '8px 12px', border: '1px solid #f0f0f0', borderRadius: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <Space>
                              <Tag>{seg.segment_type}</Tag>
                              <strong>{seg.cable_model || '?'}</strong>
                              <span>{seg.cross_section_mm2}mm²</span>
                              <span>{seg.length_m}m</span>
                              {seg.parallel_count > 1 && <Tag color="blue">×{seg.parallel_count}{t('segment.types.parallel')}</Tag>}
                            </Space>
                            <Space size="small">
                              <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={() => {
                                setActiveRoom(room.id);
                                setActiveCircuit(circuit.id);
                                setActiveSegment(seg.id);
                                setDeviceEdit(null);
                                setDeviceModal(true);
                              }}>{t('segment.btnAddDevice')}</Button>
                              <Button size="small" onClick={() => {
                                setActiveRoom(room.id);
                                setActiveCircuit(circuit.id);
                                setSegmentEdit(seg);
                                setSegmentModal(true);
                              }}>{t('segment.btnEdit')}</Button>
                              <Popconfirm title={t('segment.deleteConfirmShort')} onConfirm={() => deleteSegment(seg.id)}>
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
