'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { NodeInfo } from '@/types'

interface Props {
  nodes: NodeInfo[]
}

export function PerformanceChart({ nodes }: Props) {
  // Transform node data for chart
  const data = nodes
    .filter(node => node.type === 'worker')
    .map(node => ({
      name: node.id.substring(0, 15) + '...',
      cpu: node.metrics.cpuUsage,
      memory: node.metrics.memoryUsage,
      requests: node.metrics.activeRequests,
    }))

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1f2937', 
              border: '1px solid #374151',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="cpu" stroke="#8b5cf6" name="CPU %" strokeWidth={2} />
          <Line type="monotone" dataKey="memory" stroke="#10b981" name="Memory %" strokeWidth={2} />
          <Line type="monotone" dataKey="requests" stroke="#f59e0b" name="Active Requests" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
