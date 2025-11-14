import React from 'react';
import { Upload, ImagePlus, X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface ProductFormValues {
  title: string;
  description: string;
  price: number;
  location: string;
  category: string;
  condition: 'new' | 'used';
  primaryImage: string; // main large image
  gallery: string[]; // up to 5 secondary images
  contact: string;
}

interface ProductFormProps {
  onSubmit: (values: ProductFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
  initialValues?: Partial<ProductFormValues>;
  mode?: 'create' | 'edit';
}

const categories = [
  { value: 'electronics', label: 'Цахилгаан бараа' },
  { value: 'fashion', label: 'Гоёл загвар' },
  { value: 'furniture', label: 'Тавилга' },
  { value: 'books', label: 'Ном' },
  { value: 'sports', label: 'Спорт, Гадаа' },
  { value: 'other', label: 'Бусад' },
];

const initialValues: ProductFormValues = {
  title: '',
  description: '',
  price: 0,
  location: 'Улаанбаатар',
  category: 'electronics',
  condition: 'new',
  primaryImage: '',
  gallery: [],
  contact: '',
};

export default function ProductForm({ onSubmit, isSubmitting = false, initialValues: initial = {}, mode = 'create' }: ProductFormProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [values, setValues] = React.useState<ProductFormValues>(() => ({
    ...initialValues,
    ...initial,
    primaryImage: initial.primaryImage ?? '',
    gallery: initial.gallery ?? [],
  }));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isTouched, setIsTouched] = React.useState<Record<string, boolean>>({});
  const [imagePreview, setImagePreview] = React.useState<string>('');
  const [galleryPreviews, setGalleryPreviews] = React.useState<string[]>([]);
  // hydrate previews if editing
  React.useEffect(() => {
    if (mode === 'edit') {
      setImagePreview(values.primaryImage || '');
      setGalleryPreviews(values.gallery || []);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const galleryInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const MAX_GALLERY = 5;
  const [activeCarouselIndex, setActiveCarouselIndex] = React.useState(0);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: name === 'price' ? Number(value) : value,
    }));
  };

  const markTouched = (field: string) => {
    setIsTouched((prev) => ({ ...prev, [field]: true }));
  };

  const clearPrimaryImage = () => {
    setValues((prev) => ({ ...prev, primaryImage: '' }));
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearGalleryImage = (idx: number) => {
    setValues((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== idx),
    }));
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== idx));
    if (galleryInputRefs.current[idx]) {
      galleryInputRefs.current[idx]!.value = '';
    }
    if (activeCarouselIndex >= galleryPreviews.length - 1) {
      setActiveCarouselIndex((p) => Math.max(0, p - 1));
    }
  };

  const processImageFile = (
    file: File,
    onSuccess: (dataUrl: string) => void,
    onErrorKey: string
  ) => {
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, [onErrorKey]: 'Зөвхөн зураг файл сонгоно уу.' }));
      return;
    }
    const maxSizeMb = 5;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, [onErrorKey]: `Файл ${maxSizeMb}MB-ээс бага байх ёстой.` }));
      return;
    }

    // Resize image to reduce size
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set max dimensions (reduce image size)
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to base64 with reduced quality
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        // Check if still too large (over 900KB)
        if (compressedDataUrl.length > 900000) {
          // Further compress
          const furtherCompressed = canvas.toDataURL('image/jpeg', 0.5);
          onSuccess(furtherCompressed);
        } else {
          onSuccess(compressedDataUrl);
        }

        setErrors((prev) => {
          const { [onErrorKey]: omit, ...rest } = prev as any; // eslint-disable-line @typescript-eslint/no-explicit-any
          return rest;
        });
      };
      img.onerror = () => {
        setErrors((prev) => ({ ...prev, [onErrorKey]: 'Зургийг уншихад алдаа гарлаа.' }));
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setErrors((prev) => ({ ...prev, [onErrorKey]: 'Зургийг уншихад алдаа гарлаа.' }));
    };
    reader.readAsDataURL(file);
  };

  const handlePrimaryFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    markTouched('primaryImage');
    if (!file) {
      clearPrimaryImage();
      setErrors((prev) => ({ ...prev, primaryImage: 'Зураг сонгоогүй байна.' }));
      return;
    }
    processImageFile(
      file,
      (dataUrl) => {
        setValues((prev) => ({ ...prev, primaryImage: dataUrl }));
        setImagePreview(dataUrl);
      },
      'primaryImage'
    );
  };

  const handleGalleryFileChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    markTouched('gallery');
    if (!file) {
      setErrors((prev) => ({ ...prev, gallery: 'Зураг сонгоогүй байна.' }));
      return;
    }
    processImageFile(
      file,
      (dataUrl) => {
        setValues((prev) => {
          const next = [...prev.gallery];
          if (index >= next.length) {
            next.push(dataUrl);
          } else {
            next[index] = dataUrl;
          }
            return { ...prev, gallery: next };
        });
        setGalleryPreviews((prev) => {
          const next = [...prev];
          if (index >= next.length) {
            next.push(dataUrl);
          } else {
            next[index] = dataUrl;
          }
          return next;
        });
        setActiveCarouselIndex(index);
      },
      'gallery'
    );
  };

  const validate = (vals: ProductFormValues) => {
    const nextErrors: Record<string, string> = {};

    if (!vals.title.trim()) {
      nextErrors.title = 'Гарчиг оруулна уу';
    }

    if (!vals.description.trim()) {
      nextErrors.description = 'Тайлбар оруулна уу';
    }

    if (!vals.price || vals.price <= 0) {
      nextErrors.price = 'Үнэ 0-ээс их байх ёстой';
    }

    if (!vals.primaryImage) {
      nextErrors.primaryImage = 'Үндсэн зураг шаардлагатай.';
    }
    if (vals.gallery.length === 0) {
      nextErrors.gallery = 'Дэд галерей дор хаяж 1 зурагтай байх.';
    }

    if (!vals.contact.trim()) {
      nextErrors.contact = 'Холбоо барих мэдээлэл оруулна уу';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  const requiredFields = ['title', 'description', 'price', 'contact', 'primaryImage', 'gallery'] as const;
    setIsTouched((prev) => ({
      ...prev,
      ...requiredFields.reduce<Record<string, boolean>>((acc, field) => {
        acc[field] = true;
        return acc;
      }, {}),
    }));

    const isValid = validate(values);

    if (!isValid) {
      return;
    }

    try {
      await onSubmit(values);
      if (mode === 'create') {
        setValues(initialValues);
        setErrors({});
        setIsTouched({});
        setImagePreview('');
        setGalleryPreviews([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        galleryInputRefs.current.forEach((el) => el && (el.value = ''));
      }
    } catch (error) {
      console.error('Product submission failed', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-text-main mb-1">
            Барааны нэр
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={values.title}
            onChange={handleChange}
            onBlur={() => markTouched('title')}
            className="w-full px-3 py-2 border border-border-main rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Жишээ: iPhone 15 Pro"
          />
          {isTouched.title && errors.title && (
            <p className="mt-1 text-xs text-red-500">{errors.title}</p>
          )}
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-text-main mb-1">
            Үнэ
          </label>
          <div className="flex gap-2 items-center">
            <span className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold">
              ₮
            </span>
            <input
              id="price"
              name="price"
              type="number"
              value={values.price === 0 ? '' : values.price}
              onChange={handleChange}
              onBlur={() => markTouched('price')}
              className="flex-1 px-3 py-2 border border-border-main rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Үнэ"
              min={0}
            />
          </div>
          {isTouched.price && errors.price && (
            <p className="mt-1 text-xs text-red-500">{errors.price}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-text-main mb-1">
          Тайлбар
        </label>
        <textarea
          id="description"
          name="description"
          value={values.description}
          onChange={handleChange}
          onBlur={() => markTouched('description')}
          className="w-full px-3 py-2 h-32 border border-border-main rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Барааны дэлгэрэнгүй мэдээлэл..."
        />
        {isTouched.description && errors.description && (
          <p className="mt-1 text-xs text-red-500">{errors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-text-main mb-1">
            Ангилал
          </label>
          <select
            id="category"
            name="category"
            value={values.category}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-border-main rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="condition" className="block text-sm font-medium text-text-main mb-1">
            Байдал
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-text-main">
              <input
                type="radio"
                name="condition"
                value="new"
                checked={values.condition === 'new'}
                onChange={handleChange}
              />
              Шинэ
            </label>
            <label className="flex items-center gap-2 text-sm text-text-main">
              <input
                type="radio"
                name="condition"
                value="used"
                checked={values.condition === 'used'}
                onChange={handleChange}
              />
              Хуучин
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-text-main mb-1">
            Байршил
          </label>
          <input
            id="location"
            name="location"
            type="text"
            value={values.location}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-border-main rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Жишээ: Улаанбаатар"
          />
        </div>

        <div>
          <label htmlFor="contact" className="block text-sm font-medium text-text-main mb-1">
            Холбоо барих
          </label>
          <input
            id="contact"
            name="contact"
            type="text"
            value={values.contact}
            onChange={handleChange}
            onBlur={() => markTouched('contact')}
            className="w-full px-3 py-2 border border-border-main rounded-md bg-bg-main text-text-main focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Утас эсвэл имэйл"
          />
          {isTouched.contact && errors.contact && (
            <p className="mt-1 text-xs text-red-500">{errors.contact}</p>
          )}
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-text-main mb-1">Зураг (1 үндсэн + 5 дэд)</span>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Primary large image uploader */}
          <div className="space-y-3 lg:col-span-1">
            <label
              htmlFor="primary-image"
              className="relative flex flex-col items-center justify-center aspect-square w-full border-2 border-dashed border-border-main rounded-xl bg-bg-main text-text-main hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors cursor-pointer overflow-hidden"
            >
              <input
                ref={fileInputRef}
                id="primary-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePrimaryFileChange}
              />
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Үндсэн зураг" className="absolute inset-0 h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); clearPrimaryImage(); }}
                    className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm hover:bg-black/70"
                    aria-label="Үндсэн зураг арилгах"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center px-4 text-center">
                  <ImagePlus className="h-12 w-12 mb-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold">Үндсэн зураг</span>
                  <span className="text-[11px] text-text-main/60 mt-1">JPG, PNG, HEIC · 5MB хүртэл</span>
                </div>
              )}
            </label>
            {isTouched.primaryImage && errors.primaryImage && (
              <p className="text-xs text-red-500">{errors.primaryImage}</p>
            )}
          </div>

          {/* Gallery uploader & carousel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-text-main">Дэд галерей ({values.gallery.length}/{MAX_GALLERY})</h4>
              {errors.gallery && isTouched.gallery && (
                <span className="text-xs text-red-500">{errors.gallery}</span>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {Array.from({ length: MAX_GALLERY }).map((_, idx) => {
                const src = galleryPreviews[idx];
                return (
                  <label
                    key={idx}
                    className="relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border-main/60 bg-bg-main text-text-main transition hover:border-blue-500 group"
                  >
                    <input
                      ref={(el) => (galleryInputRefs.current[idx] = el)}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleGalleryFileChange(idx, e)}
                    />
                    {src ? (
                      <>
                        <img src={src} alt={`Галерей ${idx + 1}`} className="absolute inset-0 h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); clearGalleryImage(idx); }}
                          className="absolute top-1.5 right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-black/80"
                          aria-label="Зураг устгах"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <ImagePlus className="h-6 w-6 mb-1 text-blue-500" />
                        <span className="text-[10px] font-medium leading-tight">Зураг {idx + 1}</span>
                      </div>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Carousel preview when many images */}
            {galleryPreviews.length > 0 && (
              <div className="relative rounded-xl border border-border-main/40 bg-bg-main/70 p-3 backdrop-blur-sm">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black/5">
                  <img
                    src={galleryPreviews[activeCarouselIndex]}
                    alt="Сонгосон дэд зураг"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    disabled={activeCarouselIndex === 0}
                    onClick={() => setActiveCarouselIndex((p) => Math.max(0, p - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-40"
                    aria-label="Өмнөх"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    disabled={activeCarouselIndex === galleryPreviews.length - 1}
                    onClick={() => setActiveCarouselIndex((p) => Math.min(galleryPreviews.length - 1, p + 1))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-40"
                    aria-label="Дараах"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  {galleryPreviews.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveCarouselIndex(i)}
                      className={`h-2.5 w-2.5 rounded-full transition ${i === activeCarouselIndex ? 'bg-blue-600 scale-110' : 'bg-border-main/40 hover:bg-border-main/70'}`}
                      aria-label={`Зураг ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
      >
        <Upload className="h-5 w-5" />
        {isSubmitting ? (mode === 'edit' ? 'Шинэчилж байна...' : 'Илгээж байна...') : mode === 'edit' ? 'Барааг шинэчлэх' : 'Бараа нэмэх'}
      </button>
    </form>
  );
}
