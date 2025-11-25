import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import { useStore } from '@/store/useStore';
import api from '@/lib/api';

export default function Booking() {
  const router = useRouter();
  const { selectedRestaurant, user } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formUrl, setFormUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    date: '',
    time: '',
    guests_count: 2,
    comment: '',
  });

  // Заполняем форму данными пользователя, если он авторизован
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || prev.name,
        phone: user.phoneNumber || prev.phone,
        email: prev.email, // Email обычно не хранится в профиле
      }));
    }
  }, [user]);

  // Проверяем, выбран ли ресторан
  useEffect(() => {
    if (!selectedRestaurant) {
      router.push('/');
    }
  }, [selectedRestaurant, router]);

  // Устанавливаем минимальную дату (сегодня)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Валидация телефона
  const formatPhone = (phone: string) => {
    // Удаляем все нецифровые символы
    const digits = phone.replace(/\D/g, '');
    // Если начинается с 8, заменяем на 7
    if (digits.startsWith('8')) {
      return '+7' + digits.slice(1);
    }
    // Если начинается с 7, добавляем +
    if (digits.startsWith('7')) {
      return '+' + digits;
    }
    // Если не начинается с 7 или 8, добавляем +7
    if (digits.length > 0) {
      return '+7' + digits;
    }
    return phone;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Введите ваше имя');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Введите номер телефона');
      return false;
    }
    // Проверяем формат телефона (+7XXXXXXXXXX)
    const phoneRegex = /^\+7\d{10}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      setError('Введите корректный номер телефона в формате +7XXXXXXXXXX');
      return false;
    }
    if (!formData.date) {
      setError('Выберите дату');
      return false;
    }
    if (!formData.time) {
      setError('Выберите время');
      return false;
    }
    if (formData.guests_count < 1 || formData.guests_count > 20) {
      setError('Количество гостей должно быть от 1 до 20');
      return false;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Введите корректный email');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setFormUrl(null);

    if (!validateForm()) {
      return;
    }

    if (!selectedRestaurant?.id) {
      setError('Ресторан не выбран');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/booking', {
        restaurantId: selectedRestaurant.id,
        name: formData.name.trim(),
        phone: formData.phone.replace(/\s/g, ''),
        email: formData.email.trim() || undefined,
        date: formData.date,
        time: formData.time,
        guests_count: formData.guests_count,
        comment: formData.comment.trim() || undefined,
      });

      if (response.data.success) {
        setSuccess(true);
        if (response.data.data?.form_url) {
          setFormUrl(response.data.data.form_url);
        }
        // Очищаем форму после успешной отправки
        setTimeout(() => {
          setFormData({
            name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
            phone: user?.phoneNumber || '',
            email: '',
            date: '',
            time: '',
            guests_count: 2,
            comment: '',
          });
          setSuccess(false);
          setFormUrl(null);
        }, 5000);
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      setError(
        error?.response?.data?.message || 
        'Не удалось создать бронирование. Попробуйте позже.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedRestaurant) {
    return null;
  }

  return (
    <Layout>
      <Header title="Бронирование столика" showBackButton />
      <div className="px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6 max-w-2xl mx-auto">
          {/* Информация о ресторане */}
          <div className="pb-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-text-primary mb-1">
              {selectedRestaurant.name}
            </h2>
            <p className="text-sm text-gray-600">
              {selectedRestaurant.city}, {selectedRestaurant.address}
            </p>
            {selectedRestaurant.phoneNumber && (
              <p className="text-sm text-gray-600 mt-1">
                Телефон: {selectedRestaurant.phoneNumber}
              </p>
            )}
          </div>

          {/* Сообщение об успехе */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-600 mt-0.5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-green-800 font-medium">
                    Бронирование успешно создано!
                  </p>
                  {formUrl && (
                    <a
                      href={formUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 underline mt-2 inline-block"
                    >
                      Перейти к оплате депозита
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Сообщение об ошибке */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-red-600 mt-0.5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Форма бронирования */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Ваше имя <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Иван Иванов"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Телефон <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="+7 (999) 999-99-99"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="example@mail.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Дата <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={getMinDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Время <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Количество гостей <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.guests_count}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value) && value >= 1 && value <= 20) {
                    setFormData({ ...formData, guests_count: value });
                  }
                }}
                min={1}
                max={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Комментарий (необязательно)
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Особые пожелания, повод для посещения и т.д."
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-text-secondary px-4 py-3 rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Отправка...' : 'Забронировать столик'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
