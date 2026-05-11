import { useEffect, useState, useRef } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, Select, message, Popconfirm, Upload } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import type { Filter } from '../../types';

export default function FilterLibrary() {
  const [data, setData] = useState<Filter[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Filter | null>(null);
  const [form] = Form.useForm();
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      setData(await api.getFilters());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await api.updateFilter(editing.id, values);
      message.success('已更新');
    } else {
      await api.createFilter(values);
      message.success('已创建');
    }
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
    load();
  };

  const handleDelete = async (id: number) => {
    await api.deleteFilter(id);
    message.success('已删除');
    load();
  };

  const handleExport = async () => {
    try {
      const filters = await api.exportFilters();
      const blob = new Blob([JSON.stringify(filters, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'filters-export.json';
      a.click();
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.importFilters(data);
      message.success('导入成功');
      load();
    } catch {
      message.error('导入失败，请检查文件格式');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const columns = [
    { title: '型号', dataIndex: 'model_name', key: 'model_name' },
    { title: '厂商', dataIndex: 'manufacturer', key: 'manufacturer' },
    { title: '电压(V)', dataIndex: 'voltage_rating_v', key: 'voltage_rating_v' },
    { title: '电流(A)', dataIndex: 'current_rating_a', key: 'current_rating_a' },
    { title: '相数', dataIndex: 'phases', key: 'phases' },
    { title: '线数', dataIndex: 'wire_count', key: 'wire_count' },
    { title: '尺寸', dataIndex: 'dimensions', key: 'dimensions' },
    { title: '单价(¥)', dataIndex: 'unit_price', key: 'unit_price', render: (v: number) => v?.toFixed(2) },
    { title: '类别', dataIndex: 'category', key: 'category' },
    {
      title: '操作', key: 'action', width: 120,
      render: (_: any, row: Filter) => (
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
      title="滤波器库"
      extra={
        <Space>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          <Button icon={<UploadOutlined />} onClick={() => fileRef.current?.click()}>批量导入</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>导出</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditing(null);
            form.resetFields();
            setModalOpen(true);
          }}>新增</Button>
        </Space>
      }
    >
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} size="small" pagination={{ pageSize: 50 }} />

      <Modal title={editing ? '编辑滤波器' : '新增滤波器'} open={modalOpen} onOk={handleSave} onCancel={() => { setModalOpen(false); setEditing(null); }} width={640}>
        <Form form={form} layout="vertical">
          <Form.Item name="model_name" label="型号" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="manufacturer" label="厂商"><Input /></Form.Item>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="voltage_rating_v" label="电压(V)" rules={[{ required: true }]}><InputNumber style={{ width: 140 }} /></Form.Item>
            <Form.Item name="current_rating_a" label="电流(A)" rules={[{ required: true }]}><InputNumber style={{ width: 140 }} /></Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="phases" label="相数"><Select style={{ width: 140 }} options={[{ value: '单相' }, { value: '三相' }, { value: '直流' }]} /></Form.Item>
            <Form.Item name="wire_count" label="线数"><InputNumber style={{ width: 140 }} /></Form.Item>
          </Space>
          <Form.Item name="dimensions" label="尺寸"><Input placeholder="如 300×200×100" /></Form.Item>
          <Form.Item name="unit_price" label="单价(¥)"><InputNumber style={{ width: 200 }} precision={2} /></Form.Item>
          <Form.Item name="category" label="类别"><Input placeholder="如 暗室/功放/传导" /></Form.Item>
          <Form.Item name="notes" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
