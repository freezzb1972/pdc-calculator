import { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import { api } from '../../api/client';

interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
  created_at: string;
}

export default function UserManage() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<number | null>(null);
  const [createForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      setData(await api.getUsers());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const values = await createForm.validateFields();
    try {
      await api.createUser(values);
      message.success('用户已创建');
      setCreateOpen(false);
      createForm.resetFields();
      load();
    } catch (e: any) {
      message.error(e.message || '创建失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteUser(id);
      message.success('已删除');
      load();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordUserId) return;
    const values = await passwordForm.validateFields();
    try {
      await api.changePassword(passwordUserId, values.password);
      message.success('密码已修改');
      setPasswordOpen(false);
      setPasswordUserId(null);
      passwordForm.resetFields();
    } catch (e: any) {
      message.error(e.message || '修改失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '显示名', dataIndex: 'display_name', key: 'display_name' },
    { title: '角色', dataIndex: 'role', key: 'role', width: 80, render: (v: string) => <Tag color={v === 'admin' ? 'red' : 'blue'}>{v === 'admin' ? '管理员' : '编辑'}</Tag> },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v?.slice(0, 19) },
    {
      title: '操作', key: 'action', width: 140,
      render: (_: any, row: User) => (
        <Space>
          <Button size="small" icon={<LockOutlined />} onClick={() => {
            setPasswordUserId(row.id);
            setPasswordOpen(true);
          }}>改密</Button>
          {row.id !== 1 && (
            <Popconfirm title="确定删除该用户？" onConfirm={() => handleDelete(row.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="用户管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateOpen(true); createForm.resetFields(); }}>
          新增用户
        </Button>
      }
    >
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} size="small" pagination={false} />

      <Modal title="新增用户" open={createOpen} onOk={handleCreate} onCancel={() => setCreateOpen(false)}>
        <Form form={createForm} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, min: 6, message: '密码至少6位' }]}><Input.Password /></Form.Item>
          <Form.Item name="display_name" label="显示名"><Input /></Form.Item>
          <Form.Item name="role" label="角色">
            <Select options={[
              { value: 'editor', label: '编辑者' },
              { value: 'admin', label: '管理员' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="修改密码" open={passwordOpen} onOk={handleChangePassword} onCancel={() => { setPasswordOpen(false); setPasswordUserId(null); }}>
        <Form form={passwordForm} layout="vertical">
          <Form.Item name="password" label="新密码" rules={[{ required: true, min: 6, message: '密码至少6位' }]}><Input.Password /></Form.Item>
          <Form.Item name="confirm" label="确认密码" dependencies={['password']} rules={[
            { required: true },
            ({ getFieldValue }) => ({
              validator(_, value) { if (!value || getFieldValue('password') === value) return Promise.resolve(); return Promise.reject(new Error('两次密码不一致')); },
            }),
          ]}><Input.Password /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
