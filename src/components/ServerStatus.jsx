import React, { useState, useEffect } from 'react';
import { Circle, AlertCircle } from 'lucide-react';
import { CONFIG } from '@/config/constants';

export default function ServerStatus() {
  // Temporary test mode - set to 'down' to simulate server down state
  // Remove this line or set to null for normal operation
  const TEST_MODE = null; // 'down', 'up', 'degraded', or null for normal
  
  const [status, setStatus] = useState(TEST_MODE || 'checking'); // 'up', 'down', 'checking'
  const [lastUpdated, setLastUpdated] = useState(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState('');

  const checkServerStatus = async () => {
    // If in test mode, skip actual check and use test status
    if (TEST_MODE) {
      setStatus(TEST_MODE);
      const now = new Date();
      setLastUpdated(now);
      setLastUpdatedTime(now.toLocaleTimeString());
      return;
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data.status === 'up' ? 'up' : 'degraded');
        const now = new Date();
        setLastUpdated(now);
        setLastUpdatedTime(now.toLocaleTimeString());
      } else {
        const now = new Date();
        setStatus('down');
        setLastUpdated(now);
        setLastUpdatedTime(now.toLocaleTimeString());
      }
    } catch (error) {
      const now = new Date();
      if (error.name === 'AbortError') {
        // Timeout
        setStatus('down');
      } else {
        setStatus('down');
      }
      setLastUpdated(now);
      setLastUpdatedTime(now.toLocaleTimeString());
    }
  };

  useEffect(() => {
    // Initial check
    checkServerStatus();
    
    // Check every 5 seconds
    const interval = setInterval(() => {
      checkServerStatus();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);


  const getStatusColor = () => {
    switch (status) {
      case 'up':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case 'up':
        return 'bg-green-100';
      case 'degraded':
        return 'bg-yellow-100';
      case 'down':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'up':
        return 'Server Up';
      case 'degraded':
        return 'Server Degraded';
      case 'down':
        return 'Server Down';
      default:
        return 'Checking...';
    }
  };

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${getStatusBg()} transition-all duration-300 w-full`}>
      {status === 'checking' ? (
        <div className="w-2.5 h-2.5 rounded-full bg-gray-400 animate-pulse" />
      ) : status === 'up' ? (
        <Circle className={`w-3.5 h-3.5 ${getStatusColor()} fill-current`} />
      ) : (
        <AlertCircle className={`w-3.5 h-3.5 ${getStatusColor()}`} />
      )}
      <div className="flex flex-col flex-1 min-w-0">
        <span className={`text-xs font-semibold ${getStatusColor()} truncate`}>
          {getStatusText()}
        </span>
        {lastUpdated && (
          <span className="text-xs text-slate-600 font-medium">
            Last updated: {lastUpdatedTime}
          </span>
        )}
      </div>
    </div>
  );
}

