import React, { useState, useEffect } from 'react';
import { Gift, Save, RotateCw, Percent, Award, XCircle, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { api } from '../../api/adminApi';

interface SpinSegment {
  id: number;
  label: string;
  icon: string;
  color: string;
  type: 'discount' | 'bonus' | 'retry' | 'none';
  value: number;
  weight: number;
}

const SpinRewards: React.FC = () => {
  const [segments, setSegments] = useState<SpinSegment[]>([
    { id: 1, label: '5% хөнгөлөлт', icon: '🎁', color: '#7c3aed', type: 'discount', value: 5, weight: 15 },
    { id: 2, label: '10% бонус', icon: '💰', color: '#ec4899', type: 'bonus', value: 10, weight: 10 },
    { id: 3, label: '15% бонус', icon: '🎉', color: '#22c55e', type: 'bonus', value: 15, weight: 5 },
    { id: 4, label: 'Амжилтгүй', icon: '😢', color: '#94a3b8', type: 'none', value: 0, weight: 30 },
    { id: 5, label: '20% хөнгөлөлт', icon: '🏆', color: '#f97316', type: 'discount', value: 20, weight: 5 },
    { id: 6, label: 'Дахин оролд', icon: '🔄', color: '#eab308', type: 'retry', value: 0, weight: 15 },
    { id: 7, label: '5% бонус', icon: '🎈', color: '#0ea5e9', type: 'bonus', value: 5, weight: 15 },
    { id: 8, label: '10% хөнгөлөлт', icon: '🎊', color: '#ef4444', type: 'discount', value: 10, weight: 5 },
  ]);

  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      setLoading(true);
      const data = await api.spinRewards.getAll();
      if (data.segments && data.segments.length > 0) {
        setSegments(data.segments);
      }
    } catch (error) {
      console.error('Failed to load spin rewards:', error);
      // Keep default segments on error
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaveStatus('saving');
      await api.spinRewards.update(segments);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save spin rewards:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleReset = async () => {
    if (!confirm('Анхдагч тохиргоо руу буцаах уу? Хадгалсан өөрчлөлтүүд устана.')) return;
    
    try {
      setLoading(true);
      // Call backend to delete custom config
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_URL}/spin/rewards`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSegments(data.segments);
        alert('Анхдагч тохиргоо руу амжилттай буцлаа!');
      } else {
        throw new Error('Failed to reset');
      }
    } catch (error) {
      console.error('Failed to reset spin rewards:', error);
      alert('Алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setLoading(false);
    }
  };

  const updateSegment = (id: number, field: keyof SpinSegment, value: string | number | SpinSegment['type']) => {
    setSegments(prev => prev.map(seg => 
      seg.id === id ? { ...seg, [field]: value } : seg
    ));
  };

  const addSegment = () => {
    const newId = Math.max(...segments.map(s => s.id)) + 1;
    setSegments([...segments, {
      id: newId,
      label: 'Шинэ шагнал',
      icon: '🎁',
      color: '#3b82f6',
      type: 'bonus',
      value: 5,
      weight: 10
    }]);
  };

  const removeSegment = (id: number) => {
    if (segments.length <= 4) {
      alert('Хамгийн багадаа 4 хэсэг байх ёстой!');
      return;
    }
    setSegments(prev => prev.filter(seg => seg.id !== id));
  };

  const totalWeight = segments.reduce((sum, seg) => sum + seg.weight, 0);

  const getTypeIcon = (type: SpinSegment['type']) => {
    switch (type) {
      case 'discount': return <Percent className="h-4 w-4" />;
      case 'bonus': return <Award className="h-4 w-4" />;
      case 'retry': return <RefreshCw className="h-4 w-4" />;
      case 'none': return <XCircle className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: SpinSegment['type']) => {
    switch (type) {
      case 'discount': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'bonus': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'retry': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'none': return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
            <Gift className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            Spin Wheel Шагнал
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
            Хэрэглэгчдэд өгөх шагналууд болон тэдгээрийн магадлалыг тохируулна уу
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleReset}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <RotateCw className="h-4 w-4" />
            <span className="hidden sm:inline">Анхдагч руу буцаах</span>
            <span className="sm:hidden">Буцаах</span>
          </button>
          <button
            onClick={loadSegments}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <RotateCw className="h-4 w-4" />
            <span className="hidden sm:inline">Шинэчлэх</span>
            <span className="sm:hidden">Дахин</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base ${
              saveStatus === 'success' 
                ? 'bg-green-500 text-white' 
                : saveStatus === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            <Save className="h-4 w-4" />
            {saveStatus === 'saving' ? 'Хадгалж байна...' : 
             saveStatus === 'success' ? 'Амжилттай!' : 
             saveStatus === 'error' ? 'Алдаа гарлаа' : 'Хадгалах'}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-blue-900 dark:text-blue-100 mb-1">Магадлалын тохиргоо</h3>
            <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
              "Weight" (жин) нь тухайн шагналын авах магадлалыг тодорхойлно. Их жинтэй шагнал илүү их гарна.
              Нийт жин: <strong>{totalWeight}</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4">
        {segments.map((segment) => {
          const probability = ((segment.weight / totalWeight) * 100).toFixed(1);
          
          return (
            <div
              key={segment.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-5 hover:shadow-md transition"
            >
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0 self-center sm:self-start">
                  <div 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl"
                    style={{ backgroundColor: segment.color + '20' }}
                  >
                    {segment.icon}
                  </div>
                </div>

                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Нэр
                    </label>
                    <input
                      type="text"
                      value={segment.label}
                      onChange={(e) => updateSegment(segment.id, 'label', e.target.value)}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Эможи
                    </label>
                    <input
                      type="text"
                      value={segment.icon}
                      onChange={(e) => updateSegment(segment.id, 'icon', e.target.value)}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-center text-xl sm:text-2xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Өнгө
                    </label>
                    <input
                      type="color"
                      value={segment.color}
                      onChange={(e) => updateSegment(segment.id, 'color', e.target.value)}
                      className="w-full h-9 sm:h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Төрөл
                    </label>
                    <select
                      value={segment.type}
                      onChange={(e) => updateSegment(segment.id, 'type', e.target.value as SpinSegment['type'])}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      <option value="discount">Хөнгөлөлт</option>
                      <option value="bonus">Бонус оноо</option>
                      <option value="retry">Дахин оролдох</option>
                      <option value="none">Амжилтгүй</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Утга (%)
                    </label>
                    <input
                      type="number"
                      value={segment.value}
                      onChange={(e) => updateSegment(segment.id, 'value', parseInt(e.target.value) || 0)}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      min="0"
                      max="100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Жин (магадлал)
                    </label>
                    <input
                      type="number"
                      value={segment.weight}
                      onChange={(e) => updateSegment(segment.id, 'weight', parseInt(e.target.value) || 1)}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      min="1"
                      max="100"
                    />
                  </div>

                  <div className="flex items-end">
                    <div className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg ${getTypeColor(segment.type)} flex items-center gap-1.5 sm:gap-2 w-full justify-center`}>
                      {getTypeIcon(segment.type)}
                      <span className="text-xs sm:text-sm font-medium">{probability}%</span>
                    </div>
                  </div>

                  <div className="flex items-end sm:col-span-1">
                    <button
                      onClick={() => removeSegment(segment.id)}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition flex items-center justify-center gap-1.5 sm:gap-2"
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden xs:inline">Устгах</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={addSegment}
        className="w-full py-2.5 sm:py-3 text-sm sm:text-base border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
        Шинэ хэсэг нэмэх
      </button>
    </div>
  );
};

export default SpinRewards;
