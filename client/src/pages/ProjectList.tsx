import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Space, Modal, Form, Input, message, Popconfirm, Row, Col, Statistic } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined, TeamOutlined, ThunderboltOutlined, DollarOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import type { Project } from '../types';
import { useAppTranslation } from '../i18n/useAppTranslation';
import BilingualText from '../i18n/BilingualText';

export default function ProjectList() {
  const { t } = useAppTranslation('projects');
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [stats, setStats] = useState({ rooms: 0, filterCount: 0, cableCount: 0 });
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.getProjects();
      setProjects(list);

      // Load stats
      let rooms = 0;
      for (const p of list) {
        const detail = await api.getProject(p.id);
        rooms += ((detail as any).rooms || []).length;
      }
      const [filters, cables] = await Promise.all([
        api.getFilters().catch(() => []),
        api.getCables().catch(() => []),
      ]);
      setStats({ rooms, filterCount: filters.length, cableCount: cables.length });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await api.updateProject(editing.id, values);
      message.success(t('msgUpdated'));
    } else {
      await api.createProject(values);
      message.success(t('msgCreated'));
    }
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
    load();
  };

  const handleDelete = async (id: number) => {
    await api.deleteProject(id);
    message.success(t('msgDeleted'));
    load();
  };

  const columns = [
    { title: <BilingualText textKey="columns.name" ns="projects" />, dataIndex: 'name', key: 'name' },
    { title: <BilingualText textKey="columns.description" ns="projects" />, dataIndex: 'description', key: 'description', ellipsis: true },
    { title: <BilingualText textKey="columns.createdAt" ns="projects" />, dataIndex: 'created_at', key: 'created_at', render: (v: string) => v?.slice(0, 10) },
    {
      title: <BilingualText textKey="columns.actions" ns="projects" />,
      key: 'action',
      render: (_: any, row: Project) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditing(row);
            form.setFieldsValue(row);
            setModalOpen(true);
          }}>{t('btnEdit')}</Button>
          <Button size="small" type="primary" onClick={() => navigate(`/projects/${row.id}`)}>{t('btnConfigure')}</Button>
          <Button size="small" onClick={() => navigate(`/projects/${row.id}/bom`)}>BOM</Button>
          <Popconfirm title={t('deleteConfirm')} onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title={<BilingualText textKey="stats.projectCount" ns="projects" />} value={projects.length} prefix={<FolderOutlined />} suffix={t('units.piece', { ns: 'common' })} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title={<BilingualText textKey="stats.roomCount" ns="projects" />} value={stats.rooms} prefix={<TeamOutlined />} suffix={t('units.room', { ns: 'common' })} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title={<BilingualText textKey="stats.filterCount" ns="projects" />} value={stats.filterCount} prefix={<ThunderboltOutlined />} suffix={t('units.kind', { ns: 'common' })} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title={<BilingualText textKey="stats.cableCount" ns="projects" />} value={stats.cableCount} prefix={<DollarOutlined />} suffix={t('units.kind', { ns: 'common' })} />
          </Card>
        </Col>
      </Row>

      <Card
        title={<BilingualText textKey="title" ns="projects" />}
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              setEditing(null);
              form.resetFields();
              setModalOpen(true);
            }}>{t('btnNew')}</Button>
          </Space>
        }
      >
        <Table rowKey="id" columns={columns} dataSource={projects} loading={loading} pagination={false} />
      </Card>

      <Modal
        title={editing ? t('modalEdit') : t('modalNew')}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('labelName')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('labelDescription')}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
