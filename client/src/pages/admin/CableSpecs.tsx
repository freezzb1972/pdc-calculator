import { useEffect, useState, useRef, useMemo } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import type { CableSpec } from '../../types';
import { useAppTranslation } from '../../i18n/useAppTranslation';
import BilingualText from '../../i18n/BilingualText';

export default function CableSpecs() {
  const { t } = useAppTranslation('cableSpecs');
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
      message.success(t('messages.updated'));
    } else {
      await api.createCable(values);
      message.success(t('messages.created'));
    }
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
    load();
  };

  const handleDelete = async (id: number) => {
    await api.deleteCable(id);
    message.success(t('messages.deleted'));
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
      message.success(t('messages.importSuccess'));
      load();
    } catch {
      message.error(t('messages.importFailed'));
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const columns = [
    { title: <BilingualText textKey="columns.model" ns="cableSpecs" />, dataIndex: 'model_name', key: 'model_name' },
    { title: <BilingualText textKey="columns.conductor" ns="cableSpecs" />, dataIndex: 'conductor_material', key: 'conductor_material' },
    { title: <BilingualText textKey="columns.insulation" ns="cableSpecs" />, dataIndex: 'insulation', key: 'insulation' },
    { title: <BilingualText textKey="columns.crossSection" ns="cableSpecs" />, dataIndex: 'cross_section_mm2', key: 'cross_section_mm2' },
    { title: <BilingualText textKey="columns.cores" ns="cableSpecs" />, dataIndex: 'core_count', key: 'core_count' },
    { title: <BilingualText textKey="columns.ampacity" ns="cableSpecs" />, dataIndex: 'max_current_a', key: 'max_current_a' },
    { title: <BilingualText textKey="columns.unitPrice" ns="cableSpecs" />, dataIndex: 'unit_price', key: 'unit_price', render: (v: number) => v?.toFixed(2) },
    {
      title: <BilingualText textKey="columns.actions" ns="cableSpecs" />, key: 'action', width: 100,
      render: (_: any, row: CableSpec) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditing(row);
            form.setFieldsValue(row);
            setModalOpen(true);
          }} />
          <Popconfirm title={t('deleteConfirm')} onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={t('title')}
      extra={
        <Space>
          <Input
            placeholder={t('searchPlaceholder')}
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 200 }}
          />
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          <Button icon={<DownloadOutlined />} onClick={handleExport}>{t('btnExport')}</Button>
          <Button icon={<UploadOutlined />} onClick={() => fileRef.current?.click()}>{t('btnImport')}</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditing(null);
            form.resetFields();
            setModalOpen(true);
          }}>{t('btnAdd')}</Button>
        </Space>
      }
    >
      <Table rowKey="id" columns={columns} dataSource={filtered} loading={loading} size="small" pagination={false} />

      <Modal title={editing ? t('modalEdit') : t('modalNew')} open={modalOpen} onOk={handleSave} onCancel={() => { setModalOpen(false); setEditing(null); }} width={520}>
        <Form form={form} layout="vertical">
          <Form.Item name="model_name" label={t('form.model')} rules={[{ required: true }]}><Input /></Form.Item>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="conductor_material" label={t('form.conductor')}><Input style={{ width: 180 }} /></Form.Item>
            <Form.Item name="insulation" label={t('form.insulation')}><Input style={{ width: 180 }} /></Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="cross_section_mm2" label={t('form.crossSection')} rules={[{ required: true }]}><InputNumber style={{ width: 160 }} /></Form.Item>
            <Form.Item name="core_count" label={t('form.cores')}><InputNumber style={{ width: 160 }} /></Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="max_current_a" label={t('form.ampacity')} rules={[{ required: true }]}><InputNumber style={{ width: 160 }} /></Form.Item>
            <Form.Item name="unit_price" label={t('form.unitPrice')}><InputNumber style={{ width: 160 }} precision={2} /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}
