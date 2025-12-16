'use client'

import { Activity, AlertCircle, CheckCircle } from 'lucide-react'
import type { NodeInfo } from '@/types'

interface Props {
  nodes: NodeInfo[]
}

export function ClusterStatus({ nodes }: Props) {
  const healthyCount = nodes.filter(n => n.status === 'healthy').length
  const degradedCount = nodes.filter(n => n.status === 'degraded').length
  const offlineCount = nodes.filter(n => n.status === 'offline').length

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-6 h-6" />
        Cluster Status
      </h2>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            <span>Healthy Nodes</span>
          </div>
          <span className="font-bold text-success">{healthyCount}</span>
        </div>

        {degradedCount > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning" />
              <span>Degraded Nodes</span>
            </div>
            <span className="font-bold text-warning">{degradedCount}</span>
          </div>
        )}

        {offlineCount > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-danger" />
              <span>Offline Nodes</span>
            </div>
            <span className="font-bold text-danger">{offlineCount}</span>
          </div>
        )}
      </div>
    </div>
  )
}
