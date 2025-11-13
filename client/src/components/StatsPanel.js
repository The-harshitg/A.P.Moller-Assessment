import React from 'react';
import { Database, ShoppingCart, Package, Users } from 'lucide-react';
import './StatsPanel.css';

function StatsPanel({ stats }) {
  const statItems = [
    {
      icon: <Users size={24} />,
      label: 'Customers',
      value: stats?.customers || 0,
      color: '#667eea'
    },
    {
      icon: <ShoppingCart size={24} />,
      label: 'Orders',
      value: stats?.orders || 0,
      color: '#764ba2'
    },
    {
      icon: <Package size={24} />,
      label: 'Products',
      value: stats?.products || 0,
      color: '#4f46e5'
    },
    {
      icon: <Database size={24} />,
      label: 'Order Items',
      value: stats?.orderItems || 0,
      color: '#7c3aed'
    }
  ];

  return (
    <div className="stats-panel">
      <h2>📊 Database Overview</h2>
      <div className="stats-grid">
        {statItems.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon" style={{ color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-content">
              <div className="stat-value">{stat.value.toLocaleString()}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="stats-footer">
        <p>💡 Start a conversation to explore your data!</p>
      </div>
    </div>
  );
}

export default StatsPanel;

