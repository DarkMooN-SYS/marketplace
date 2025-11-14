import React, { useEffect, useState } from 'react';
import { Package, CalendarDays, Wallet, Truck, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { profileApi, type Order } from '../../api/profileApi';
import { formatDate, formatNumber } from '../../utils/dateHelpers';
import { useAuth } from '../../hooks/useAuth';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-200',
  confirmed: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
  shipped: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200',
};

const statusLabels: Record<string, string> = {
  pending: 'Хүлээгдэж байна',
  confirmed: 'Баталгаажсан',
  shipped: 'Хүргэлтэнд',
  delivered: 'Хүргэгдсэн',
  cancelled: 'Цуцлагдсан',
};

const Orders: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    // Хэрэглэгч нэвтрээгүй бол API дуудалт хийхгүй
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        const data = await profileApi.getMyOrders();
        setOrders(data);
        if (data.length > 0) {
          setExpanded(data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const toggle = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-text-main dark:text-white mb-2">
          Захиалга байхгүй байна
        </h3>
        <p className="text-text-main/60 dark:text-white/60">
          Танд одоогоор захиалга алга байна
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-xl font-semibold text-text-main dark:text-white">Сүүлийн захиалгууд</h3>
        <span className="text-xs uppercase tracking-[0.2em] text-text-main/50 dark:text-white/50">
          Нийт {orders.length} захиалга
        </span>
      </header>

      <div className="space-y-4">
        {orders.map((order) => {
          const isOpen = expanded === order.id;
          const StatusIcon = order.status === 'delivered' ? Truck : Package;
          const statusColor = statusColors[order.status] || statusColors.pending;
          const statusLabel = statusLabels[order.status] || order.status;

          return (
            <div
              key={order.id}
              className="rounded-2xl border border-border-main bg-bg-main dark:bg-slate-900 shadow-sm hover:shadow-lg transition-shadow"
            >
              <button
                onClick={() => toggle(order.id)}
                className="w-full flex flex-col gap-4 p-5 text-left"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                      <StatusIcon className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-text-main dark:text-white">Захиалга #{order.id}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-main/60 dark:text-white/60">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" />
                          {formatDate(order.createdAt, 'mn-MN')}
                        </span>
                        <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-text-main/50 dark:text-white/50 uppercase tracking-wide">Нийт дүн</p>
                      <p className="text-lg font-semibold text-text-main dark:text-white">₮{formatNumber(order.totalAmount)}</p>
                    </div>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-main/60 text-text-main dark:text-white">
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border-main/70 bg-white/70 dark:bg-slate-900/70 px-5 py-4 text-sm text-text-main/80 dark:text-white/70">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-text-main/50 dark:text-white/50">Барааны нэр</p>
                      <p className="mt-1 font-semibold text-text-main dark:text-white">{order.productName}</p>
                      <p className="text-xs mt-1">Тоо ширхэг: {order.quantity}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-text-main/50 dark:text-white/50">Захиалгын мэдээлэл</p>
                      <p className="mt-1 font-semibold text-text-main dark:text-white">ID: #{order.id}</p>
                      <p className="text-xs mt-1 inline-flex items-center gap-2">
                        <Truck className="h-4 w-4 text-emerald-500" />
                        Өдөр: {formatDate(order.updatedAt || order.createdAt, 'mn-MN')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <footer className="rounded-2xl border border-dashed border-border-main/60 bg-bg-main/60 dark:bg-slate-900/40 px-4 py-5 text-center text-sm text-text-main/70 dark:text-white/60">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <Wallet className="h-4 w-4" />
          <span>Захиалгын түүхийн дэлгэрэнгүйг “Төлбөр” хэсгээс үргэлжлүүлэн шалгана уу.</span>
        </div>
      </footer>
    </div>
  );
};

export default Orders;
