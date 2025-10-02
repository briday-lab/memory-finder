'use client'

import { useState } from 'react'
import VideographerDashboard from '../../components/videographer-dashboard'
import CoupleDashboard from '../../components/couple-dashboard'
import AnalyticsDashboard from '../../components/analytics-dashboard'
import { Button } from '../../components/ui/button'

export default function DashboardPreview() {
  const [activeView, setActiveView] = useState<'videographer' | 'couple' | 'analytics'>('videographer')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Selector */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard Preview</h1>
          <div className="flex gap-2">
            <Button 
              onClick={() => setActiveView('videographer')}
              variant={activeView === 'videographer' ? 'default' : 'outline'}
            >
              🎬 Videographer Dashboard
            </Button>
            <Button 
              onClick={() => setActiveView('couple')}
              variant={activeView === 'couple' ? 'default' : 'outline'}
            >
              💕 Couple Dashboard
            </Button>
            <Button 
              onClick={() => setActiveView('analytics')}
              variant={activeView === 'analytics' ? 'default' : 'outline'}
            >
              📈 Analytics Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto">
        {activeView === 'videographer' && <VideographerDashboard />}
        {activeView === 'couple' && <CoupleDashboard />}
        {activeView === 'analytics' && <AnalyticsDashboard />}
      </div>
    </div>
  )
}
