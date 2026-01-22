import type { Lang } from "./i18n";

export interface UpgradeBenefit {
  icon: string;
  title: Record<Lang, string>;
  description: Record<Lang, string>;
}

export interface UpgradePath {
  fromTier: string;
  toTier: string;
  headline: Record<Lang, string>;
  subheadline: Record<Lang, string>;
  benefits: UpgradeBenefit[];
  cta: Record<Lang, string>;
}

export const UPGRADE_PATHS: UpgradePath[] = [
  {
    fromTier: "free",
    toTier: "basic",
    headline: {
      en: "Ready to grow?",
      hi: "बढ़ने के लिए तैयार?",
      ms: "Bersedia untuk berkembang?",
      ta: "வளர தயாரா?"
    },
    subheadline: {
      en: "Upgrade to Basic and unlock essential business tools",
      hi: "Basic में अपग्रेड करें और ज़रूरी बिज़नेस टूल्स पाएं",
      ms: "Naik taraf ke Basic dan buka alat perniagaan penting",
      ta: "Basic-க்கு மேம்படுத்தி அத்தியாவசிய வணிக கருவிகளைத் திறக்கவும்"
    },
    benefits: [
      {
        icon: "Users",
        title: {
          en: "5 Team Members",
          hi: "5 टीम मेंबर्स",
          ms: "5 Ahli Pasukan",
          ta: "5 குழு உறுப்பினர்கள்"
        },
        description: {
          en: "Add your team and work together",
          hi: "अपनी टीम जोड़ें और साथ मिलकर काम करें",
          ms: "Tambah pasukan anda dan bekerja bersama",
          ta: "உங்கள் குழுவைச் சேர்த்து ஒன்றாக வேலை செய்யுங்கள்"
        }
      },
      {
        icon: "FileText",
        title: {
          en: "GST Invoicing",
          hi: "GST इनवॉइसिंग",
          ms: "Invois GST",
          ta: "GST விலைப்பட்டியல்"
        },
        description: {
          en: "Create professional, tax-compliant invoices",
          hi: "प्रोफेशनल, टैक्स-कंप्लायंट इनवॉइस बनाएं",
          ms: "Cipta invois profesional yang mematuhi cukai",
          ta: "தொழில்முறை, வரி-இணக்கமான விலைப்பட்டியல்களை உருவாக்கவும்"
        }
      },
      {
        icon: "Bell",
        title: {
          en: "SMS Alerts",
          hi: "SMS अलर्ट्स",
          ms: "Makluman SMS",
          ta: "SMS எச்சரிக்கைகள்"
        },
        description: {
          en: "Keep customers informed automatically",
          hi: "ग्राहकों को ऑटोमैटिक अपडेट दें",
          ms: "Maklumkan pelanggan secara automatik",
          ta: "வாடிக்கையாளர்களை தானாகவே தெரிவிக்கவும்"
        }
      },
      {
        icon: "BarChart3",
        title: {
          en: "Business Analytics",
          hi: "बिज़नेस एनालिटिक्स",
          ms: "Analitik Perniagaan",
          ta: "வணிக பகுப்பாய்வு"
        },
        description: {
          en: "Track revenue, customers, and growth",
          hi: "रेवेन्यू, ग्राहक और ग्रोथ ट्रैक करें",
          ms: "Jejak hasil, pelanggan dan pertumbuhan",
          ta: "வருவாய், வாடிக்கையாளர்கள் மற்றும் வளர்ச்சியைக் கண்காணிக்கவும்"
        }
      }
    ],
    cta: {
      en: "Upgrade to Basic",
      hi: "Basic में अपग्रेड करें",
      ms: "Naik taraf ke Basic",
      ta: "Basic-க்கு மேம்படுத்தவும்"
    }
  },
  {
    fromTier: "basic",
    toTier: "pro",
    headline: {
      en: "Scale your business",
      hi: "अपना बिज़नेस बढ़ाएं",
      ms: "Kembangkan perniagaan anda",
      ta: "உங்கள் வணிகத்தை விரிவாக்குங்கள்"
    },
    subheadline: {
      en: "Upgrade to Pro for unlimited growth and automation",
      hi: "अनलिमिटेड ग्रोथ और ऑटोमेशन के लिए Pro में अपग्रेड करें",
      ms: "Naik taraf ke Pro untuk pertumbuhan dan automasi tanpa had",
      ta: "வரம்பற்ற வளர்ச்சி மற்றும் தன்னியக்கத்திற்கு Pro-க்கு மேம்படுத்தவும்"
    },
    benefits: [
      {
        icon: "Infinity",
        title: {
          en: "Unlimited Records",
          hi: "अनलिमिटेड रिकॉर्ड्स",
          ms: "Rekod Tanpa Had",
          ta: "வரம்பற்ற பதிவுகள்"
        },
        description: {
          en: "No limits on customers, invoices, or data",
          hi: "ग्राहकों, इनवॉइस या डेटा पर कोई लिमिट नहीं",
          ms: "Tiada had untuk pelanggan, invois atau data",
          ta: "வாடிக்கையாளர்கள், விலைப்பட்டியல் அல்லது தரவுகளில் வரம்புகள் இல்லை"
        }
      },
      {
        icon: "MessageCircle",
        title: {
          en: "WhatsApp Automation",
          hi: "WhatsApp ऑटोमेशन",
          ms: "Automasi WhatsApp",
          ta: "WhatsApp தன்னியக்கம்"
        },
        description: {
          en: "Auto-send reminders and updates to customers",
          hi: "ग्राहकों को ऑटो रिमाइंडर और अपडेट भेजें",
          ms: "Hantar peringatan dan kemas kini secara automatik",
          ta: "வாடிக்கையாளர்களுக்கு தானாக நினைவூட்டல்கள் அனுப்பவும்"
        }
      },
      {
        icon: "Shield",
        title: {
          en: "Custom Roles",
          hi: "कस्टम रोल्स",
          ms: "Peranan Tersuai",
          ta: "தனிப்பயன் பாத்திரங்கள்"
        },
        description: {
          en: "Control exactly what each team member can access",
          hi: "कंट्रोल करें कि हर टीम मेंबर क्या एक्सेस कर सकता है",
          ms: "Kawal apa yang boleh diakses oleh setiap ahli pasukan",
          ta: "ஒவ்வொரு குழு உறுப்பினரும் என்ன அணுகலாம் என்பதைக் கட்டுப்படுத்தவும்"
        }
      },
      {
        icon: "Headphones",
        title: {
          en: "Priority Support",
          hi: "प्रायोरिटी सपोर्ट",
          ms: "Sokongan Keutamaan",
          ta: "முன்னுரிமை ஆதரவு"
        },
        description: {
          en: "Get faster help when you need it",
          hi: "जब ज़रूरत हो तब तेज़ मदद पाएं",
          ms: "Dapatkan bantuan lebih cepat apabila anda memerlukannya",
          ta: "உங்களுக்கு தேவைப்படும்போது விரைவான உதவியைப் பெறுங்கள்"
        }
      }
    ],
    cta: {
      en: "Upgrade to Pro",
      hi: "Pro में अपग्रेड करें",
      ms: "Naik taraf ke Pro",
      ta: "Pro-க்கு மேம்படுத்தவும்"
    }
  }
];

