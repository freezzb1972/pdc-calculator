import { useEffect, useState, useRef } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import type { Filter } from '../../types';
import { useAppTranslation } from '../../i18n/useAppTranslation';
import BilingualText from '../../i18n/BilingualText';

export default function FilterLibrary() {
  const { t } = useAppTranslation('filterLibrary');
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
      message.success(t('messages.updated'));
    } else {
      await api.createFilter(values);
      message.success(t('messages.created'));
    }
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
    load();
  };

  const handleDelete = async (id: number) => {
    await api.deleteFilter(id);
    message.success(t('messages.deleted'));
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
      message.success(t('messages.exportSuccess'));
    } catch {
      message.error(t('messages.exportFailed'));
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await api.importFilters(data);
      message.success(t('messages.importSuccess'));
      load();
    } catch {
      message.error(t('messages.importFailed'));
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const columns = [
    { title: <BilingualText textKey="columns.model" ns="filterLibrary" />, dataIndex: 'model_name', key: 'model_name' },
    { title: <BilingualText textKey="columns.vendor" ns="filterLibrary" />, dataIndex: 'manufacturer', key: 'manufacturer' },
    { title: <BilingualText textKey="columns.voltage" ns="filterLibrary" />, dataIndex: 'voltage_rating_v', key: 'voltage_rating_v' },
    { title: <BilingualText textKey="columns.current" ns="filterLibrary" />, dataIndex: 'current_rating_a', key: 'current_rating_a' },
    { title: <BilingualText textKey="columns.phase" ns="filterLibrary" />, dataIndex: 'phases', key: 'phases' },
    { title: <BilingualText textKey="columns.lines" ns="filterLibrary" />, dataIndex: 'wire_count', key: 'wire_count' },
    { title: <BilingualText textKey="columns.dimensions" ns="filterLibrary" />, dataIndex: 'dimensions', key: 'dimensions' },
    { title: <BilingualText textKey="columns.unitPrice" ns="filterLibrary" />, dataIndex: 'unit_price', key: 'unit_price', render: (v: number) => v?.toFixed(2) },
    { title: <BilingualText textKey="columns.category" ns="filterLibrary" />, dataIndex: 'category', key: 'category' },
    {
      title: <BilingualText textKey="columns.actions" ns="filterLibrary" />, key: 'action', width: 120,
      render: (_: any, row: Filter) => (
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
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          <Button icon={<UploadOutlined />} onClick={() => fileRef.current?.click()}>{t('btnImport')}</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>{t('btnExport')}</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditing(null);
            form.resetFields();
            setModalOpen(true);
          }}>{t('btnAdd')}</Button>
        </Space>
      }
    >
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} size="small" pagination={{ pageSize: 50 }} />

      <Modal title={editing ? t('modalEdit') : t('modalNew')} open={modalOpen} onOk={handleSave} onCancel={() => { setModalOpen(false); setEditing(null); }} width={640}>
        <Form form={form} layout="vertical">
          <Form.Item name="model_name" label={t('form.model')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="manufacturer" label={t('form.vendor')}><Input /></Form.Item>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="voltage_rating_v" label={t('form.voltage')} rules={[{ required: true }]}><InputNumber style={{ width: 140 }} /></Form.Item>
            <Form.Item name="current_rating_a" label={t('form.current')} rules={[{ required: true }]}><InputNumber style={{ width: 140 }} /></Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="phases" label={t('form.phase')}><Select style={{ width: 140 }} options={[
              { value: '单相', label: t('phaseOptions.single') },
              { value: '三相', label: t('phaseOptions.three') },
              { value: '直流', label: t('phaseOptions.dc') },
            ]} /></Form.Item>
            <Form.Item name="wire_count" label={t('form.lines')}><InputNumber style={{ width: 140 }} /></Form.Item>
          </Space>
          <Form.Item name="dimensions" label={t('form.dimensions')}><Input placeholder={t('form.dimensionsPlaceholder')} /></Form.Item>
          <Form.Item name="unit_price" label={t('form.unitPrice')}><InputNumber style={{ width: 200 }} precision={2} /></Form.Item>
          <Form.Item name="category" label={t('form.category')}><Input placeholder={t('form.categoryPlaceholder')} /></Form.Item>
          <Form.Item name="notes" label={t('form.notes')}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
