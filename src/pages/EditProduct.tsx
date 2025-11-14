import React from 'react';
import { Sparkles, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import ProductForm, { ProductFormValues } from '../components/ProductForm';
import { useProducts } from '../hooks/useProducts';
import { useAuth } from '../hooks/useAuth';
import type { Product } from '../types/product';

interface EditProductPageProps {
  productId: string;
}

const mapProductToForm = (p: Product): ProductFormValues => {
  return {
    title: p.title,
    description: p.description,
    price: p.price,
    location: p.location,
    category: p.categoryKey || 'other',
    condition: p.condition,
    primaryImage: p.images?.[0] || '',
    gallery: (p.images || []).slice(1),
    contact: p.contact || p.seller.contact || '',
  };
};

export default function EditProductPage({ productId }: EditProductPageProps) {
  const { findProductById } = useProducts();
  const { user } = useAuth();
  const [product, setProduct] = React.useState<Product | undefined>(() => findProductById(productId));
  const [status, setStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    setProduct(findProductById(productId));
  }, [productId, findProductById]);

  const isOwner = React.useMemo(() => {
    if (!product || !user) return false;
    if (product.sellerUserId && product.sellerUserId === user.id) return true;
    // fallback: match by name + avatar if sellerUserId absent (legacy products)
    return product.seller.name === user.name && product.seller.avatar === (user.avatar || '/img/human.png');
  }, [product, user]);

  const handleSubmit = async (values: ProductFormValues) => {
    if (!product || !isOwner) return;
    setIsSubmitting(true);
    setStatus('idle');
    setErrorMsg(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Нэвтрэх шаардлагатай');
      }

      const updateData = {
        title: values.title.trim(),
        description: values.description.trim(),
        price: values.price,
        location: values.location.trim(),
        categoryKey: values.category,
        category: product.categoryKey ? product.category : values.category,
        condition: values.condition,
        images: [values.primaryImage, ...values.gallery].filter(Boolean),
        contact: values.contact.trim(),
      };

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_URL}/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Шинэчилж чадсангүй');
      }

      setStatus('success');
      setTimeout(() => {
        window.location.hash = `product/${product.id}`;
      }, 900);
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'Тодорхойгүй алдаа гарлаа.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) {
    return (
      <div className="mx-auto max-w-xl space-y-6 rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="text-xl font-semibold text-[var(--color-text-main)]">Бараа олдсонгүй</h1>
        <p className="text-sm text-[var(--color-text-main)]/70">Энэ бараа устгагдсан эсвэл байхгүй байна.</p>
        <button
          onClick={() => (window.location.hash = 'marketplace')}
          className="inline-flex items-center justify-center rounded-full border border-[var(--color-border-soft)] bg-white px-5 py-2 text-sm font-semibold text-[var(--color-text-main)] transition hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:bg-slate-900/60"
        >
          Marketplace руу буцах
        </button>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-xl space-y-6 rounded-3xl border border-amber-400/40 bg-amber-50/80 p-8 text-center dark:border-amber-300/30 dark:bg-amber-400/10">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="text-xl font-semibold text-[var(--color-text-main)] dark:text-white">Та энэ барааг засах эрхгүй.</h1>
        <p className="text-sm text-[var(--color-text-main)]/70 dark:text-white/60">Зөвхөн өөрийн нийтэлсэн барааг засварлах боломжтой.</p>
        <button
          onClick={() => (window.location.hash = `product/${product.id}`)}
          className="inline-flex items-center justify-center rounded-full border border-[var(--color-border-soft)] bg-white px-5 py-2 text-sm font-semibold text-[var(--color-text-main)] transition hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:bg-slate-900/60"
        >
          Барааны хуудас руу
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => (window.location.hash = `product/${product.id}`)}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:bg-slate-900/60"
        >
          <ArrowLeft className="h-4 w-4" />
          Буцах
        </button>
        <h1 className="text-2xl font-semibold text-[var(--color-text-main)]">Бараа засах</h1>
      </div>

      {status === 'success' && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/60 bg-emerald-50/80 px-5 py-4 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm">Амжилттай шинэчлэгдлээ! Шилжүүлж байна...</span>
        </div>
      )}
      {status === 'error' && errorMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-300/60 bg-red-50/80 px-5 py-4 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{errorMsg}</span>
        </div>
      )}

      <div className="rounded-[1.75rem] border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--color-text-main)]/70 dark:bg-slate-900/60">
            <Sparkles className="h-4 w-4" />
            Засварлах горим
          </span>
        </div>
        <ProductForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          initialValues={mapProductToForm(product)}
          mode="edit"
        />
      </div>
    </div>
  );
}