export function getUpgradePath(fromTier: string): UpgradePath | undefined {
  const normalizedTier = fromTier.toLowerCase();
  return UPGRADE_PATHS.find(path => path.fromTier === normalizedTier);
}

export function getNextTier(currentTier: string): string | undefined {
  const tierOrder = ["free", "basic", "pro"];
  const currentIndex = tierOrder.indexOf(currentTier.toLowerCase());
  if (currentIndex === -1 || currentIndex >= tierOrder.length - 1) {
    return undefined;
  }
  return tierOrder[currentIndex + 1];
}

export const LIMIT_UPGRADE_MESSAGES: Record<string, Record<Lang, { title: string; description: string }>> = {
  users: {
    en: {
      title: "Team limit reached",
      description: "Upgrade your plan to add more team members"
    },
    hi: {
      title: "टीम लिमिट पूरी हुई",
      description: "और टीम मेंबर जोड़ने के लिए अपग्रेड करें"
    },
    ms: {
      title: "Had pasukan dicapai",
      description: "Naik taraf pelan anda untuk menambah lebih ramai ahli pasukan"
    },
    ta: {
      title: "குழு வரம்பு எட்டப்பட்டது",
      description: "மேலும் குழு உறுப்பினர்களைச் சேர்க்க உங்கள் திட்டத்தை மேம்படுத்தவும்"
    }
  },
  clients: {
    en: {
      title: "Customer limit reached",
      description: "Upgrade to add more customers and grow your business"
    },
    hi: {
      title: "ग्राहक लिमिट पूरी हुई",
      description: "और ग्राहक जोड़ने और बिज़नेस बढ़ाने के लिए अपग्रेड करें"
    },
    ms: {
      title: "Had pelanggan dicapai",
      description: "Naik taraf untuk menambah lebih ramai pelanggan dan mengembangkan perniagaan anda"
    },
    ta: {
      title: "வாடிக்கையாளர் வரம்பு எட்டப்பட்டது",
      description: "மேலும் வாடிக்கையாளர்களைச் சேர்க்கவும் உங்கள் வணிகத்தை வளர்க்கவும் மேம்படுத்தவும்"
    }
  },
  records: {
    en: {
      title: "Record limit reached",
      description: "Upgrade for unlimited records and storage"
    },
    hi: {
      title: "रिकॉर्ड लिमिट पूरी हुई",
      description: "अनलिमिटेड रिकॉर्ड्स के लिए अपग्रेड करें"
    },
    ms: {
      title: "Had rekod dicapai",
      description: "Naik taraf untuk rekod dan storan tanpa had"
    },
    ta: {
      title: "பதிவு வரம்பு எட்டப்பட்டது",
      description: "வரம்பற்ற பதிவுகள் மற்றும் சேமிப்பகத்திற்கு மேம்படுத்தவும்"
    }
  },
  projects: {
    en: {
      title: "Project limit reached",
      description: "Upgrade to manage more projects simultaneously"
    },
    hi: {
      title: "प्रोजेक्ट लिमिट पूरी हुई",
      description: "एक साथ ज़्यादा प्रोजेक्ट्स मैनेज करने के लिए अपग्रेड करें"
    },
    ms: {
      title: "Had projek dicapai",
      description: "Naik taraf untuk mengurus lebih banyak projek serentak"
    },
    ta: {
      title: "திட்ட வரம்பு எட்டப்பட்டது",
      description: "ஒரே நேரத்தில் அதிக திட்டங்களை நிர்வகிக்க மேம்படுத்தவும்"
    }
  },
  invoices_per_month: {
    en: {
      title: "Invoice limit reached",
      description: "Upgrade to create unlimited invoices"
    },
    hi: {
      title: "इनवॉइस लिमिट पूरी हुई",
      description: "अनलिमिटेड इनवॉइस बनाने के लिए अपग्रेड करें"
    },
    ms: {
      title: "Had invois dicapai",
      description: "Naik taraf untuk mencipta invois tanpa had"
    },
    ta: {
      title: "விலைப்பட்டியல் வரம்பு எட்டப்பட்டது",
      description: "வரம்பற்ற விலைப்பட்டியல்களை உருவாக்க மேம்படுத்தவும்"
    }
  }
};

