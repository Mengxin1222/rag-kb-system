import { useState } from 'react';
import { Card, Table, Button, Tag, Typography, Modal, Input, Select, Popconfirm, message, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UserRecord } from '../types';

const { Text } = Typography;

const mockUsers: UserRecord[] = [
  { id: 1, username: 'admin', role: 'admin', created_at: '2025-01-01 10:00' },
  { id: 2, username: 'zhangsan', role: 'user', created_at: '2025-06-15 14:30' },
  { id: 3, username: 'lisi', role: 'user', created_at: '2025-07-01 09:15' },
  { id: 4, username: 'wangwu', role: 'user', created_at: '2025-07-10 16:00' },
];

export default function UserManagePage() {
  const [users, setUsers] = useState<UserRecord[]>(mockUsers);
  const [showModal, setShowModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');

  const createUser = () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      message.error('请填写用户名和密码');
      return;
    }
    const newUser: UserRecord = {
      id: Date.now(),
      username: newUsername.trim(),
      role: newRole,
      created_at: new Date().toLocaleString('zh-CN'),
    };
    setUsers((prev) => [...prev, newUser]);
    setShowModal(false);
    setNewUsername('');
    setNewPassword('');
    message.success(`用户 ${newUser.username} 创建成功`);
  };

  const deleteUser = (id: number) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    message.success('用户已删除');
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
      render: (_: unknown, record: UserRecord) =>
        record.username === 'admin' ? (
          <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
        ) : (
          <Popconfirm title={`确定删除用户「${record.username}」吗？`} onConfirm={() => deleteUser(record.id)}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: 600 }}>用户管理</Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
          新建用户
        </Button>
      </div>
      <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
        <Table columns={columns} dataSource={users} rowKey="id" pagination={false} size="middle" />
      </Card>

      <Modal
        title="新建用户"
        open={showModal}
        onCancel={() => setShowModal(false)}
        onOk={createUser}
        okText="创建"
        cancelText="取消"
      >
        <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 8 }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
              用户名 *
            </Text>
            <Input placeholder="请输入用户名" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
              密码 *
            </Text>
            <Input.Password placeholder="请输入密码" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
              角色
            </Text>
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
