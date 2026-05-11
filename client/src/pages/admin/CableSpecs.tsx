import { useEffect, useState, useRef, useMemo } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import type { CableSpec } from '../../types';

export default function CableSpecs() {
  const [data, setData] = useState<CableSpec[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CableSpec | null>(null);
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(c =>
      c.model_name?.toLowerCase().includes(q) ||
      c.conductor_material?.toLowerCase().includes(q) ||
      c.insulation?.toLowerCase().includes(q)
    );
  }, [data, search]);

  const load = async () => {
    setLoading(true);
    try {
      setData(await api.getCables());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await api.updateCable(editing.id, values);
      message.success('已更新');
    } else {
      await api.createCable(values);
      message.success('已创建');
    }
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
    load();
  };

  const handleDelete = async (id: number) => {
    await api.deleteCable(id);
    message.success('已删除');
    load();
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cables-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.importCables(data);
      message.success('导入成功');
      load();
    } catch {
      message.error('导入失败');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const columns = [
    { title: '型号', dataIndex: 'model_name', key: 'model_name' },
    { title: '导体', dataIndex: 'conductor_material', key: 'conductor_material' },
    { title: '绝缘', dataIndex: 'insulation', key: 'insulation' },
    { title: '截面(mm²)', dataIndex: 'cross_section_mm2', key: 'cross_section_mm2' },
    { title: '芯数', dataIndex: 'core_count', key: 'core_count' },
    { title: '载流量(A)', dataIndex: 'max_current_a', key: 'max_current_a' },
    { title: '单价(¥/m)', dataIndex: 'unit_price', key: 'unit_price', render: (v: number) => v?.toFixed(2) },
    {
      title: '操作', key: 'action', width: 100,
      render: (_: any, row: CableSpec) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditing(row);
            form.setFieldsValue(row);
            setModalOpen(true);
          }} />
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="电缆规格"
      extra={
        <Space>
          <Input
            placeholder="搜索型号/导体/绝缘"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 200 }}
          />
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          <Button icon={<DownloadOutlined />} onClick={handleExport}>导出</Button>
          <Button icon={<UploadOutlined />} onClick={() => fileRef.current?.click()}>批量导入</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditing(null);
            form.resetFields();
            setModalOpen(true);
          }}>新增</Button>
        </Space>
      }
    >
      <Table rowKey="id" columns={columns} dataSource={filtered} loading={loading} size="small" pagination={false} />

      <Modal title={editing ? '编辑电缆' : '新增电缆'} open={modalOpen} onOk={handleSave} onCancel={() => { setModalOpen(false); setEditing(null); }} width={520}>
        <Form form={form} layout="vertical">
          <Form.Item name="model_name" label="型号" rules={[{ required: true }]}><Input /></Form.Item>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="conductor_material" label="导体材料"><Input style={{ width: 180 }} /></Form.Item>
            <Form.Item name="insulation" label="绝缘"><Input style={{ width: 180 }} /></Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="cross_section_mm2" label="截面(mm²)" rules={[{ required: true }]}><InputNumber style={{ width: 160 }} /></Form.Item>
            <Form.Item name="core_count" label="芯数"><InputNumber style={{ width: 160 }} /></Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="max_current_a" label="载流量(A)" rules={[{ required: true }]}><InputNumber style={{ width: 160 }} /></Form.Item>
            <Form.Item name="unit_price" label="单价(¥/m)"><InputNumber style={{ width: 160 }} precision={2} /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}
