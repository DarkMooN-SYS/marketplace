import React, { useState } from 'react';
import { User, Mail, Calendar, MapPin, Building2, GraduationCap, Briefcase, Heart, Check, ChevronRight, ChevronLeft } from 'lucide-react';

interface ProfileCompletionProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (profileData: ProfileData) => void;
  initialData?: Partial<ProfileData>;
  required?: boolean; // Заавал бөглүүлэх эсэх
}

export interface ProfileData {
  // Basic Info (Required)
  name: string;
  phone: string;
  
  // Personal Details
  email?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  
  // Location
  city?: string;
  district?: string;
  address?: string;
  
  // Professional
  occupation?: string;
  company?: string;
  education?: 'high_school' | 'bachelor' | 'master' | 'phd' | 'other';
  monthlyIncome?: 'under_500k' | '500k_1m' | '1m_2m' | '2m_5m' | 'over_5m' | 'prefer_not_to_say';
  
  // Interests & Lifestyle
  interests?: string[];
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'prefer_not_to_say';
  hasChildren?: boolean;
  childrenCount?: number;
  
  // Marketing Preferences
  acceptMarketing?: boolean;
  preferredContactMethod?: 'phone' | 'email' | 'sms' | 'app_notification';
}

const STEPS = [
  { id: 1, name: 'Үндсэн мэдээлэл', icon: User },
  { id: 2, name: 'Хаяг байршил', icon: MapPin },
  { id: 3, name: 'Ажил мэргэжил', icon: Briefcase },
  { id: 4, name: 'Сонирхол', icon: Heart }
];

const INTERESTS_OPTIONS = [
  'Технологи', 'Спорт', 'Урлаг', 'Хөгжим', 'Кино', 'Уншлага',
  'Аялал', 'Хоол', 'Загвар', 'Гэр ахуй', 'Бизнес', 'Боловсрол'
];

const CITIES_MONGOLIA = [
  'Улаанбаатар', 'Дархан', 'Эрдэнэт', 'Чойбалсан', 'Мөрөн',
  'Ховд', 'Өлгий', 'Улаангом', 'Өндөрхаан', 'Баян-Өлгий'
];

