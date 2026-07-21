import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Tag, Typography, Modal, Input, Select, Popconfirm, message, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { listUsers, createUser, deleteUser, type UserItem } from '../api/admin';

const { Text } = Typography;

export default function UserManagePage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [creating, setCreating] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await listUsers());
    } catch {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      message.error('请填写用户名和密码');
      return;
    }
    setCreating(true);
    try {
      await createUser(newUsername.trim(), newPassword, newRole);
      message.success('用户创建成功');
      setShowModal(false);
      setNewUsername('');
      setNewPassword('');
      fetchUsers();
    } catch {
      message.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteUser(id);
      message.success('用户已删除');
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 120,
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>{role === 'admin' ? '管理员' : '普通用户'}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 200,
      render: (time: string) => <Text type="secondary">{time}</Text>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: UserItem) =>
        record.username === 'admin' ? (
          <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
        ) : (
          <Popconfirm title={`确定删除用户「${record.username}」吗？`} onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: 600 }}>用户管理</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>新建用户</Button>
      </div>
      <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
        <Table columns={columns} dataSource={users} rowKey="id" pagination={false} size="middle" loading={loading} />
      </Card>

      <Modal
        title="新建用户"
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={handleCreate}
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
      >
        <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 8 }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>用户名 *</Text>
            <Input placeholder="请输入用户名" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>密码 *</Text>
            <Input.Password placeholder="请输入密码" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>角色</Text>
            <Select value={newRole} onChange={setNewRole} style={{ width: '100%' }}>
              <Select.Option value="user">普通用户</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
            </Select>
          </div>
        </Space>
      </Modal>
    </div>
  );
}
