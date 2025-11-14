import React, { useEffect, useState } from 'react';
import { api } from '../../api/adminApi';
import { Activity, Clock, Package, FileText, Megaphone, Link as LinkIcon, Newspaper } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface ActivityItem {
  id: string;
  action: string;
  item: string;
  type: 'survey' | 'product' | 'ui_update' | 'rank' | 'news' | 'advertisement' | 'weblink';
  timestamp: string;
  createdBy?: string;
}

const Activities: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Хэрэглэгч нэвтрээгүй бол API дуудалт хийхгүй
    if (!user) {
      setLoading(false);
      return;
    }
    fetchActivities();
  }, [user]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.activities.getAll(20); // Fetch last 20 activities
      setActivities(response.activities || []);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      setError('Үйл ажиллагааны түүхийг татахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'survey':
        return <FileText size={20} className="text-blue-500" />;
      case 'product':
        return <Package size={20} className="text-green-500" />;
      case 'news':
        return <Newspaper size={20} className="text-purple-500" />;
      case 'advertisement':
        return <Megaphone size={20} className="text-orange-500" />;
      case 'weblink':
        return <LinkIcon size={20} className="text-cyan-500" />;
      case 'rank':
        return <Activity size={20} className="text-yellow-500" />;
      default:
        return <Activity size={20} className="text-gray-500" />;
    }
  };

  const getActivityTypeLabel = (type: ActivityItem['type']) => {
    switch (type) {
      case 'survey':
        return 'Судалгаа';
      case 'product':
        return 'Бүтээгдэхүүн';
      case 'news':
        return 'Мэдээ';
      case 'advertisement':
        return 'Зар сурталчилгаа';
      case 'weblink':
        return 'Веб холбоос';
      case 'rank':
        return 'Зэрэглэл';
      case 'ui_update':
        return 'UI шинэчлэл';
      default:
        return 'Бусад';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Яг одоо';
      if (diffMins < 60) return `${diffMins} минутын өмнө`;
      if (diffHours < 24) return `${diffHours} цагийн өмнө`;
      if (diffDays < 7) return `${diffDays} өдрийн өмнө`;
      
      return date.toLocaleDateString('mn-MN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return timestamp;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Үйл ажиллагааны түүх
        </h2>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-600 dark:text-gray-400">Ачааллаж байна...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Үйл ажиллагааны түүх
        </h2>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm md:text-base text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={fetchActivities}
            className="mt-3 px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Дахин оролдох
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
          Үйл ажиллагааны түүх
        </h2>
        <button
          onClick={fetchActivities}
          className="px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
        >
          <Activity className="w-4 h-4 flex-shrink-0" />
          <span>Шинэчлэх</span>
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
          <Activity size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            Одоогоор үйл ажиллагаа байхгүй байна
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {getActivityTypeLabel(activity.type)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white font-medium mb-1">
                    {activity.action}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {activity.item}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
                    <Clock size={12} />
                    {formatTimestamp(activity.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Activities;