export default function ProfileCompletion({ isOpen, onClose, onComplete, initialData, required = false }: ProfileCompletionProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<ProfileData>({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    dateOfBirth: initialData?.dateOfBirth || '',
    gender: initialData?.gender || undefined,
    city: initialData?.city || '',
    district: initialData?.district || '',
    address: initialData?.address || '',
    occupation: initialData?.occupation || '',
    company: initialData?.company || '',
    education: initialData?.education || undefined,
    monthlyIncome: initialData?.monthlyIncome || undefined,
    interests: initialData?.interests || [],
    maritalStatus: initialData?.maritalStatus || undefined,
    hasChildren: initialData?.hasChildren || false,
    childrenCount: initialData?.childrenCount || 0,
    acceptMarketing: initialData?.acceptMarketing || false,
    preferredContactMethod: initialData?.preferredContactMethod || 'app_notification'
  });

  const validateCurrentStep = () => {
    if (!required) return true; // Хэрвээ required биш бол validation хийхгүй
    
    const newErrors: Record<string, string> = {};
    
    switch (currentStep) {
      case 1: // Үндсэн мэдээлэл
        if (!formData.email) newErrors.email = 'И-мэйл хаяг оруулна уу';
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Төрсөн огноо оруулна уу';
        if (!formData.gender) newErrors.gender = 'Хүйс сонгоно уу';
        if (!formData.maritalStatus) newErrors.maritalStatus = 'Гэрлэлтийн байдал сонгоно уу';
        break;
      case 2: // Хаяг байршил
        if (!formData.city) newErrors.city = 'Хот/Аймаг сонгоно уу';
        if (!formData.district) newErrors.district = 'Дүүрэг/Сум оруулна уу';
        break;
      case 3: // Ажил мэргэжил
        if (!formData.occupation) newErrors.occupation = 'Мэргэжил оруулна уу';
        if (!formData.education) newErrors.education = 'Боловсролын зэрэг сонгоно уу';
        if (!formData.monthlyIncome) newErrors.monthlyIncome = 'Сарын орлого сонгоно уу';
        break;
      case 4: // Сонирхол
        if (!formData.interests || formData.interests.length === 0) {
          newErrors.interests = 'Сонирхлын чиглэл сонгоно уу';
        }
        if (!formData.preferredContactMethod) {
          newErrors.preferredContactMethod = 'Холбоо барих хэлбэр сонгоно уу';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return;
    }
    
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      setErrors({}); // Дараагийн step рүү шилжихдээ error-уудыг цэвэрлэх
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (required && !validateCurrentStep()) {
      alert('Заавал бөглөх талбаруудыг бөглөнө үү!');
      return;
    }
    onComplete(formData);
  };

  const handleSkip = () => {
    onClose();
  };

  const toggleInterest = (interest: string) => {
    const currentInterests = formData.interests || [];
    if (currentInterests.includes(interest)) {
      setFormData({
        ...formData,
        interests: currentInterests.filter(i => i !== interest)
      });
    } else {
      setFormData({
        ...formData,
        interests: [...currentInterests, interest]
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-main rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border-main">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-text-main">
              {required ? 'Хувийн мэдээлэл бөглөх (Заавал)' : 'Хувийн мэдээлэл бөглөх'}
            </h2>
            {!required && (
              <button
                onClick={handleSkip}
                className="text-sm text-gray-500 hover:text-text-main transition-colors"
              >
                Алгасах
              </button>
            )}
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <StepIcon className="h-5 w-5" />
                      )}
                    </div>
                    <span className={`text-xs mt-2 text-center ${isActive ? 'text-text-main font-medium' : 'text-gray-500'}`}>
                      {step.name}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  И-мэйл хаяг {required && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) setErrors({ ...errors, email: '' });
                    }}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-border-main'
                    }`}
                    placeholder="email@example.com"
                    required={required}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <span>⚠️</span> {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Төрсөн огноо {required && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.dateOfBirth || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, dateOfBirth: e.target.value });
                      if (errors.dateOfBirth) setErrors({ ...errors, dateOfBirth: '' });
                    }}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500 ${
                      errors.dateOfBirth ? 'border-red-500' : 'border-border-main'
                    }`}
                    max={new Date().toISOString().split('T')[0]}
                    required={required}
                  />
                </div>
                {errors.dateOfBirth && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <span>⚠️</span> {errors.dateOfBirth}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Хүйс {required && <span className="text-red-500">*</span>}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'male', label: 'Эрэгтэй' },
                    { value: 'female', label: 'Эмэгтэй' },
                    { value: 'prefer_not_to_say', label: 'Хэлэхгүй байх' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, gender: option.value as ProfileData['gender'] });
                        if (errors.gender) setErrors({ ...errors, gender: '' });
                      }}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.gender === option.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                          : errors.gender
                          ? 'border-red-500'
                          : 'border-border-main hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <span>⚠️</span> {errors.gender}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Гэрлэлтийн байдал {required && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={formData.maritalStatus || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, maritalStatus: e.target.value as ProfileData['maritalStatus'] });
                    if (errors.maritalStatus) setErrors({ ...errors, maritalStatus: '' });
                  }}
                  className={`w-full px-3 py-2 border rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500 ${
                    errors.maritalStatus ? 'border-red-500' : 'border-border-main'
                  }`}
                  required={required}
                >
                  <option value="">Сонгох...</option>
                  <option value="single">Ганц бие</option>
                  <option value="married">Гэрлэсэн</option>
                  <option value="divorced">Салсан</option>
                  <option value="widowed">Бэлэвсэн</option>
                  <option value="prefer_not_to_say">Хэлэхгүй байх</option>
                </select>
                {errors.maritalStatus && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <span>⚠️</span> {errors.maritalStatus}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasChildren || false}
                    onChange={(e) => setFormData({ ...formData, hasChildren: e.target.checked, childrenCount: e.target.checked ? formData.childrenCount : 0 })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-text-main">Хүүхэдтэй</span>
                </label>
                {formData.hasChildren && (
                  <div className="mt-2">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={formData.childrenCount || 0}
                      onChange={(e) => setFormData({ ...formData, childrenCount: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-border-main rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500"
                      placeholder="Хүүхдийн тоо"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Хот/Аймаг {required && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={formData.city || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, city: e.target.value });
                    if (errors.city) setErrors({ ...errors, city: '' });
                  }}
                  className={`w-full px-3 py-2 border rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500 ${
                    errors.city ? 'border-red-500' : 'border-border-main'
                  }`}
                  required={required}
                >
                  <option value="">Сонгох...</option>
                  {CITIES_MONGOLIA.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {errors.city && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <span>⚠️</span> {errors.city}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Дүүрэг/Сум {required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={formData.district || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, district: e.target.value });
                    if (errors.district) setErrors({ ...errors, district: '' });
                  }}
                  className={`w-full px-3 py-2 border rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500 ${
                    errors.district ? 'border-red-500' : 'border-border-main'
                  }`}
                  placeholder="Дүүрэг/Сум"
                  required={required}
                />
                {errors.district && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <span>⚠️</span> {errors.district}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Дэлгэрэнгүй хаяг
                </label>
                <textarea
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-border-main rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500"
                  placeholder="Хороо, гудамж, байр, тоот..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 3: Professional */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Мэргэжил/Албан тушаал {required && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.occupation || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, occupation: e.target.value });
                      if (errors.occupation) setErrors({ ...errors, occupation: '' });
                    }}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500 ${
                      errors.occupation ? 'border-red-500' : 'border-border-main'
                    }`}
                    placeholder="Жишээ: Программ хөгжүүлэгч, Менежер..."
                    required={required}
                  />
                </div>
                {errors.occupation && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <span>⚠️</span> {errors.occupation}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Байгууллага/Компани
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.company || ''}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-border-main rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500"
                    placeholder="Ажиллаж байгаа компани"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Боловсролын зэрэг {required && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={formData.education || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, education: e.target.value as ProfileData['education'] });
                      if (errors.education) setErrors({ ...errors, education: '' });
                    }}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500 ${
                      errors.education ? 'border-red-500' : 'border-border-main'
                    }`}
                    required={required}
                  >
                    <option value="">Сонгох...</option>
                    <option value="high_school">Бүрэн дунд</option>
                    <option value="bachelor">Бакалавр</option>
                    <option value="master">Магистр</option>
                    <option value="phd">Докторант</option>
                    <option value="other">Бусад</option>
                  </select>
                </div>
                {errors.education && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <span>⚠️</span> {errors.education}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Сарын орлого {required && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={formData.monthlyIncome || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, monthlyIncome: e.target.value as ProfileData['monthlyIncome'] });
                    if (errors.monthlyIncome) setErrors({ ...errors, monthlyIncome: '' });
                  }}
                  className={`w-full px-3 py-2 border rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500 ${
                    errors.monthlyIncome ? 'border-red-500' : 'border-border-main'
                  }`}
                  required={required}
                >
                  <option value="">Сонгох...</option>
                  <option value="under_500k">500,000₮ хүртэл</option>
                  <option value="500k_1m">500,000₮ - 1,000,000₮</option>
                  <option value="1m_2m">1,000,000₮ - 2,000,000₮</option>
                  <option value="2m_5m">2,000,000₮ - 5,000,000₮</option>
                  <option value="over_5m">5,000,000₮ дээш</option>
                  <option value="prefer_not_to_say">Хэлэхгүй байх</option>
                </select>
                {errors.monthlyIncome && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <span>⚠️</span> {errors.monthlyIncome}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Interests */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-text-main mb-3">
                  Сонирхлын чиглэл (олон сонголттой) {required && <span className="text-red-500">*</span>}
                </label>
                <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 ${errors.interests ? 'border-2 border-red-500 rounded-lg p-2' : ''}`}>
                  {INTERESTS_OPTIONS.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => {
                        toggleInterest(interest);
                        if (errors.interests) setErrors({ ...errors, interests: '' });
                      }}
                      className={`p-3 rounded-lg border-2 transition-all text-sm ${
                        formData.interests?.includes(interest)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                          : 'border-border-main hover:border-gray-300'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
                {errors.interests && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <span>⚠️</span> {errors.interests}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-3">
                  Холбоо барих хэлбэр {required && <span className="text-red-500">*</span>}
                </label>
                <div className={`space-y-2 ${errors.preferredContactMethod ? 'border-2 border-red-500 rounded-lg p-2' : ''}`}>
                  {[
                    { value: 'sms', label: 'SMS' },
                    { value: 'phone', label: 'Утас' },
                    { value: 'email', label: 'И-мэйл' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center space-x-3 p-3 rounded-lg border border-border-main hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="contactMethod"
                        value={option.value}
                        checked={formData.preferredContactMethod === option.value}
                        onChange={(e) => {
                          setFormData({ ...formData, preferredContactMethod: e.target.value as ProfileData['preferredContactMethod'] });
                          if (errors.preferredContactMethod) setErrors({ ...errors, preferredContactMethod: '' });
                        }}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-text-main">{option.label}</span>
                    </label>
                  ))}
                </div>
                {errors.preferredContactMethod && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <span>⚠️</span> {errors.preferredContactMethod}
                  </p>
                )}
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.acceptMarketing || false}
                    onChange={(e) => setFormData({ ...formData, acceptMarketing: e.target.checked })}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm text-text-main font-medium block">
                      Маркетингийн мэдээлэл хүлээн авах
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Урамшуулал, шинэ бүтээгдэхүүн, онцлох санал болон сонирхолтой контент хүлээн авна
                    </span>
                  </div>
                </label>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p>🔒 Таны хувийн мэдээлэл найдвартай хамгаалагдсан байх бөгөөд зөвхөн таны зөвшөөрлөөр ашиглагдана. 
                Дэлгэрэнгүй мэдээллийг <a href="/privacy" className="text-blue-600 hover:underline">Нууцлалын бодлого</a>-оос үзнэ үү.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-main bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-text-main hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Буцах</span>
            </button>

            <div className="text-sm text-gray-500">
              {currentStep} / {STEPS.length}
            </div>

            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center space-x-2"
            >
              <span>{currentStep === STEPS.length ? 'Дуусгах' : 'Үргэлжлүүлэх'}</span>
              {currentStep === STEPS.length ? (
                <Check className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
