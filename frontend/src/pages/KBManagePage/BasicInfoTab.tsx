import { useState } from 'react';
import { Card, Input, Button, Typography, Space, Popconfirm } from 'antd';

const { Text } = Typography;

interface KBFormData {
  id: number;
  name: string;
  description: string;
  created_at: string;
  docCount: number;
  chunkCount: number;
}

interface Props {
  kb: KBFormData;
  onSave: (name: string, desc: string) => void;
  onDelete: () => void;
}

export default function BasicInfoTab({ kb, onSave, onDelete }: Props) {
  const [name, setName] = useState(kb.name);
  const [desc, setDesc] = useState(kb.description);

  return (
    <Card title="基础信息" style={{ borderRadius: 12 }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Text strong style={{ width: 80, flexShrink: 0 }}>名称</Text>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Text strong style={{ width: 80, flexShrink: 0, paddingTop: 5 }}>描述</Text>
          <Input.TextArea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Text strong style={{ width: 80, flexShrink: 0 }}>创建时间</Text>
          <Input value={kb.created_at} readOnly />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>文档数</Text>
            <Input value={kb.docCount} readOnly />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>切片数</Text>
            <Input value={kb.chunkCount} readOnly />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          <Button type="primary" onClick={() => { onSave(name, desc); }}>
            保存
          </Button>
          <Popconfirm title="确定删除知识库？此操作不可撤销" onConfirm={onDelete}>
            <Button danger>删除知识库</Button>
          </Popconfirm>
        </div>
      </Space>
    </Card>
  );
}
