import axios from 'axios';
import type { ClusterData } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function fetchClusterStatus(): Promise<ClusterData> {
  const response = await apiClient.get('/cluster/status');
  return response.data;
}

export async function sendChatCompletion(messages: any[]) {
  const response = await apiClient.post('/v1/chat/completions', {
    model: 'default',
    messages,
  });
  return response.data;
}
