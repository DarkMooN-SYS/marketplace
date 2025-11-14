import { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  HelpCircle,
  ShoppingBag,
  Newspaper,
  Shield,
  Wallet,
  Settings,
  UserCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  supportChatStore,
  type SupportChatMessage,
} from '../utils/supportChatStore';

interface Message {
  id: string;
  type: 'user' | 'bot';
  text: string;
  timestamp: Date;
  quickReplies?: QuickReply[];
}

interface QuickReply {
  id: string;
  text: string;
  action: string;
}

// FAQ Categories and Questions
const FAQ_DATA = {
  // Context-specific help
  'help:survey-create': {
    title: 'Судалгаа үүсгэх',
    icon: HelpCircle,
    questions: [
      {
        q: 'Хэрхэн судалгаа үүсгэх вэ?',
        a: '1. Судалгааны гарчиг, тайлбар бичнэ\n2. Асуултуудаа нэмнэ (олон сонголттой, текст, үнэлгээ)\n3. Хугацаа, зорилтот хүмүүсийн тоо тогтооно\n4. Урамшуулал оноож, админд илгээнэ\n\n✅ Админ 15-30 минутын дотор шалгаж баталгаажуулна.'
      }
    ]
  },
  'help:survey-reward': {
    title: 'Урамшуулал',
    icon: HelpCircle,
    questions: [
      {
        q: 'Ямар урамшуулал өгч болох вэ?',
        a: '💰 **Мөнгөн урамшуулал**: Хэтэвч рүү шууд шилжинэ\n🎁 **Оноо**: Membership level өсгөх\n🎟️ **Бэлэг код**: Купон, voucher\n\n⚠️ Нийт урамшууллын төсвөө урьдчилан тооцоолоорой!'
      }
    ]
  },
  'help:survey-approve': {
    title: 'Баталгаажуулалт',
    icon: HelpCircle,
    questions: [
      {
        q: 'Баталгаажуулалтын үе ямар байдаг вэ?',
        a: '1️⃣ Та судалгаа илгээнэ\n2️⃣ Админ 15-30 мин дотор шалгана\n3️⃣ Асуулгын чанар, урамшуулал зохистой эсэхийг үзнэ\n4️⃣ Баталгаажсан бол marketplace дээр гарна\n5️⃣ Татгалзсан бол шалтгаан илгээнэ\n\n💡 Санал хүсэлт байвал админтай холбогдоорой!'
      }
    ]
  },
  'help:link-submit': {
    title: 'Холбоос илгээх',
    icon: HelpCircle,
    questions: [
      {
        q: 'Вэб холбоос хэрхэн илгээх вэ?',
        a: '1. Landing page URL-аа бэлтгэнэ\n2. Гарчиг, товч тайлбар бичнэ\n3. Thumbnail зураг оруулна (1200x630 px)\n4. Зорилтот хэрэглэгч, категори сонгоно\n5. Админд илгээнэ\n\n⏱️ 10-20 минутын дотор баталгаажна!'
      }
    ]
  },
  'help:link-utm': {
    title: 'UTM tracking',
    icon: HelpCircle,
    questions: [
      {
        q: 'UTM параметр яаж тохируулах вэ?',
        a: '📊 **UTM parameters**:\n- utm_source=3say\n- utm_medium=marketplace\n- utm_campaign=your_campaign_name\n\n🔗 Жишээ:\nhttps://yoursite.com?utm_source=3say&utm_medium=marketplace&utm_campaign=spring2024\n\n✅ Google Analytics дээр хэрхэн ирснийг харна!'
      }
    ]
  },
  'help:link-banner': {
    title: 'Баннер шаардлага',
    icon: HelpCircle,
    questions: [
      {
        q: 'Баннер зургийн шаардлага юу вэ?',
        a: '🖼️ **Баннер specification**:\n- Хэмжээ: 1200x630 px (OG image standard)\n- Формат: JPG, PNG\n- Багтаамж: < 500KB\n- Чанар: High resolution\n\n✨ Гарчиг, лого тод харагдах ёстой!\n📱 Мобайл дээр сайн харагдахаар бэлтгэнэ үү.'
      }
    ]
  },
  'help:ad-create': {
    title: 'Зар үүсгэх',
    icon: HelpCircle,
    questions: [
      {
        q: 'Сурталчилгаа хэрхэн үүсгэх вэ?',
        a: '1. Кампаний нэр, зорилго тодорхойлно\n2. Зорилтот сегмент сонгоно (нас, хүйс, газар)\n3. Төсөв, хугацаа тогтооно\n4. Креатив материал оруулна (зураг/видео)\n5. Админд илгээнэ\n\n🎯 Админ 20-30 минутын дотор зөвлөгөө өгч баталгаажуулна!'
      }
    ]
  },
  'help:ad-budget': {
    title: 'Төсөв',
    icon: HelpCircle,
    questions: [
      {
        q: 'Төсөв хэрхэн тогтоох вэ?',
        a: '💰 **Төсвийн төрөл**:\n- Өдрийн төсөв: Өдөр тутмын max дүн\n- Нийт төсөв: Campaign-ий total budget\n\n📊 **Үнийн түвшин**:\n- Banner ads: 50,000-200,000₮/day\n- Push notification: 100,000-500,000₮/campaign\n- Featured listing: 30,000-100,000₮/week\n\n✅ Санхүүгийн зөвлөгөө авахыг хүсвэл админтай холбогдоорой!'
      }
    ]
  },
  'help:ad-material': {
    title: 'Материал бэлтгэх',
    icon: HelpCircle,
    questions: [
      {
        q: 'Ямар материал шаардлагатай вэ?',
        a: '🎨 **Креатив материал**:\n\n📸 **Зураг**:\n- Banner: 1200x630 px\n- Square: 1080x1080 px\n- Story: 1080x1920 px\n\n🎥 **Видео**:\n- Формат: MP4, MOV\n- Хугацаа: 15-60 sec\n- Багтаамж: < 50MB\n\n✍️ **Текст**:\n- Гарчиг: 30-50 тэмдэгт\n- Тайлбар: 100-150 тэмдэгт\n- CTA button текст'
      }
    ]
  },
  marketplace: {
    title: 'Зах зээл',
    icon: ShoppingBag,
    questions: [
      {
        q: 'Хэрхэн бараа зарах вэ?',
        a: 'Marketplace хуудас руу орж "Бараа нэмэх" товч дарна. Бараагийн мэдээлэл, зураг оруулж, үнэ тогтоогоод хадгална. Таны бараа шууд маркет дээр гарна.'
      },
      {
        q: 'Миний хадгалсан бараа хаана харагдах вэ?',
        a: 'Profile хуудас руу орж "Хадгалсан" tab дээр дарвал хадгалсан бүх бараа харагдана. Зүрх товч дарж хадгалсан бараа автоматаар тэнд хадгалагдана.'
      },
      {
        q: 'Бараа хэрхэн хайх вэ?',
        a: 'Marketplace дээр ангилал, үнэ, байдал гэх мэт filter ашиглан хайлт хийж болно. Мөн хайлтын талбарт нэрээр нь хайж болно.'
      },
      {
        q: 'Борлуулагчтай хэрхэн холбогдох вэ?',
        a: 'Бараа дээр дарж дэлгэрэнгүй харахад борлуулагчийн холбоо барих мэдээлэл харагдана. Тэндээс шууд холбогдож болно.'
      },
      {
        q: 'Сэтгэгдэл хэрхэн үлдээх вэ?',
        a: 'Бараа дээр дарж дэлгэрэнгүй хуудас руу орно. Доош скролл хийж "Сэтгэгдэл үлдээх" хэсэгт үнэлгээ, текст бичээд илгээнэ.'
      },
      {
        q: 'Барааны үзэлт яаж тоологддог вэ?',
        a: 'Та бараа дээр дарах бүрт үзэлт +1 нэмэгдэнэ. Таны үзсэн бараа localStorage дээр хадгалагдаж давхардахгүй.'
      }
    ]
  },
  wallet: {
    title: 'Хэтэвч',
    icon: Wallet,
    questions: [
      {
        q: 'Хэрхэн мөнгө оруулах вэ?',
        a: 'Wallet цэс рүү орж "Цэнэглэх" товч дарна. Дүн сонгоод QPay эсвэл банкны картаар төлнө. Мөнгө шууд орж ирнэ.'
      },
      {
        q: 'Хэрхэн мөнгө татах вэ?',
        a: 'Wallet дээр "Татах" товч дарж дүн оруулна. Банкны данс сонгоод илгээнэ. 1-2 хоногт данс руу орно.'
      },
      {
        q: 'Гүйлгээний түүх хаана харах вэ?',
        a: 'Profile → Төлбөрүүд tab дээр бүх гүйлгээний түүх харагдана. Цэнэглэлт, зарлага, огноо бүгд харагдана.'
      },
      {
        q: 'Үлдэгдэл баланс хаана харах вэ?',
        a: 'Header дээрх Wallet товч дарвал таны үлдэгдэл харагдана. Profile → Хураангуй дээр ч харж болно.'
      }
    ]
  },
  news: {
    title: 'Мэдээ',
    icon: Newspaper,
    questions: [
      {
        q: 'Хэрхэн мэдээ уншиж, хадгалах вэ?',
        a: 'News хуудас руу орж сонирхолтой мэдээ дээр дарна. Зүрх товч дарж таалагдсан мэдээгээ хадгална. Profile → Хадгалсан дээр дахин харж болно.'
      },
      {
        q: 'Мэдээг хэрхэн ангилах вэ?',
        a: 'News хуудсан дээр ангилал filter ашиглан Технологи, Бизнес, Байгаль орчин гэх мэт ангиллаар шүүж болно.'
      },
      {
        q: 'Тренд мэдээ гэж юу вэ?',
        a: 'Хамгийн их үзсэн, таалагдсан мэдээнүүд "Тренд" гэсэн тэмдэгтэй харагдана. Эдгээр нь хамгийн их анхаарал татсан мэдээнүүд.'
      }
    ]
  },
  profile: {
    title: 'Профайл',
    icon: Settings,
    questions: [
      {
        q: 'Профайл мэдээллээ хэрхэн засах вэ?',
        a: 'Profile → "Профайл засах" tab дээр нэр, зураг, утас, хаяг зэрэг мэдээллээ засч болно. Хадгалах товч дарвал шууд шинэчлэгдэнэ.'
      },
      {
        q: 'Нууц үгээ хэрхэн солих вэ?',
        a: 'Profile → Аюулгүй байдал tab дээр "Нууц үг солих" хэсэгт хуучин болон шинэ нууц үгээ оруулна.'
      },
      {
        q: 'Нэвтэрсэн төхөөрөмжүүд хаана харагдах вэ?',
        a: 'Profile → Аюулгүй байдал tab дээр таны бүх төхөөрөмжүүд харагдана. Аль нэгийг нь гаргаж эсвэл бүгдийг нь гаргаж болно.'
      },
      {
        q: 'Захиалгын түүхээ хэрхэн харах вэ?',
        a: 'Profile → Захиалгууд tab дээр бүх захиалгын түүх, төлөв харагдана.'
      }
    ]
  },
  security: {
    title: 'Аюулгүй байдал',
    icon: Shield,
    questions: [
      {
        q: 'Эрхээ хэрхэн хамгаалах вэ?',
        a: 'Хүчтэй нууц үг ашиглана. Бусдад хуваалцахгүй. Нэвтэрсэн төхөөрөмжүүдээ тогтмол шалгана. Сэжигтэй үйл ажиллагаа харвал шууд нууц үгээ солино.'
      },
      {
        q: 'Төхөөрөмж алдвал юу хийх вэ?',
        a: 'Profile → Аюулгүй байдал руу орж "Бүх төхөөрөмжөөс гарах" товч дарна. Дараа нь нууц үгээ солино. Ингэснээр алдсан төхөөрөмжөөс нэвтрэх боломжгүй болно.'
      },
      {
        q: 'SMS баталгаажуулалт ямар ашигтай вэ?',
        a: 'SMS код нь нэмэлт хамгаалалт. Утасны дугаар баталгаажсан тул зөвхөн та л нэвтрэх боломжтой.'
      },
      {
        q: 'Session гэж юу вэ?',
        a: 'Session буюу хандалтын эрх нь та нэвтэрсэн төхөөрөмж бүр дээр үүсдэг. Profile → Аюулгүй байдал дээр бүх session-ээ харж, устгаж болно.'
      }
    ]
  },
  general: {
    title: 'Ерөнхий',
    icon: HelpCircle,
    questions: [
      {
        q: 'Сайт хэрхэн ашиглах вэ?',
        a: 'Header дээрх цэснээс хуудас сонгоно: Home, Marketplace, News, Profile гэх мэт. Бүх функц нь товчтой, ойлгомжтой байгаа.'
      },
      {
        q: 'Бүртгэл хэрхэн үүсгэх вэ?',
        a: 'Header дээрх "Нэвтрэх" товч дарж "Бүртгүүлэх" сонгоно. Имэйл, нууц үг оруулаад бүртгүүлнэ. SMS код илгээгдэж баталгаажна.'
      },
      {
        q: 'Харанхуй горим хэрхэн асаах вэ?',
        a: 'Header дээрх сар/нар icon дарвал Dark/Light mode солигдоно. Таны сонголт хадгалагдана.'
      },
      {
        q: 'Notification хэрхэн ажилладаг вэ?',
        a: 'Шинэ мэдээлэл, захиалга, сэтгэгдэл ирэх бүрд notification ирнэ. Header дээрх хонх icon дарж харна.'
      },
      {
        q: 'Хэл солих боломжтой юу?',
        a: 'Одоогоор зөвхөн монгол хэл дэмжигдсэн. Цаашид англи хэл нэмэгдэх болно.'
      }
    ]
  }
};