export const LOCKED_FEATURE_MESSAGES: Record<string, Record<Lang, { title: string; description: string }>> = {
  invoicing: {
    en: {
      title: "Invoicing is a Basic feature",
      description: "Create professional GST-ready invoices with Basic plan"
    },
    hi: {
      title: "Invoicing एक Basic फ़ीचर है",
      description: "Basic प्लान के साथ GST-ready इनवॉइस बनाएं"
    },
    ms: {
      title: "Invois adalah ciri Basic",
      description: "Cipta invois profesional sedia GST dengan pelan Basic"
    },
    ta: {
      title: "விலைப்பட்டியல் Basic அம்சமாகும்",
      description: "Basic திட்டத்துடன் GST-தயாராக விலைப்பட்டியல்களை உருவாக்கவும்"
    }
  },
  whatsapp_automation: {
    en: {
      title: "WhatsApp Automation is a Pro feature",
      description: "Auto-send reminders and updates to customers with Pro"
    },
    hi: {
      title: "WhatsApp Automation एक Pro फ़ीचर है",
      description: "Pro के साथ ग्राहकों को ऑटो रिमाइंडर भेजें"
    },
    ms: {
      title: "Automasi WhatsApp adalah ciri Pro",
      description: "Hantar peringatan dan kemas kini secara automatik dengan Pro"
    },
    ta: {
      title: "WhatsApp தன்னியக்கம் Pro அம்சமாகும்",
      description: "Pro உடன் வாடிக்கையாளர்களுக்கு தானாக நினைவூட்டல்கள் அனுப்பவும்"
    }
  },
  custom_roles: {
    en: {
      title: "Custom Roles is a Pro feature",
      description: "Create custom staff permissions with Pro plan"
    },
    hi: {
      title: "Custom Roles एक Pro फ़ीचर है",
      description: "Pro प्लान के साथ कस्टम स्टाफ परमिशन बनाएं"
    },
    ms: {
      title: "Peranan Tersuai adalah ciri Pro",
      description: "Cipta kebenaran staf tersuai dengan pelan Pro"
    },
    ta: {
      title: "தனிப்பயன் பாத்திரங்கள் Pro அம்சமாகும்",
      description: "Pro திட்டத்துடன் தனிப்பயன் ஊழியர் அனுமதிகளை உருவாக்கவும்"
    }
  },
  payroll: {
    en: {
      title: "Payroll requires Basic plan or higher",
      description: "Process payroll and generate payslips with Basic plan"
    },
    hi: {
      title: "Payroll के लिए Basic प्लान या उससे ऊपर चाहिए",
      description: "Basic प्लान के साथ Payroll प्रोसेस करें और Payslip बनाएं"
    },
    ms: {
      title: "Gaji memerlukan pelan Basic atau lebih tinggi",
      description: "Proses gaji dan jana slip gaji dengan pelan Basic"
    },
    ta: {
      title: "சம்பளத்திற்கு Basic திட்டம் அல்லது அதற்கு மேல் தேவை",
      description: "Basic திட்டத்துடன் சம்பளத்தை செயலாக்கி சம்பள சீட்டுகளை உருவாக்கவும்"
    }
  },
  analytics_advanced: {
    en: {
      title: "Advanced Analytics is a Pro feature",
      description: "Get detailed insights and reports with Pro plan"
    },
    hi: {
      title: "Advanced Analytics एक Pro फ़ीचर है",
      description: "Pro प्लान के साथ डिटेल्ड इनसाइट्स और रिपोर्ट्स पाएं"
    },
    ms: {
      title: "Analitik Lanjutan adalah ciri Pro",
      description: "Dapatkan pandangan dan laporan terperinci dengan pelan Pro"
    },
    ta: {
      title: "மேம்பட்ட பகுப்பாய்வு Pro அம்சமாகும்",
      description: "Pro திட்டத்துடன் விரிவான நுண்ணறிவு மற்றும் அறிக்கைகளைப் பெறுங்கள்"
    }
  },
  priority_support: {
    en: {
      title: "Priority Support is a Pro feature",
      description: "Get faster response times with Pro plan"
    },
    hi: {
      title: "Priority Support एक Pro फ़ीचर है",
      description: "Pro प्लान के साथ तेज़ रिस्पॉन्स पाएं"
    },
    ms: {
      title: "Sokongan Keutamaan adalah ciri Pro",
      description: "Dapatkan masa respons lebih cepat dengan pelan Pro"
    },
    ta: {
      title: "முன்னுரிமை ஆதரவு Pro அம்சமாகும்",
      description: "Pro திட்டத்துடன் விரைவான பதில் நேரங்களைப் பெறுங்கள்"
    }
  }
};

export function getLimitUpgradeMessage(limitKey: string, lang: Lang): { title: string; description: string } {
  const message = LIMIT_UPGRADE_MESSAGES[limitKey]?.[lang];
  if (message) return message;
  return LIMIT_UPGRADE_MESSAGES[limitKey]?.en || {
    title: "Limit reached",
    description: "Upgrade your plan to continue"
  };
}

export function getLockedFeatureMessage(featureKey: string, lang: Lang): { title: string; description: string } {
  const message = LOCKED_FEATURE_MESSAGES[featureKey]?.[lang];
  if (message) return message;
  return LOCKED_FEATURE_MESSAGES[featureKey]?.en || {
    title: "Feature locked",
    description: "Upgrade your plan to unlock this feature"
  };
}
