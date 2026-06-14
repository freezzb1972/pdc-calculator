import { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, Select, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import { useAppTranslation } from '../../i18n/useAppTranslation';
import BilingualText from '../../i18n/BilingualText';

interface Rule {
  id: number;
  phases: string;
  filter_current_min: number | null;
  filter_current_max: number | null;
  min_cross_section_mm2: number | null;
  recommended_cable_id: number | null;
  cable_model: string | null;
  cable_section: number | null;
  max_current_a: number | null;
  connector_type: string;
  notes: string;
}

export default function SelectionRules() {
  const { t } = useAppTranslation('selectionRules');
  const [data, setData] = useState<Rule[]>([]);
  const [cables, setCables] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [rules, cableList] = await Promise.all([
        api.getSelectionRules(),
        api.getCables(),
      ]);
      setData(rules);
      setCables(cableList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await api.updateSelectionRule(editing.id, values);
      message.success(t('messages.updated'));
    } else {
      await api.createSelectionRule(values);
      message.success(t('messages.created'));
    }
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
    load();
  };

  const handleDelete = async (id: number) => {
    await api.deleteSelectionRule(id);
    message.success(t('messages.deleted'));
    load();
  };

  const phaseColor: Record<string, string> = { '单相': 'blue', '三相': 'geekblue', '直流': 'purple', '通用': 'green' };

  const columns = [
    { title: <BilingualText textKey="columns.phase" ns="selectionRules" />, dataIndex: 'phases', key: 'phases', width: 70, render: (v: string) => <Tag color={phaseColor[v]}>{v}</Tag> },
    { title: <BilingualText textKey="columns.minCurrent" ns="selectionRules" />, dataIndex: 'filter_current_min', key: 'filter_current_min', width: 100, render: (v: number | null) => v ?? '-' },
    { title: <BilingualText textKey="columns.maxCurrent" ns="selectionRules" />, dataIndex: 'filter_current_max', key: 'filter_current_max', width: 100, render: (v: number | null) => v ?? '-' },
    { title: <BilingualText textKey="columns.minCrossSection" ns="selectionRules" />, dataIndex: 'min_cross_section_mm2', key: 'min_cross_section_mm2', width: 100, render: (v: number | null) => v ?? '-' },
    { title: <BilingualText textKey="columns.recommendedCable" ns="selectionRules" />, key: 'cable', width: 200, render: (_: any, r: Rule) => r.cable_model ? `${r.cable_model} (${r.cable_section}mm²/${r.max_current_a}A)` : '-' },
    { title: <BilingualText textKey="columns.connector" ns="selectionRules" />, dataIndex: 'connector_type', key: 'connector_type', width: 90 },
    { title: <BilingualText textKey="columns.notes" ns="selectionRules" />, dataIndex: 'notes', key: 'notes', ellipsis: true },
    {
      title: <BilingualText textKey="columns.actions" ns="selectionRules" />, key: 'action', width: 100,
      render: (_: any, row: Rule) => (
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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditing(null);
          form.resetFields();
          form.setFieldsValue({ phases: '单相' });
          setModalOpen(true);
        }}>{t('btnAdd')}</Button>
      }
    >
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} size="small" pagination={false} />

      <Modal title={editing ? t('modalEdit') : t('modalNew')} open={modalOpen} onOk={handleSave} onCancel={() => { setModalOpen(false); setEditing(null); }} width={560}>
        <Form form={form} layout="vertical">
          <Form.Item name="phases" label={t('form.phase')} rules={[{ required: true }]}>
            <Select options={[
              { value: '单相', label: t('phaseOptions.single') },
              { value: '三相', label: t('phaseOptions.three') },
              { value: '直流', label: t('phaseOptions.dc') },
              { value: '通用', label: t('phaseOptions.universal') },
            ]} />
          </Form.Item>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="filter_current_min" label={t('form.minCurrent')}><InputNumber style={{ width: 160 }} step={1} /></Form.Item>
            <Form.Item name="filter_current_max" label={t('form.maxCurrent')}><InputNumber style={{ width: 160 }} step={1} /></Form.Item>
          </Space>
          <Form.Item name="recommended_cable_id" label={t('form.recommendedCable')} rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder={t('form.cablePlaceholder')}
              filterOption={(input, option) => (option?.label as string || '').includes(input)}
              options={cables.map(c => ({
                value: c.id,
                label: `${c.model_name} (${c.cross_section_mm2}mm²/${c.max_current_a}A) ¥${c.unit_price}/m`,
              }))}
            />
          </Form.Item>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="min_cross_section_mm2" label={t('form.minCrossSection')}><InputNumber style={{ width: 160 }} step={0.5} /></Form.Item>
            <Form.Item name="connector_type" label={t('form.connector')}><Input style={{ width: 200 }} /></Form.Item>
          </Space>
          <Form.Item name="notes" label={t('form.notes')}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
