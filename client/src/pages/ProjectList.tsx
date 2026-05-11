import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Space, Modal, Form, Input, message, Popconfirm, Row, Col, Statistic } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined, TeamOutlined, ThunderboltOutlined, DollarOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import type { Project } from '../types';

export default function ProjectList() {
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
      message.success('已更新');
    } else {
      await api.createProject(values);
      message.success('已创建');
    }
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
    load();
  };

  const handleDelete = async (id: number) => {
    await api.deleteProject(id);
    message.success('已删除');
    load();
  };

  const columns = [
    { title: '项目名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v?.slice(0, 10) },
    {
      title: '操作', key: 'action',
      render: (_: any, row: Project) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditing(row);
            form.setFieldsValue(row);
            setModalOpen(true);
          }}>编辑</Button>
          <Button size="small" type="primary" onClick={() => navigate(`/projects/${row.id}`)}>配置</Button>
          <Button size="small" onClick={() => navigate(`/projects/${row.id}/bom`)}>BOM</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Dashboard stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="项目总数" value={projects.length} prefix={<FolderOutlined />} suffix="个" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="房间总数" value={stats.rooms} prefix={<TeamOutlined />} suffix="间" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="滤波器" value={stats.filterCount} prefix={<ThunderboltOutlined />} suffix="种" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="电缆规格" value={stats.cableCount} prefix={<DollarOutlined />} suffix="种" />
          </Card>
        </Col>
      </Row>

      <Card
        title="项目管理"
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              setEditing(null);
              form.resetFields();
              setModalOpen(true);
            }}>新建项目</Button>
          </Space>
        }
      >
        <Table rowKey="id" columns={columns} dataSource={projects} loading={loading} pagination={false} />
      </Card>

      <Modal
        title={editing ? '编辑项目' : '新建项目'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="项目名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
