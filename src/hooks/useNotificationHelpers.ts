import { useNotifications } from './useNotifications';

/**
 * Helper hook for common notification patterns
 */
export function useNotificationHelpers() {
  const { addNotification } = useNotifications();

  return {
    // Success notifications
    notifyProductApproved: (productTitle: string) => {
      addNotification({
        type: 'success',
        title: 'Бараа батлагдлаа',
        message: `Таны "${productTitle}" бараа амжилттай батлагдлаа.`,
        actionUrl: 'marketplace',
        actionLabel: 'Үзэх',
      });
    },

    notifyProductRejected: (productTitle: string, reason?: string) => {
      addNotification({
        type: 'error',
        title: 'Бараа татгалзсан',
        message: reason || `Таны "${productTitle}" бараа татгалзагдлаа.`,
        actionUrl: 'submit-product',
        actionLabel: 'Засах',
      });
    },

    notifyOrderReceived: (orderId: string) => {
      addNotification({
        type: 'info',
        title: 'Шинэ захиалга',
        message: `Таны барааг захиалсан байна. Захиалгын дугаар: #${orderId}`,
        actionUrl: 'profile/orders',
        actionLabel: 'Захиалга үзэх',
      });
    },

    notifyAdvertisementApproved: (adTitle: string) => {
      addNotification({
        type: 'success',
        title: 'Зар батлагдлаа',
        message: `Таны "${adTitle}" зар нийтлэгдэж эхэллээ.`,
        actionUrl: 'home',
        actionLabel: 'Харах',
      });
    },

    notifyAdvertisementRejected: (adTitle: string) => {
      addNotification({
        type: 'error',
        title: 'Зар татгалзсан',
        message: `Таны "${adTitle}" зар татгалзагдлаа.`,
        actionUrl: 'admin/advertisements',
        actionLabel: 'Засах',
      });
    },

    notifySurveyApproved: (surveyTitle: string) => {
      addNotification({
        type: 'success',
        title: 'Судалгаа батлагдлаа',
        message: `Таны "${surveyTitle}" судалгаа нийтлэгдлээ.`,
        actionUrl: 'surveys',
        actionLabel: 'Үзэх',
      });
    },

    notifyNewsPublished: (newsTitle: string) => {
      addNotification({
        type: 'info',
        title: 'Шинэ мэдээ',
        message: `"${newsTitle}" мэдээ нийтлэгдлээ.`,
        actionUrl: 'news',
        actionLabel: 'Унших',
      });
    },

    notifyWebLinkApproved: (linkTitle: string) => {
      addNotification({
        type: 'success',
        title: 'Холбоос батлагдлаа',
        message: `Таны "${linkTitle}" холбоос нийтлэгдлээ.`,
        actionUrl: 'weblinks',
        actionLabel: 'Үзэх',
      });
    },

    notifyReviewReceived: (productTitle: string, rating: number) => {
      addNotification({
        type: 'info',
        title: 'Шинэ үнэлгээ',
        message: `Таны "${productTitle}" бараанд ${rating} од үнэлгээ өгсөн байна.`,
        actionUrl: 'profile/reviews',
        actionLabel: 'Үзэх',
      });
    },

    notifyWalletTopUp: (amount: number) => {
      addNotification({
        type: 'success',
        title: 'Хэтэвч цэнэглэгдлээ',
        message: `Таны хэтэвчид ${amount.toLocaleString()}₮ нэмэгдлээ.`,
        actionUrl: 'wallet',
        actionLabel: 'Хэтэвч үзэх',
      });
    },

    notifyWithdrawalSuccess: (amount: number) => {
      addNotification({
        type: 'success',
        title: 'Мөнгө татах амжилттай',
        message: `${amount.toLocaleString()}₮ таны данс руу шилжүүлэгдлээ.`,
        actionUrl: 'wallet',
        actionLabel: 'Түүх үзэх',
      });
    },

    notifySystemMaintenance: () => {
      addNotification({
        type: 'warning',
        title: 'Засвар үйлчилгээ',
        message: 'Систем удахгүй засвар үйлчилгээнд орно. Таны ажил хадгалагдах болно.',
      });
    },

    notifyPasswordChanged: () => {
      addNotification({
        type: 'success',
        title: 'Нууц үг солигдлоо',
        message: 'Таны нууц үг амжилттай солигдлоо.',
      });
    },

    notifyProfileUpdated: () => {
      addNotification({
        type: 'success',
        title: 'Профайл шинэчлэгдлээ',
        message: 'Таны профайлын мэдээлэл амжилттай шинэчлэгдлээ.',
        actionUrl: 'profile',
        actionLabel: 'Профайл үзэх',
      });
    },

    // Generic notifications
    notifySuccess: (title: string, message: string, actionUrl?: string) => {
      addNotification({
        type: 'success',
        title,
        message,
        actionUrl,
        actionLabel: actionUrl ? 'Үзэх' : undefined,
      });
    },

    notifyError: (title: string, message: string) => {
      addNotification({
        type: 'error',
        title,
        message,
      });
    },

    notifyInfo: (title: string, message: string, actionUrl?: string) => {
      addNotification({
        type: 'info',
        title,
        message,
        actionUrl,
        actionLabel: actionUrl ? 'Үзэх' : undefined,
      });
    },

    notifyWarning: (title: string, message: string) => {
      addNotification({
        type: 'warning',
        title,
        message,
      });
    },
  };
}
