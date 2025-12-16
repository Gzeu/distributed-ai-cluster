'use client'

import { useEffect, useState } from 'react'
import { Activity, Cpu, HardDrive, Server, Zap } from 'lucide-react'
import { ClusterStatus } from '@/components/ClusterStatus'
import { NodeList } from '@/components/NodeList'
import { PerformanceChart } from '@/components/PerformanceChart'
import { fetchClusterStatus } from '@/lib/api'
import type { ClusterData } from '@/types'

export default function Dashboard() {
  const [clusterData, setClusterData] = useState<ClusterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchClusterStatus()
        setClusterData(data)
        setError(null)
      } catch (err) {
        setError('Failed to fetch cluster status')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
    const interval = setInterval(loadData, 3000) // Refresh every 3s

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card p-8 text-center">
          <p className="text-danger text-xl">{error}</p>
          <p className="text-gray-400 mt-2">Make sure the controller is running</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          AI Cluster Dashboard
        </h1>
        <p className="text-gray-400">Real-time monitoring of distributed AI infrastructure</p>
      </div>

      {/* Stats Grid */}
      {clusterData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Nodes</p>
                  <p className="text-3xl font-bold mt-1">{clusterData.stats.totalNodes}</p>
                </div>
                <Server className="w-12 h-12 text-primary" />
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Healthy Nodes</p>
                  <p className="text-3xl font-bold mt-1 text-success">{clusterData.stats.healthyNodes}</p>
                </div>
                <Activity className="w-12 h-12 text-success" />
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total CPU Cores</p>
                  <p className="text-3xl font-bold mt-1">{clusterData.stats.totalCapacity}</p>
                </div>
                <Cpu className="w-12 h-12 text-secondary" />
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Requests</p>
                  <p className="text-3xl font-bold mt-1 text-warning">{clusterData.stats.activeRequests}</p>
                </div>
                <Zap className="w-12 h-12 text-warning" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <PerformanceChart nodes={clusterData.nodes} />
          </div>

          {/* Node List */}
          <NodeList nodes={clusterData.nodes} />
        </>
      )}
    </div>
  )
}
