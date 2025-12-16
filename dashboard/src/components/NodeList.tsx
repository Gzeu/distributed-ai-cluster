'use client'

import { Server, Cpu, HardDrive, Activity } from 'lucide-react'
import type { NodeInfo } from '@/types'

interface Props {
  nodes: NodeInfo[]
}

export function NodeList({ nodes }: Props) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-success'
      case 'degraded': return 'text-warning'
      case 'offline': return 'text-danger'
      default: return 'text-gray-400'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-success/20 text-success'
      case 'degraded': return 'bg-warning/20 text-warning'
      case 'offline': return 'bg-danger/20 text-danger'
      default: return 'bg-gray-700 text-gray-400'
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Server className="w-6 h-6" />
        Worker Nodes
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nodes
          .filter(node => node.type === 'worker')
          .map(node => (
            <div key={node.id} className="node-card">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className={`w-5 h-5 ${getStatusColor(node.status)}`} />
                  <span className="font-medium text-sm truncate">{node.id}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(node.status)}`}>
                  {node.status}
                </span>
              </div>

              {/* Metrics */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Cpu className="w-4 h-4" />
                    <span>CPU</span>
                  </div>
                  <span className="font-medium">{node.metrics.cpuUsage.toFixed(1)}%</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <HardDrive className="w-4 h-4" />
                    <span>Memory</span>
                  </div>
                  <span className="font-medium">{node.metrics.memoryUsage.toFixed(1)}%</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Activity className="w-4 h-4" />
                    <span>Requests</span>
                  </div>
                  <span className="font-medium">{node.metrics.activeRequests}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-400">Tokens/sec</div>
                  <span className="font-medium">{node.metrics.tokensPerSecond.toFixed(1)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                {node.capabilities.cpuCores} cores • {(node.capabilities.ramTotal / 1024 / 1024 / 1024).toFixed(1)}GB RAM
              </div>
            </div>
          ))}
      </div>

      {nodes.filter(n => n.type === 'worker').length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No worker nodes registered
        </div>
      )}
    </div>
  )
}