const CONTEXT_MESSAGES: Record<string, { text: string; quickReplies: QuickReply[] }> = {
  survey: {
    text: 'Сайн байна уу! 👋 Би судалгаа илгээх процесст танд туслах бот.\n\n📊 Судалгааны зорилго, хугацаа, урамшууллын талаар асуугаарай!',
    quickReplies: [
      { id: 'survey-create', text: '📝 Хэрхэн судалгаа үүсгэх', action: 'help:survey-create' },
      { id: 'survey-reward', text: '🎁 Урамшуулал оноох', action: 'help:survey-reward' },
      { id: 'survey-approve', text: '✅ Баталгаажуулалтын үе', action: 'help:survey-approve' },
      { id: 'contact-admin', text: '👨‍💼 Админтай холбогдох', action: 'contact-admin' }
    ]
  },
  weblink: {
    text: 'Сайн байна уу! 👋 Би вэб холбоос илгээх процесст танд туслах бот.\n\n🔗 Landing page, UTM tracking, баннер зураг талаар асуугаарай!',
    quickReplies: [
      { id: 'link-submit', text: '🔗 Холбоос илгээх', action: 'help:link-submit' },
      { id: 'link-utm', text: '📊 UTM тохиргоо', action: 'help:link-utm' },
      { id: 'link-banner', text: '🖼️ Баннер шаардлага', action: 'help:link-banner' },
      { id: 'contact-admin', text: '👨‍💼 Админтай холбогдох', action: 'contact-admin' }
    ]
  },
  advertisement: {
    text: 'Сайн байна уу! 👋 Би сурталчилгаа илгээх процесст танд туслах бот.\n\n📢 Кампаний зорилго, төсөв, материал талаар асуугаарай!',
    quickReplies: [
      { id: 'ad-create', text: '📢 Зар үүсгэх', action: 'help:ad-create' },
      { id: 'ad-budget', text: '💰 Төсөв тогтоох', action: 'help:ad-budget' },
      { id: 'ad-material', text: '🎨 Материал бэлтгэх', action: 'help:ad-material' },
      { id: 'contact-admin', text: '👨‍💼 Админтай холбогдох', action: 'contact-admin' }
    ]
  },
  general: {
    text: 'Сайн байна уу! 👋 Би таны туслах бот. Би танд вэбсайтын хэрэглээний талаар тусалж чадна.',
    quickReplies: [
      { id: 'marketplace', text: '🛍️ Зах зээл', action: 'category:marketplace' },
      { id: 'wallet', text: '💳 Хэтэвч', action: 'category:wallet' },
      { id: 'news', text: '📰 Мэдээ', action: 'category:news' },
      { id: 'profile', text: '⚙️ Профайл', action: 'category:profile' },
      { id: 'security', text: '🔒 Аюулгүй байдал', action: 'category:security' },
      { id: 'general', text: '❓ Ерөнхий', action: 'category:general' },
      { id: 'contact-admin', text: '👨‍💼 Админтай холбогдох', action: 'contact-admin' }
    ]
  }
};

