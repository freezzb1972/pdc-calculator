import { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import { useAppTranslation } from '../../i18n/useAppTranslation';
import BilingualText from '../../i18n/BilingualText';

interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
  created_at: string;
}

export default function UserManage() {
  const { t } = useAppTranslation('userManage');
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
      message.success(t('messages.userCreated'));
      setCreateOpen(false);
      createForm.resetFields();
      load();
    } catch (e: any) {
      message.error(e.message || t('messages.createFailed'));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteUser(id);
      message.success(t('messages.deleted'));
      load();
    } catch (e: any) {
      message.error(e.message || t('messages.deleteFailed'));
    }
  };

  const handleChangePassword = async () => {
    if (!passwordUserId) return;
    const values = await passwordForm.validateFields();
    try {
      await api.changePassword(passwordUserId, values.password);
      message.success(t('messages.passwordChanged'));
      setPasswordOpen(false);
      setPasswordUserId(null);
      passwordForm.resetFields();
    } catch (e: any) {
      message.error(e.message || t('messages.modifyFailed'));
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: <BilingualText textKey="columns.username" ns="userManage" />, dataIndex: 'username', key: 'username' },
    { title: <BilingualText textKey="columns.displayName" ns="userManage" />, dataIndex: 'display_name', key: 'display_name' },
    { title: <BilingualText textKey="columns.role" ns="userManage" />, dataIndex: 'role', key: 'role', width: 80,
      render: (v: string) => <Tag color={v === 'admin' ? 'red' : 'blue'}>{v === 'admin' ? t('roles.admin') : t('roles.editor')}</Tag>,
    },
    { title: <BilingualText textKey="columns.createdAt" ns="userManage" />, dataIndex: 'created_at', key: 'created_at', render: (v: string) => v?.slice(0, 19) },
    {
      title: <BilingualText textKey="columns.actions" ns="userManage" />, key: 'action', width: 140,
      render: (_: any, row: User) => (
        <Space>
          <Button size="small" icon={<LockOutlined />} onClick={() => {
            setPasswordUserId(row.id);
            setPasswordOpen(true);
          }}>{t('actions.changePassword')}</Button>
          {row.id !== 1 && (
            <Popconfirm title={t('actions.deleteConfirm')} onConfirm={() => handleDelete(row.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={t('title')}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateOpen(true); createForm.resetFields(); }}>
          {t('btnAdd')}
        </Button>
      }
    >
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} size="small" pagination={false} />

      <Modal title={t('createModal.title')} open={createOpen} onOk={handleCreate} onCancel={() => setCreateOpen(false)}>
        <Form form={createForm} layout="vertical">
          <Form.Item name="username" label={t('createModal.username')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label={t('createModal.password')} rules={[{ required: true, min: 6, message: t('changePasswordModal.passwordMinLength') }]}><Input.Password /></Form.Item>
          <Form.Item name="display_name" label={t('createModal.displayName')}><Input /></Form.Item>
          <Form.Item name="role" label={t('createModal.role')}>
            <Select options={[
              { value: 'editor', label: t('roles.editor') },
              { value: 'admin', label: t('roles.admin') },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={t('changePasswordModal.title')} open={passwordOpen} onOk={handleChangePassword} onCancel={() => { setPasswordOpen(false); setPasswordUserId(null); }}>
        <Form form={passwordForm} layout="vertical">
          <Form.Item name="password" label={t('changePasswordModal.newPassword')} rules={[{ required: true, min: 6, message: t('changePasswordModal.passwordMinLength') }]}><Input.Password /></Form.Item>
          <Form.Item name="confirm" label={t('changePasswordModal.confirmPassword')} dependencies={['password']} rules={[
            { required: true },
            ({ getFieldValue }) => ({
              validator(_, value) { if (!value || getFieldValue('password') === value) return Promise.resolve(); return Promise.reject(new Error(t('changePasswordModal.passwordMismatch'))); },
            }),
          ]}><Input.Password /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
