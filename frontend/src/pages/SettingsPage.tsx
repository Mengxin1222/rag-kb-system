import { useState, useEffect } from 'react';
import { Card, Input, Button, Typography, message, Space, Divider } from 'antd';
import { SaveOutlined, ApiOutlined } from '@ant-design/icons';
import client from '../api/client';

const { Text, Title } = Typography;

interface ServiceConfig {
  api_url: string;
  api_key: string;
}

interface SettingsData {
  llm: ServiceConfig;
  embedding: ServiceConfig;
  rerank: ServiceConfig;
  mineru: ServiceConfig;
}

const defaultSettings: SettingsData = {
  llm: { api_url: 'https://api.deepseek.com/v1/chat/completions', api_key: '' },
  embedding: { api_url: '', api_key: '' },
  rerank: { api_url: '', api_key: '' },
  mineru: { api_url: '', api_key: '' },
};

const serviceLabels: Record<string, string> = {
  llm: 'LLM 大语言模型',
  embedding: 'Embedding 词嵌入',
  rerank: 'Rerank 重排序',
  mineru: 'MinerU 文档解析',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    client.get('/api/admin/settings')
      .then((res) => setSettings(res.data))
      .catch(() => message.error('获取配置失败'))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (service: keyof SettingsData, field: keyof ServiceConfig, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [service]: { ...prev[service], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const resp = await client.put('/api/admin/settings', settings);
      setSettings(resp.data);
      message.success('配置已保存，重启服务后生效');
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <ApiOutlined /> 模型配置
        </Title>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
          保存配置
        </Button>
      </div>

      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        配置各个服务的 API 地址和密钥。保存后需重启后端服务生效。
      </Text>

      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        {(Object.keys(serviceLabels) as (keyof SettingsData)[]).map((key) => (
          <Card
            key={key}
            title={serviceLabels[key]}
            loading={loading}
            style={{ borderRadius: 12 }}
          >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
                  API 地址
                </Text>
                <Input
                  value={settings[key]?.api_url || ''}
                  onChange={(e) => updateField(key, 'api_url', e.target.value)}
                  placeholder={`请输入 ${serviceLabels[key]} 的 API 地址`}
                />
              </div>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
                  API Key
                </Text>
                <Input.Password
                  value={settings[key]?.api_key || ''}
                  onChange={(e) => updateField(key, 'api_key', e.target.value)}
                  placeholder={`请输入 ${serviceLabels[key]} 的 API Key`}
                />
              </div>
            </Space>
          </Card>
        ))}
      </Space>

      <Divider />

      <div style={{ textAlign: 'right' }}>
        <Button type="primary" size="large" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
          保存配置
        </Button>
      </div>
    </div>
  );
}