const getInitialMessage = (context: string): Message => ({
  id: '0',
  type: 'bot',
  text: CONTEXT_MESSAGES[context]?.text || CONTEXT_MESSAGES.general.text,
  timestamp: new Date(),
  quickReplies: CONTEXT_MESSAGES[context]?.quickReplies || CONTEXT_MESSAGES.general.quickReplies
});

interface ChatbotPanelProps {
  context?: 'survey' | 'weblink' | 'advertisement' | 'general';
}

export default function ChatbotPanel({ context = 'general' }: ChatbotPanelProps) {
  const { user } = useAuth();
  const initialMessage = getInitialMessage(context);
  const [isOpen, setIsOpen] = useState(false);
  const [chatMode, setChatMode] = useState<'faq' | 'admin'>('faq');
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [adminMessages, setAdminMessages] = useState<SupportChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [adminOnline, setAdminOnline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, adminMessages]);

  // Sync admin chat
  useEffect(() => {
    if (!user?.id || chatMode !== 'admin') return;
    
    const syncAdminChat = () => {
      const thread = supportChatStore.getThread(user.id!);
      setAdminMessages(thread?.messages ?? []);
      if (thread?.unreadByUser) {
        supportChatStore.markUserRead(user.id!);
      }
    };

    syncAdminChat();
    window.addEventListener('support-chat:sync', syncAdminChat);

    const statusHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { online?: boolean };
      if (detail && typeof detail.online === 'boolean') {
        setAdminOnline(detail.online);
      }
    };
    window.addEventListener('admin:status', statusHandler);

    return () => {
      window.removeEventListener('support-chat:sync', syncAdminChat);
      window.removeEventListener('admin:status', statusHandler);
    };
  }, [user?.id, chatMode]);

  const addBotMessage = (text: string, quickReplies?: QuickReply[]) => {
    setIsTyping(true);
    setTimeout(() => {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: 'bot',
        text,
        timestamp: new Date(),
        quickReplies
      };
      setMessages(prev => [...prev, newMessage]);
      setIsTyping(false);
    }, 500); // Simulate typing delay
  };

  const addUserMessage = (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleCategorySelect = (categoryKey: keyof typeof FAQ_DATA) => {
    const category = FAQ_DATA[categoryKey];
    addUserMessage(category.title);
    
    const questionList = category.questions
      .map((q, i) => `${i + 1}. ${q.q}`)
      .join('\n');
    
    addBotMessage(
      `${category.title}-н талаархи асуултууд:\n\n${questionList}\n\nАсуултын дугаар сонгоно уу:`,
      category.questions.map((_, i) => ({
        id: `${categoryKey}-${i}`,
        text: `${i + 1}`,
        action: `answer:${categoryKey}:${i}`
      }))
    );
  };

  const handleAnswerSelect = (categoryKey: string, questionIndex: number) => {
    const category = FAQ_DATA[categoryKey as keyof typeof FAQ_DATA];
    if (!category) return;
    
    const qa = category.questions[questionIndex];
    if (!qa) return;
    
    addUserMessage(qa.q);
    addBotMessage(
      qa.a + '\n\n' + 'Өөр асуулт байвал сонгоно уу:',
      [
        { id: 'back', text: '⬅️ Буцах', action: `category:${categoryKey}` },
        { id: 'main', text: '🏠 Үндсэн цэс', action: 'main' }
      ]
    );
  };

  const handleQuickReply = (action: string) => {
    // Handle help actions (context-specific)
    if (action.startsWith('help:')) {
      const helpKey = action;
      const helpCategory = FAQ_DATA[helpKey as keyof typeof FAQ_DATA];
      if (helpCategory && helpCategory.questions.length > 0) {
        const qa = helpCategory.questions[0];
        addUserMessage(qa.q);
        addBotMessage(
          qa.a + '\n\n💬 Өөр асуулт байвал админтай холбогдоорой!',
          [
            { id: 'contact-admin', text: '👨‍💼 Админтай холбогдох', action: 'contact-admin' },
            { id: 'main', text: '🏠 Үндсэн цэс', action: 'main' }
          ]
        );
        return;
      }
    }

    if (action === 'contact-admin') {
      if (!user) {
        addUserMessage('Админтай холбогдох');
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          addBotMessage(
            '� Админтай шууд чатлахын тулд нэвтрэх шаардлагатай.\n\nНэвтэрсний дараа админ та нартай шууд харилцах боломжтой болно.',
            [
              { id: 'main', text: '🏠 Үндсэн цэс', action: 'main' }
            ]
          );
        }, 500);
        
        // Open login modal after 1 second
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('auth:open', { detail: { mode: 'login' } }));
        }, 1000);
        return;
      }

      // Switch to admin chat mode
      setChatMode('admin');
      addUserMessage('Админтай чатлах');
      
      // Load admin chat messages
      const thread = supportChatStore.getThread(user.id!);
      setAdminMessages(thread?.messages ?? []);
      
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        if (thread?.messages.length === 0) {
          // Send initial greeting to admin based on context
          const contextGreeting: Record<string, string> = {
            survey: 'Сайн байна уу! Би судалгаа илгээх талаар асуулттай байна.',
            weblink: 'Сайн байна уу! Би вэб холбоос илгээх талаар асуулттай байна.',
            advertisement: 'Сайн байна уу! Би сурталчилгаа илгээх талаар асуулттай байна.',
            general: 'Сайн байна уу! Би chatbot-оос ирлээ. Надад туслаач.'
          };
          
          const greeting = contextGreeting[context] || contextGreeting.general;
          const contextType = (context === 'general' ? 'advertisement' : context) as 'survey' | 'weblink' | 'advertisement';
          
          supportChatStore.addUserMessage({
            userId: user.id!,
            userName: user.name || 'Хэрэглэгч',
            userAvatar: user.avatar || undefined,
            body: greeting,
            context: contextType
          });
          window.dispatchEvent(new Event('support-chat:sync'));
        }
      }, 300);
      return;
    }

    if (action === 'main') {
      addUserMessage('Үндсэн цэс');
      addBotMessage(
        'Юуны талаар асуумаар байна?',
        initialMessage.quickReplies
      );
      return;
    }

    if (action.startsWith('category:')) {
      const categoryKey = action.split(':')[1] as keyof typeof FAQ_DATA;
      handleCategorySelect(categoryKey);
      return;
    }

    if (action.startsWith('answer:')) {
      const [, categoryKey, indexStr] = action.split(':');
      handleAnswerSelect(categoryKey, parseInt(indexStr));
      return;
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    if (chatMode === 'admin') {
      // Send to admin chat
      if (!user?.id) return;
      
      supportChatStore.addUserMessage({
        userId: user.id,
        userName: user.name || 'Хэрэглэгч',
        userAvatar: user.avatar || undefined,
        body: inputText.trim(),
        context: 'advertisement'
      });
      
      window.dispatchEvent(new Event('support-chat:sync'));
      setInputText('');
      return;
    }

    addUserMessage(inputText);

    // Enhanced keyword matching with synonyms
    const lowerInput = inputText.toLowerCase();
    let found = false;

    // Check for admin contact keywords
    if (lowerInput.includes('админ') || lowerInput.includes('холбогдох') || lowerInput.includes('тусламж')) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addBotMessage(
          '👨‍💼 Админтай холбогдох:\n\n📧 И-мэйл: admin@3say.mn\n📱 Утас: +976 8888-8888\n💬 Facebook: facebook.com/3say\n\nТа эдгээр хаягаар асуулт, санал хүсэлтээ илгээх боломжтой.',
          [
            { id: 'main', text: '🏠 Үндсэн цэс', action: 'main' }
          ]
        );
      }, 500);
      setInputText('');
      return;
    }

    // Keyword mappings for better matching
    const keywords: Record<string, string[]> = {
      marketplace: ['бараа', 'зарах', 'худалдаа', 'борлуулах', 'хадгалсан', 'зах', 'маркет'],
      wallet: ['мөнгө', 'хэтэвч', 'цэнэглэх', 'татах', 'баланс', 'үлдэгдэл', 'төлбөр'],
      news: ['мэдээ', 'нийтлэл', 'уншиж', 'тренд'],
      profile: ['профайл', 'засах', 'мэдээлэл', 'нэр', 'зураг', 'захиалга'],
      security: ['аюулгүй', 'нууц үг', 'төхөөрөмж', 'session', 'гарах', 'нэвтрэх'],
      general: ['хэрхэн', 'ашиглах', 'бүртгэл', 'харанхуй', 'notification', 'хэл']
    };

    // Check if input matches any keyword category
    for (const [categoryKey, words] of Object.entries(keywords)) {
      if (words.some(word => lowerInput.includes(word))) {
        // Search in that category first
        const category = FAQ_DATA[categoryKey as keyof typeof FAQ_DATA];
        if (category) {
          for (let i = 0; i < category.questions.length; i++) {
            const qa = category.questions[i];
            if (
              qa.q.toLowerCase().includes(lowerInput) ||
              qa.a.toLowerCase().includes(lowerInput) ||
              lowerInput.split(' ').some(word => 
                qa.q.toLowerCase().includes(word) || qa.a.toLowerCase().includes(word)
              )
            ) {
              addBotMessage(
                `${qa.q}\n\n${qa.a}\n\nӨөр асуулт байвал сонгоно уу:`,
                [
                  { id: 'back', text: '⬅️ Буцах', action: `category:${categoryKey}` },
                  { id: 'main', text: '🏠 Үндсэн цэс', action: 'main' }
                ]
              );
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }
    }

    // If not found in keyword categories, search all
    if (!found) {
      for (const [categoryKey, category] of Object.entries(FAQ_DATA)) {
        for (let i = 0; i < category.questions.length; i++) {
          const qa = category.questions[i];
          if (
            qa.q.toLowerCase().includes(lowerInput) ||
            qa.a.toLowerCase().includes(lowerInput) ||
            lowerInput.split(' ').some(word => 
              word.length > 2 && (qa.q.toLowerCase().includes(word) || qa.a.toLowerCase().includes(word))
            )
          ) {
            addBotMessage(
              `${qa.q}\n\n${qa.a}\n\nӨөр асуулт байвал сонгоно уу:`,
              [
                { id: 'back', text: '⬅️ Буцах', action: `category:${categoryKey}` },
                { id: 'main', text: '🏠 Үндсэн цэс', action: 'main' }
              ]
            );
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }

    if (!found) {
      addBotMessage(
        'Уучлаарай, энэ асуултын хариулт одоогоор байхгүй байна. 😔\n\nДараах ангиллаас сонгох эсвэл админтай холбогдоно уу:',
        [
          { id: 'marketplace', text: '🛍️ Зах зээл', action: 'category:marketplace' },
          { id: 'wallet', text: '💳 Хэтэвч', action: 'category:wallet' },
          { id: 'news', text: '📰 Мэдээ', action: 'category:news' },
          { id: 'contact-admin', text: '👨‍💼 Админтай холбогдох', action: 'contact-admin' },
          { id: 'main', text: '🏠 Үндсэн цэс', action: 'main' }
        ]
      );
    }

    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpenChat = () => {
    if (!user) {
      // Show login prompt if not authenticated
      window.dispatchEvent(new CustomEvent('auth:open', { detail: { mode: 'login' } }));
      return;
    }
    setIsOpen(true);
  };

  // Don't show chatbot for admin users
  if (user?.role === 'admin') {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={handleOpenChat}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl dark:from-blue-600 dark:to-blue-700"
          title={user ? 'Туслах бот' : 'Нэвтрэх шаардлагатай'}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[380px] flex-col rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] shadow-2xl dark:bg-slate-900">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                {chatMode === 'admin' ? <UserCircle className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-semibold">{chatMode === 'admin' ? 'Админ чат' : 'Туслах Бот'}</h3>
                <p className="text-xs opacity-90">
                  {chatMode === 'admin' 
                    ? adminOnline 
                      ? '🟢 Админ онлайн байна' 
                      : '⚪ Админ оффлайн'
                    : 'Танд туслахад бэлэн байна'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {chatMode === 'admin' && (
                <button
                  onClick={() => {
                    setChatMode('faq');
                    setMessages([initialMessage]);
                  }}
                  className="rounded-full p-1 transition hover:bg-white/20"
                  title="FAQ руу буцах"
                >
                  <Bot className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 transition hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMode === 'faq' && messages.map((message) => (
              <div key={message.id}>
                {/* Message Bubble */}
                <div
                  className={`flex items-start gap-2 ${
                    message.type === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-slate-700'
                    }`}
                  >
                    {message.type === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{message.text}</p>
                  </div>
                </div>

                {/* Quick Replies */}
                {message.quickReplies && message.quickReplies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 pl-10">
                    {message.quickReplies.map((reply) => (
                      <button
                        key={reply.id}
                        onClick={() => handleQuickReply(reply.action)}
                        className="rounded-full border border-blue-500 bg-white px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700"
                      >
                        {reply.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Admin Chat Messages */}
            {chatMode === 'admin' && adminMessages.map((msg) => (
              <div key={msg.id}>
                <div
                  className={`flex items-start gap-2 ${
                    msg.author === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      msg.author === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-green-500 text-white'
                    }`}
                  >
                    {msg.author === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <UserCircle className="h-4 w-4" />
                    )}
                  </div>

                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      msg.author === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{msg.body}</p>
                    <p className="mt-1 text-xs opacity-70">
                      {new Date(msg.createdAt).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-slate-700">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-slate-800">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[var(--color-border-soft)] p-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Асуултаа бичнэ үү..."
                className="flex-1 rounded-full border border-[var(--color-border-soft)] bg-white px-4 py-2 text-sm text-[var(--color-text-main)] outline-none focus:border-blue-500 dark:bg-slate-800 dark:text-white"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
              <HelpCircle className="inline h-3 w-3 mr-1" />
              Асуулт эсвэл түлхүүр үг бичиж хайна уу
            </p>
          </div>
        </div>
      )}
    </>
  );
}
