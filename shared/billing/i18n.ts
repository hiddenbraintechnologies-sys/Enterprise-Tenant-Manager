export type Lang = "en" | "hi" | "ms" | "ta";

export const PLAN_NAMES: Record<string, Record<Lang, string>> = {
  free: {
    en: "Free",
    hi: "फ्री",
    ms: "Percuma",
    ta: "இலவசம்"
  },
  basic: {
    en: "Basic",
    hi: "बेसिक",
    ms: "Asas",
    ta: "அடிப்படை"
  },
  pro: {
    en: "Pro",
    hi: "प्रो",
    ms: "Pro",
    ta: "புரோ"
  }
};

export const PLAN_DESCRIPTIONS: Record<string, Record<Lang, string>> = {
  free: {
    en: "Perfect for trying out the platform",
    hi: "प्लेटफॉर्म आज़माने के लिए परफेक्ट",
    ms: "Sesuai untuk mencuba platform",
    ta: "தளத்தை முயற்சிக்க சிறந்தது"
  },
  basic: {
    en: "For small businesses getting started",
    hi: "छोटे बिज़नेस के लिए",
    ms: "Untuk perniagaan kecil yang baru bermula",
    ta: "தொடங்கும் சிறு வணிகங்களுக்கு"
  },
  pro: {
    en: "For growing businesses with advanced needs",
    hi: "बढ़ते बिज़नेस के लिए",
    ms: "Untuk perniagaan yang berkembang dengan keperluan lanjutan",
    ta: "மேம்பட்ட தேவைகளுடன் வளரும் வணிகங்களுக்கு"
  }
};

export function getPlanName(lang: Lang, tier: string): string {
  const key = tier.toLowerCase();
  return PLAN_NAMES[key]?.[lang] || PLAN_NAMES[key]?.en || tier;
}

export function getPlanDescription(lang: Lang, tier: string): string {
  const key = tier.toLowerCase();
  return PLAN_DESCRIPTIONS[key]?.[lang] || PLAN_DESCRIPTIONS[key]?.en || "";
}

export const BILLING_STRINGS = {
  pageTitle: {
    en: "Choose your plan",
    hi: "अपना प्लान चुनें",
    ms: "Pilih pelan anda",
    ta: "உங்கள் திட்டத்தைத் தேர்ந்தெடுங்கள்"
  },
  pageSubtitle: {
    en: "Start free and upgrade as your business grows. All plans include a 14-day trial.",
    hi: "मुफ्त में शुरू करें और अपने बिज़नेस के साथ अपग्रेड करें। सभी प्लान में 14 दिन का ट्रायल शामिल है।",
    ms: "Mulakan secara percuma dan naik taraf apabila perniagaan anda berkembang. Semua pelan termasuk percubaan 14 hari.",
    ta: "இலவசமாகத் தொடங்குங்கள், உங்கள் வணிகம் வளரும்போது மேம்படுத்துங்கள். அனைத்து திட்டங்களிலும் 14 நாள் சோதனை உள்ளது."
  },
  monthly: {
    en: "Monthly",
    hi: "मासिक",
    ms: "Bulanan",
    ta: "மாதாந்திர"
  },
  yearly: {
    en: "Yearly",
    hi: "वार्षिक",
    ms: "Tahunan",
    ta: "வருடாந்திர"
  },
  perMonth: {
    en: "/month",
    hi: "/महीना",
    ms: "/bulan",
    ta: "/மாதம்"
  },
  perYear: {
    en: "/year",
    hi: "/वर्ष",
    ms: "/tahun",
    ta: "/வருடம்"
  },
  billedMonthly: {
    en: "Billed monthly",
    hi: "हर महीने बिल",
    ms: "Dibilkan bulanan",
    ta: "மாதாந்திர பில்லிங்"
  },
  billedYearly: {
    en: "Billed yearly",
    hi: "हर साल बिल",
    ms: "Dibilkan tahunan",
    ta: "வருடாந்திர பில்லிங்"
  },
  recommended: {
    en: "Recommended",
    hi: "सुझाया गया",
    ms: "Disyorkan",
    ta: "பரிந்துரைக்கப்படுகிறது"
  },
  popular: {
    en: "Popular",
    hi: "लोकप्रिय",
    ms: "Popular",
    ta: "பிரபலமானது"
  },
  bestValue: {
    en: "Best Value",
    hi: "बेस्ट वैल्यू",
    ms: "Nilai Terbaik",
    ta: "சிறந்த மதிப்பு"
  },
  currentPlan: {
    en: "Current plan",
    hi: "वर्तमान प्लान",
    ms: "Pelan semasa",
    ta: "தற்போதைய திட்டம்"
  },
  startFree: {
    en: "Start Free",
    hi: "मुफ्त शुरू करें",
    ms: "Mula Percuma",
    ta: "இலவசமாகத் தொடங்குங்கள்"
  },
  getFree: {
    en: "Get Free",
    hi: "मुफ्त में पाएं",
    ms: "Dapatkan Percuma",
    ta: "இலவசமாகப் பெறுங்கள்"
  },
  upgrade: {
    en: "Upgrade",
    hi: "अपग्रेड करें",
    ms: "Naik taraf",
    ta: "மேம்படுத்து"
  },
  upgradeNow: {
    en: "Upgrade Now",
    hi: "अभी अपग्रेड करें",
    ms: "Naik Taraf Sekarang",
    ta: "இப்போதே மேம்படுத்துங்கள்"
  },
  downgrade: {
    en: "Downgrade",
    hi: "डाउनग्रेड करें",
    ms: "Turun taraf",
    ta: "தரமிறக்கு"
  },
  selectPlan: {
    en: "Select Plan",
    hi: "प्लान चुनें",
    ms: "Pilih Pelan",
    ta: "திட்டத்தைத் தேர்ந்தெடுங்கள்"
  },
  getStarted: {
    en: "Get Started",
    hi: "शुरू करें",
    ms: "Mulakan",
    ta: "தொடங்குங்கள்"
  },
  choosePlan: {
    en: "Choose Plan",
    hi: "प्लान चुनें",
    ms: "Pilih Pelan",
    ta: "திட்டத்தைத் தேர்ந்தெடுங்கள்"
  },
  included: {
    en: "Included",
    hi: "शामिल",
    ms: "Termasuk",
    ta: "சேர்க்கப்பட்டுள்ளது"
  },
  notIncluded: {
    en: "Not included",
    hi: "शामिल नहीं",
    ms: "Tidak termasuk",
    ta: "சேர்க்கப்படவில்லை"
  },
  features: {
    en: "Features",
    hi: "फीचर्स",
    ms: "Ciri-ciri",
    ta: "அம்சங்கள்"
  },
  users: {
    en: "users",
    hi: "यूजर्स",
    ms: "pengguna",
    ta: "பயனர்கள்"
  },
  customers: {
    en: "customers",
    hi: "ग्राहक",
    ms: "pelanggan",
    ta: "வாடிக்கையாளர்கள்"
  },
  records: {
    en: "records",
    hi: "रिकॉर्ड्स",
    ms: "rekod",
    ta: "பதிவுகள்"
  },
  unlimited: {
    en: "Unlimited",
    hi: "अनलिमिटेड",
    ms: "Tanpa had",
    ta: "வரம்பற்றது"
  },
  loading: {
    en: "Loading...",
    hi: "लोड हो रहा है...",
    ms: "Memuatkan...",
    ta: "ஏற்றுகிறது..."
  },
  processing: {
    en: "Processing...",
    hi: "प्रोसेसिंग...",
    ms: "Memproses...",
    ta: "செயலாக்குகிறது..."
  },
  free: {
    en: "Free",
    hi: "मुफ्त",
    ms: "Percuma",
    ta: "இலவசம்"
  },
  pendingDowngrade: {
    en: "Pending downgrade",
    hi: "डाउनग्रेड पेंडिंग",
    ms: "Turun taraf tertunda",
    ta: "நிலுவையில் உள்ள தரமிறக்கம்"
  },
  cancelDowngrade: {
    en: "Cancel downgrade",
    hi: "डाउनग्रेड रद्द करें",
    ms: "Batal turun taraf",
    ta: "தரமிறக்கத்தை ரத்து செய்யுங்கள்"
  },
  pendingPayment: {
    en: "Payment pending",
    hi: "पेमेंट पेंडिंग",
    ms: "Pembayaran tertunda",
    ta: "கட்டணம் நிலுவையில்"
  },
  continuePayment: {
    en: "Continue Payment",
    hi: "पेमेंट जारी रखें",
    ms: "Teruskan Pembayaran",
    ta: "கட்டணத்தைத் தொடருங்கள்"
  },
  cancelUpgrade: {
    en: "Cancel Upgrade",
    hi: "अपग्रेड रद्द करें",
    ms: "Batal Naik Taraf",
    ta: "மேம்பாட்டை ரத்து செய்யுங்கள்"
  },
  effectiveOn: {
    en: "Effective on",
    hi: "से लागू",
    ms: "Berkuat kuasa pada",
    ta: "முதல் நடைமுறையில்"
  },
  keepCurrent: {
    en: "Keep current plan",
    hi: "वर्तमान प्लान रखें",
    ms: "Kekalkan pelan semasa",
    ta: "தற்போதைய திட்டத்தை வைத்திருங்கள்"
  },
  confirmCancel: {
    en: "Yes, cancel",
    hi: "हाँ, रद्द करें",
    ms: "Ya, batalkan",
    ta: "ஆம், ரத்து செய்யுங்கள்"
  },
  goBack: {
    en: "Go back",
    hi: "वापस जाएँ",
    ms: "Kembali",
    ta: "திரும்பிச் செல்லுங்கள்"
  },
  securePayment: {
    en: "Secure payment powered by Razorpay",
    hi: "Razorpay द्वारा सुरक्षित पेमेंट",
    ms: "Pembayaran selamat oleh Razorpay",
    ta: "Razorpay மூலம் பாதுகாப்பான கட்டணம்"
  },
  noSubscription: {
    en: "Choose a plan to get started with your business management.",
    hi: "अपने बिज़नेस मैनेजमेंट की शुरुआत के लिए एक प्लान चुनें।",
    ms: "Pilih pelan untuk memulakan pengurusan perniagaan anda.",
    ta: "உங்கள் வணிக மேலாண்மையைத் தொடங்க ஒரு திட்டத்தைத் தேர்ந்தெடுங்கள்."
  },
  errorLoadingPlans: {
    en: "Unable to load plans. Please try again.",
    hi: "प्लान लोड नहीं हो पाए। कृपया फिर से कोशिश करें।",
    ms: "Tidak dapat memuatkan pelan. Sila cuba lagi.",
    ta: "திட்டங்களை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்."
  },
  errorLoadingSubscription: {
    en: "Unable to load subscription. Please try again.",
    hi: "सब्सक्रिप्शन लोड नहीं हो पाया। कृपया फिर से कोशिश करें।",
    ms: "Tidak dapat memuatkan langganan. Sila cuba lagi.",
    ta: "சந்தாவை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்."
  },
  retry: {
    en: "Retry",
    hi: "फिर से कोशिश करें",
    ms: "Cuba lagi",
    ta: "மீண்டும் முயற்சிக்கவும்"
  },
  settingUpWorkspace: {
    en: "Setting up your workspace",
    hi: "आपका वर्कस्पेस सेट हो रहा है",
    ms: "Menyediakan ruang kerja anda",
    ta: "உங்கள் பணியிடத்தை அமைக்கிறது"
  },
  justAMoment: {
    en: "Just a moment while we prepare your account",
    hi: "कृपया प्रतीक्षा करें, हम आपका अकाउंट तैयार कर रहे हैं",
    ms: "Sila tunggu sebentar...",
    ta: "ஒரு கணம்..."
  },
  cancelUpgradeConfirmTitle: {
    en: "Cancel pending upgrade?",
    hi: "पेंडिंग अपग्रेड रद्द करें?",
    ms: "Batalkan naik taraf tertunda?",
    ta: "நிலுவையில் உள்ள மேம்பாட்டை ரத்து செய்யவா?"
  },
  cancelUpgradeConfirmDesc: {
    en: "Your upgrade is pending payment. Would you like to cancel this upgrade and stay on your current plan?",
    hi: "आपका अपग्रेड पेमेंट के लिए पेंडिंग है। क्या आप इस अपग्रेड को रद्द करके वर्तमान प्लान पर रहना चाहते हैं?",
    ms: "Ini akan membatalkan naik taraf tertunda anda. Anda akan mengekalkan pelan semasa anda.",
    ta: "இது உங்கள் நிலுவையில் உள்ள மேம்பாட்டை ரத்து செய்யும். உங்கள் தற்போதைய திட்டத்தை வைத்திருப்பீர்கள்."
  },
  downgradeBannerTitle: {
    en: "Scheduled Downgrade",
    hi: "निर्धारित डाउनग्रेड",
    ms: "Turun Taraf Dijadualkan",
    ta: "தரமிறக்கம் திட்டமிடப்பட்டது"
  },
  checkoutTitle: {
    en: "Complete your payment",
    hi: "अपना पेमेंट पूरा करें"
  },
  checkoutSubtitle: {
    en: "Review your order and pay securely",
    hi: "अपना ऑर्डर देखें और सुरक्षित पेमेंट करें"
  },
  orderSummary: {
    en: "Order Summary",
    hi: "ऑर्डर समरी"
  },
  planName: {
    en: "Plan",
    hi: "प्लान"
  },
  billingCycle: {
    en: "Billing Cycle",
    hi: "बिलिंग साइकिल"
  },
  subtotal: {
    en: "Subtotal",
    hi: "सबटोटल"
  },
  discount: {
    en: "Discount",
    hi: "डिस्काउंट"
  },
  total: {
    en: "Total",
    hi: "कुल"
  },
  payNow: {
    en: "Pay Now",
    hi: "अभी पे करें"
  },
  paySecurely: {
    en: "Pay Securely",
    hi: "सुरक्षित पेमेंट करें"
  },
  applyCoupon: {
    en: "Apply Coupon",
    hi: "कूपन लगाएं"
  },
  couponCode: {
    en: "Coupon Code",
    hi: "कूपन कोड"
  },
  apply: {
    en: "Apply",
    hi: "लागू करें"
  },
  remove: {
    en: "Remove",
    hi: "हटाएं"
  },
  couponApplied: {
    en: "Coupon applied",
    hi: "कूपन लागू हो गया"
  },
  invalidCoupon: {
    en: "Invalid coupon code",
    hi: "अमान्य कूपन कोड"
  },
  effectivePrice: {
    en: "Effective price",
    hi: "प्रभावी कीमत"
  },
  youSave: {
    en: "You save",
    hi: "आप बचाते हैं"
  },
  login: {
    en: "Log in",
    hi: "लॉगिन"
  },
  goToDashboard: {
    en: "Go to dashboard",
    hi: "डैशबोर्ड पर जाएं"
  },
  subscriptionActive: {
    en: "Your subscription is active.",
    hi: "आपकी सदस्यता सक्रिय है।"
  },
  changeDowngradePlan: {
    en: "Change downgrade plan",
    hi: "डाउनग्रेड प्लान बदलें"
  },
  changeToThisPlan: {
    en: "Change to this plan",
    hi: "इस प्लान में बदलें"
  },
  upgradePendingFor: {
    en: "Upgrade pending for",
    hi: "के लिए अपग्रेड पेंडिंग"
  },
  completePaymentToActivate: {
    en: "Complete payment to activate your subscription.",
    hi: "सदस्यता सक्रिय करने के लिए पेमेंट पूरा करें।"
  },
  chooseToGetStarted: {
    en: "Choose a plan to get started.",
    hi: "शुरू करने के लिए एक प्लान चुनें।"
  },
  selectFreeOrPaid: {
    en: "Select Free to start immediately, or choose a paid plan for more features.",
    hi: "तुरंत शुरू करने के लिए Free चुनें, या अधिक फीचर्स के लिए पेड प्लान।"
  },
  allPricesInr: {
    en: "All prices are in INR and include GST where applicable.",
    hi: "सभी कीमतें INR में हैं और जहां लागू हो वहां GST शामिल है।"
  },
  upgradeDowngradeAnytime: {
    en: "You can upgrade or downgrade at any time.",
    hi: "आप कभी भी अपग्रेड या डाउनग्रेड कर सकते हैं।"
  },
  keepUpgrade: {
    en: "Keep upgrade",
    hi: "अपग्रेड रखें"
  },
  cancelling: {
    en: "Cancelling...",
    hi: "रद्द हो रहा है..."
  },
  getPlan: {
    en: "Get",
    hi: "लें"
  },
  planUpdated: {
    en: "Plan updated",
    hi: "प्लान अपडेट हुआ"
  },
  planUpdatedDesc: {
    en: "Your subscription has been updated.",
    hi: "आपकी सदस्यता अपडेट हो गई।"
  },
  planUpdateFailed: {
    en: "Failed to update plan",
    hi: "प्लान अपडेट विफल"
  },
  pricingTitle: {
    en: "Simple, transparent pricing",
    hi: "सरल, पारदर्शी कीमतें"
  },
  pricingSubtitle: {
    en: "Start free. Upgrade only when you need to. Cancel anytime.",
    hi: "मुफ्त में शुरू करें। जब जरूरत हो तब अपग्रेड करें। कभी भी रद्द करें।"
  },
  comparePlans: {
    en: "Compare plans",
    hi: "प्लान तुलना करें"
  },
  feature: {
    en: "Feature",
    hi: "फीचर"
  },
  teamMembers: {
    en: "Team members",
    hi: "टीम सदस्य"
  },
  upToTeamMembers: {
    en: "Up to {n} team member{s}",
    hi: "{n} टीम सदस्य तक"
  },
  unlimitedTeamMembers: {
    en: "Unlimited team members",
    hi: "अनलिमिटेड टीम सदस्य"
  },
  upToRecords: {
    en: "Up to {n} records",
    hi: "{n} रिकॉर्ड्स तक"
  },
  unlimitedRecords: {
    en: "Unlimited records",
    hi: "अनलिमिटेड रिकॉर्ड्स"
  },
  basicAnalytics: {
    en: "Basic analytics",
    hi: "बेसिक एनालिटिक्स"
  },
  advancedAnalytics: {
    en: "Advanced analytics",
    hi: "एडवांस्ड एनालिटिक्स"
  },
  emailNotifications: {
    en: "Email notifications",
    hi: "ईमेल नोटिफिकेशन"
  },
  smsNotifications: {
    en: "SMS notifications",
    hi: "SMS नोटिफिकेशन"
  },
  whatsappAutomation: {
    en: "WhatsApp automation",
    hi: "WhatsApp ऑटोमेशन"
  },
  gstInvoicing: {
    en: "GST invoicing",
    hi: "GST इनवॉइसिंग"
  },
  prioritySupport: {
    en: "Priority support",
    hi: "Priority सपोर्ट"
  },
  allPricesInrWithGst: {
    en: "All prices are in Indian Rupees (INR). GST applicable as per government regulations.",
    hi: "सभी कीमतें भारतीय रुपए (INR) में हैं। GST सरकारी नियमों के अनुसार लागू।"
  },
  noCreditCardRequired: {
    en: "No credit card required",
    hi: "क्रेडिट कार्ड की जरूरत नहीं"
  },
  cancelAnytime: {
    en: "Cancel anytime",
    hi: "कभी भी रद्द करें"
  },
  securePayments: {
    en: "Secure payments",
    hi: "सुरक्षित पेमेंट"
  },
  checkout: {
    en: "Checkout",
    hi: "चेकआउट"
  },
  paymentSuccess: {
    en: "Payment successful",
    hi: "पेमेंट सफल"
  },
  subscriptionNowActive: {
    en: "Your subscription is now active.",
    hi: "आपकी सदस्यता अब सक्रिय है।"
  },
  paymentVerificationFailed: {
    en: "Payment verification failed",
    hi: "पेमेंट सत्यापन विफल"
  },
  paymentFailed: {
    en: "Payment failed",
    hi: "पेमेंट विफल"
  },
  loadingPayment: {
    en: "Loading payment",
    hi: "पेमेंट लोड हो रहा है"
  },
  pleaseWait: {
    en: "Please wait...",
    hi: "कृपया प्रतीक्षा करें..."
  },
  error: {
    en: "Error",
    hi: "त्रुटि"
  },
  failedToLoadPaymentGateway: {
    en: "Failed to load payment gateway",
    hi: "पेमेंट गेटवे लोड करने में विफल"
  },
  paymentCancelled: {
    en: "Payment cancelled",
    hi: "पेमेंट रद्द"
  },
  paymentCancelledDesc: {
    en: "You can try again or cancel the upgrade.",
    hi: "आप फिर से कोशिश कर सकते हैं या अपग्रेड रद्द कर सकते हैं।"
  },
  pleaseRetry: {
    en: "Please try again",
    hi: "कृपया फिर से कोशिश करें"
  },
  failedToInitiatePayment: {
    en: "Failed to initiate payment",
    hi: "पेमेंट शुरू करने में विफल"
  },
  paymentWasCancelled: {
    en: "Payment was cancelled",
    hi: "पेमेंट रद्द हो गया"
  },
  paymentCancelledReturnToPlans: {
    en: "This payment has been cancelled. Return to plans to upgrade again.",
    hi: "यह पेमेंट रद्द कर दिया गया है। फिर से अपग्रेड करने के लिए प्लान पर वापस जाएं।"
  },
  backToPlans: {
    en: "Back to plans",
    hi: "प्लान पर वापस जाएं"
  },
  noPendingPayment: {
    en: "No pending payment",
    hi: "कोई पेंडिंग पेमेंट नहीं"
  },
  noPendingPaymentDesc: {
    en: "There is no payment pending. Please select a plan first.",
    hi: "कोई पेमेंट पेंडिंग नहीं है। कृपया पहले एक प्लान चुनें।"
  },
  completeYourPurchase: {
    en: "Complete your purchase",
    hi: "अपनी खरीदारी पूरी करें"
  },
  subscribingToPlan: {
    en: "You're subscribing to the",
    hi: "आप"
  },
  subscribingToPlanSuffix: {
    en: "plan",
    hi: "प्लान की सदस्यता ले रहे हैं"
  },
  plan: {
    en: "Plan",
    hi: "प्लान"
  },
  monthlySubscription: {
    en: "Monthly subscription",
    hi: "मासिक सदस्यता"
  },
  testPaymentMode: {
    en: "Test Payment Mode",
    hi: "टेस्ट पेमेंट मोड"
  },
  development: {
    en: "Development",
    hi: "डेवलपमेंट"
  },
  testEnvironmentDesc: {
    en: "This is a test environment. Use the buttons below to simulate payment.",
    hi: "यह एक टेस्ट वातावरण है। पेमेंट सिम्युलेट करने के लिए नीचे दिए गए बटन का उपयोग करें।"
  },
  upiRefOptional: {
    en: "UPI Reference (optional)",
    hi: "UPI रेफरेंस (वैकल्पिक)"
  },
  enterAnyRef: {
    en: "Enter any reference",
    hi: "कोई भी रेफरेंस डालें"
  },
  payWithRazorpay: {
    en: "Pay with Razorpay",
    hi: "Razorpay से पे करें"
  },
  secure: {
    en: "Secure",
    hi: "सुरक्षित"
  },
  paySecurelyUsingRazorpay: {
    en: "Pay securely using UPI, Cards, Net Banking, or Wallets.",
    hi: "UPI, कार्ड, नेट बैंकिंग, या वॉलेट से सुरक्षित पेमेंट करें।"
  },
  paymentSecured256Bit: {
    en: "Your payment is secured with 256-bit encryption",
    hi: "आपका पेमेंट 256-bit एन्क्रिप्शन से सुरक्षित है"
  },
  simulateSuccess: {
    en: "Simulate Successful Payment",
    hi: "सफल पेमेंट सिम्युलेट करें"
  },
  simulateFailed: {
    en: "Simulate Failed Payment",
    hi: "विफल पेमेंट सिम्युलेट करें"
  },
  payAmount: {
    en: "Pay",
    hi: "पे करें"
  },
  termsAgreement: {
    en: "By completing this purchase, you agree to our Terms of Service and Privacy Policy.",
    hi: "इस खरीदारी को पूरा करके, आप हमारी सेवा की शर्तों और गोपनीयता नीति से सहमत होते हैं।"
  },
  paymentSuccessful: {
    en: "Payment Successful!",
    hi: "पेमेंट सफल!"
  },
  redirectingToDashboard: {
    en: "Your subscription is now active. Redirecting to dashboard...",
    hi: "आपकी सदस्यता अब सक्रिय है। डैशबोर्ड पर रीडायरेक्ट हो रहा है..."
  },
  paymentFailedRetry: {
    en: "Payment failed. Please try again or contact support.",
    hi: "पेमेंट विफल। कृपया फिर से कोशिश करें या सपोर्ट से संपर्क करें।"
  },
  upgradeInitiated: {
    en: "Upgrade initiated",
    hi: "अपग्रेड शुरू"
  },
  proceedToPayment: {
    en: "Proceed to payment to complete upgrade.",
    hi: "अपग्रेड पूरा करने के लिए पेमेंट करें।"
  },
  planChanged: {
    en: "Plan changed",
    hi: "प्लान बदला गया"
  },
  downgradeScheduled: {
    en: "Downgrade scheduled",
    hi: "डाउनग्रेड शेड्यूल किया गया"
  },
  subscriptionUpdated: {
    en: "Your subscription has been updated.",
    hi: "आपकी सदस्यता अपडेट हो गई है।"
  },
  errorTitle: {
    en: "Error",
    hi: "त्रुटि"
  },
  pleaseLogIn: {
    en: "Please log in",
    hi: "कृपया लॉग इन करें"
  },
  needToLogIn: {
    en: "You need to be logged in to perform this action.",
    hi: "इस क्रिया के लिए लॉग इन करना आवश्यक है।"
  },
  needToLogInSelect: {
    en: "You need to be logged in to select a plan.",
    hi: "प्लान चुनने के लिए लॉग इन करना आवश्यक है।"
  },
  needToLogInUpgrade: {
    en: "You need to be logged in to upgrade.",
    hi: "अपग्रेड करने के लिए लॉग इन करना आवश्यक है।"
  },
  needToLogInDowngrade: {
    en: "You need to be logged in to downgrade.",
    hi: "डाउनग्रेड करने के लिए लॉग इन करना आवश्यक है।"
  },
  downgradeCancelledTitle: {
    en: "Downgrade cancelled",
    hi: "डाउनग्रेड रद्द"
  },
  downgradeCancelledDesc: {
    en: "Your subscription will continue as usual.",
    hi: "आपकी सदस्यता सामान्य रूप से जारी रहेगी।"
  },
  upgradeCancelledTitle: {
    en: "Upgrade cancelled",
    hi: "अपग्रेड रद्द"
  },
  upgradeCancelledDesc: {
    en: "Your current plan remains active. You can upgrade again anytime.",
    hi: "आपका वर्तमान प्लान सक्रिय रहेगा। आप कभी भी फिर से अपग्रेड कर सकते हैं।"
  },
  planSelectedTitle: {
    en: "Plan selected",
    hi: "प्लान चुना गया"
  },
  planSelectedDesc: {
    en: "Proceed to payment to activate your subscription.",
    hi: "अपनी सदस्यता सक्रिय करने के लिए पेमेंट करें।"
  },
  planActivated: {
    en: "Plan activated",
    hi: "प्लान सक्रिय"
  },
  businessSetupRequired: {
    en: "Business setup required",
    hi: "बिज़नेस सेटअप आवश्यक"
  },
  completeBusinessDetails: {
    en: "Please complete your business details first.",
    hi: "कृपया पहले अपने बिज़नेस विवरण पूरे करें।"
  },
  planIsNowActive: {
    en: "plan is now active.",
    hi: "प्लान अब सक्रिय है।"
  },
  planSubscription: {
    en: "Subscription",
    hi: "सदस्यता"
  },
  planDescFree: {
    en: "Get started with essential features",
    hi: "आवश्यक फीचर्स के साथ शुरुआत करें"
  },
  planDescBasic: {
    en: "Perfect for growing businesses",
    hi: "बढ़ते बिज़नेस के लिए एकदम सही"
  },
  planDescPro: {
    en: "For established businesses that need more",
    hi: "स्थापित बिज़नेस के लिए जिन्हें अधिक की जरूरत है"
  },
  planNameFree: {
    en: "Free",
    hi: "मुफ्त"
  },
  planNameBasic: {
    en: "Basic",
    hi: "बेसिक"
  },
  planNamePro: {
    en: "Pro",
    hi: "प्रो"
  },
  tierFree: {
    en: "Free",
    hi: "मुफ्त",
    ms: "Percuma",
    ta: "இலவசம்"
  },
  tierBasic: {
    en: "Basic",
    hi: "बेसिक",
    ms: "Asas",
    ta: "அடிப்படை"
  },
  tierPro: {
    en: "Pro",
    hi: "प्रो",
    ms: "Pro",
    ta: "புரோ"
  },
  tierEnterprise: {
    en: "Enterprise",
    hi: "एंटरप्राइज",
    ms: "Perusahaan",
    ta: "நிறுவனம்"
  },
  perfectForUsers: {
    en: "Perfect for your business needs",
    hi: "आपकी बिज़नेस जरूरतों के लिए एकदम सही"
  },
  usersLimit: {
    en: "Users",
    hi: "उपयोगकर्ता"
  },
  recordsLimit: {
    en: "Records",
    hi: "रिकॉर्ड्स"
  },
  featureBasicReporting: {
    en: "Basic Reporting",
    hi: "बेसिक रिपोर्टिंग"
  },
  featureAdvancedReporting: {
    en: "Advanced Analytics",
    hi: "एडवांस्ड एनालिटिक्स"
  },
  featureEmailNotifications: {
    en: "Email Notifications",
    hi: "ईमेल नोटिफिकेशन"
  },
  featureSmsNotifications: {
    en: "SMS Notifications",
    hi: "SMS नोटिफिकेशन"
  },
  featureWhatsappAutomation: {
    en: "WhatsApp Automation",
    hi: "व्हाट्सएप ऑटोमेशन"
  },
  featureGstInvoicing: {
    en: "GST Invoicing",
    hi: "GST इनवॉइसिंग"
  },
  featurePrioritySupport: {
    en: "Priority Support",
    hi: "प्राथमिकता सहायता"
  },
  featureApiAccess: {
    en: "API Access",
    hi: "API एक्सेस"
  },
  featureCustomBranding: {
    en: "Custom Branding",
    hi: "कस्टम ब्रांडिंग",
    ms: "Penjenamaan Tersuai",
    ta: "தனிப்பயன் பிராண்டிங்"
  },
  payrollTitle: {
    en: "Payroll",
    ms: "Gaji & Payroll",
    ta: "சம்பள மேலாண்மை (Payroll)",
    hi: "पेरोल"
  },
  payrollSubtitle: {
    en: "Automate salary, statutory deductions, and payslips for your team.",
    ms: "Automatikkan gaji, potongan berkanun, dan slip gaji pekerja anda.",
    ta: "உங்கள் குழுவிற்கான சம்பளம், சட்டப்படி கழிப்புகள் மற்றும் சம்பள சீட்டுகளை தானியங்கி செய்யுங்கள்.",
    hi: "अपनी टीम के लिए वेतन, वैधानिक कटौती और पे स्लिप को स्वचालित करें।"
  },
  payrollTrialBadge: {
    en: "7-day free trial",
    ms: "Percubaan percuma 7 hari",
    ta: "7 நாள் இலவச சோதனை",
    hi: "7 दिन का फ्री ट्रायल"
  },
  payrollAddButton: {
    en: "Add Payroll",
    ms: "Tambah Payroll",
    ta: "Payroll சேர்க்கவும்",
    hi: "पेरोल जोड़ें"
  },
  payrollTierA: {
    en: "Up to 25 employees",
    ms: "Sehingga 25 pekerja",
    ta: "25 ஊழியர்கள் வரை",
    hi: "25 कर्मचारियों तक"
  },
  payrollTierB: {
    en: "Up to 100 employees",
    ms: "Sehingga 100 pekerja",
    ta: "100 ஊழியர்கள் வரை",
    hi: "100 कर्मचारियों तक"
  },
  payrollTierC: {
    en: "Unlimited employees",
    ms: "Pekerja tanpa had",
    ta: "வரம்பற்ற ஊழியர்கள்",
    hi: "असीमित कर्मचारी"
  },
  optionalAddons: {
    en: "Optional Add-ons",
    ms: "Tambahan Pilihan",
    ta: "விருப்பமான கூடுதல் அம்சங்கள்",
    hi: "वैकल्पिक ऐड-ऑन"
  },
  optionalAddonsDesc: {
    en: "Enhance your plan with optional add-ons. You can add or remove these later.",
    ms: "Tingkatkan pelan anda dengan tambahan pilihan. Anda boleh menambah atau membuang kemudian.",
    ta: "விருப்பமான கூடுதல் அம்சங்களை உங்கள் திட்டத்தில் சேர்க்கலாம். பின்னர் மாற்றலாம்.",
    hi: "वैकल्पिक ऐड-ऑन के साथ अपने प्लान को बेहतर बनाएं। आप बाद में इन्हें जोड़ या हटा सकते हैं।"
  },
  payrollTrialHelperText: {
    en: "Try Payroll free for 7 days. Charges apply only after trial ends.",
    ms: "Cuba Payroll secara percuma selama 7 hari. Caj hanya dikenakan selepas percubaan tamat.",
    ta: "Payroll ஐ 7 நாட்கள் இலவசமாக முயற்சிக்கவும். சோதனை முடிந்த பிறகே கட்டணம் விதிக்கப்படும்.",
    hi: "7 दिनों के लिए पेरोल मुफ्त आज़माएं। ट्रायल समाप्त होने के बाद ही शुल्क लागू होते हैं।"
  },
  payrollSummaryLine: {
    en: "Payroll add-on",
    ms: "Tambahan Payroll",
    ta: "Payroll கூடுதல் அம்சம்",
    hi: "पेरोल ऐड-ऑन"
  },
  payrollTrialNotice: {
    en: "Trial active — no charge today",
    ms: "Percubaan aktif — tiada caj hari ini",
    ta: "சோதனை செயலில் உள்ளது — இன்று கட்டணம் இல்லை",
    hi: "ट्रायल सक्रिय — आज कोई शुल्क नहीं"
  },
  payrollActivated: {
    en: "Payroll activated",
    ms: "Payroll diaktifkan",
    ta: "Payroll செயல்படுத்தப்பட்டது",
    hi: "पेरोल सक्रिय"
  },
  payrollActivatedMessage: {
    en: "Payroll has been successfully added to your subscription.",
    ms: "Payroll telah berjaya ditambah ke langganan anda.",
    ta: "Payroll உங்கள் சந்தாவிற்கு வெற்றிகரமாக சேர்க்கப்பட்டது.",
    hi: "पेरोल सफलतापूर्वक आपकी सदस्यता में जोड़ दिया गया है।"
  },
  payrollTrialEndingSoon: {
    en: "Payroll trial ending soon",
    ms: "Percubaan Payroll akan tamat",
    ta: "Payroll சோதனை விரைவில் முடிவடையும்",
    hi: "पेरोल ट्रायल जल्द समाप्त हो रहा है"
  },
  payrollTrialEndingSoonMessage: {
    en: "Your Payroll trial ends tomorrow. Please complete payment to continue uninterrupted access.",
    ms: "Percubaan Payroll anda tamat esok. Sila buat pembayaran untuk terus menggunakan perkhidmatan tanpa gangguan.",
    ta: "உங்கள் Payroll சோதனை நாளை முடிவடைகிறது. தொடர்ந்த பயன்பாட்டிற்கு கட்டணம் செலுத்தவும்.",
    hi: "आपका पेरोल ट्रायल कल समाप्त हो रहा है। निर्बाध पहुंच जारी रखने के लिए कृपया भुगतान पूरा करें।"
  },
  payrollNotEnabled: {
    en: "Payroll not enabled",
    ms: "Payroll belum diaktifkan",
    ta: "Payroll செயல்படுத்தப்படவில்லை",
    hi: "पेरोल सक्षम नहीं है"
  },
  payrollNotEnabledMessage: {
    en: "Add Payroll to automate salaries and statutory compliance.",
    ms: "Tambah Payroll untuk automatikkan gaji dan pematuhan berkanun.",
    ta: "சம்பளமும் சட்டபூர்த்தியும் தானியங்கியாக்க Payroll ஐ சேர்க்கவும்.",
    hi: "वेतन और वैधानिक अनुपालन को स्वचालित करने के लिए पेरोल जोड़ें।"
  },
  payrollUpgrade: {
    en: "Upgrade to Payroll",
    ms: "Naik taraf ke Payroll",
    ta: "Payroll க்கு மேம்படுத்தவும்",
    hi: "पेरोल में अपग्रेड करें"
  },
  payrollEnableForMalaysia: {
    en: "Enable Payroll for Malaysia",
    ms: "Aktifkan Payroll untuk Malaysia",
    ta: "மலேசியாவிற்கான Payroll ஐ செயல்படுத்தவும்",
    hi: "मलेशिया के लिए पेरोल सक्षम करें"
  },
  payrollEnableHelperText: {
    en: "Controls availability of Payroll add-on for Malaysian tenants.",
    ms: "Mengawal ketersediaan tambahan Payroll untuk penyewa Malaysia.",
    ta: "மலேசிய வாடிக்கையாளர்களுக்கான Payroll கூடுதல் அம்சத்தின் கிடைப்பை கட்டுப்படுத்துகிறது.",
    hi: "मलेशियाई किरायेदारों के लिए पेरोल ऐड-ऑन की उपलब्धता को नियंत्रित करता है।"
  },
  payrollRevenue: {
    en: "Payroll Revenue",
    ms: "Hasil Payroll",
    ta: "Payroll வருமானம்",
    hi: "पेरोल राजस्व"
  },
  payrollActiveSubscriptions: {
    en: "Active Payroll subscriptions",
    ms: "Langganan Payroll aktif",
    ta: "செயலில் உள்ள Payroll சந்தாக்கள்",
    hi: "सक्रिय पेरोल सदस्यताएं"
  },
} as const;

export function savingsText(lang: Lang, amount: number, percent: number, currency = "₹"): string {
  if (lang === "hi") {
    return percent > 0 ? `${percent}% बचाएं (${currency}${amount.toLocaleString("en-IN")})` : "";
  }
  return percent > 0 ? `Save ${percent}% (${currency}${amount.toLocaleString("en-IN")})` : "";
}

export function savingsBadgeText(lang: Lang, percent: number): string {
  if (lang === "hi") {
    return `${percent}% बचाएं`;
  }
  return `Save ${percent}%`;
}

export function savingsAmountBadge(lang: Lang, amount: number, currency = "₹"): string {
  if (amount <= 0) return "";
  if (lang === "hi") {
    return `${currency}${amount.toLocaleString("en-IN")} बचत`;
  }
  return `Save ${currency}${amount.toLocaleString("en-IN")}`;
}

export function yearlySavingsToggleLabel(lang: Lang, amount: number, currency = "₹"): string {
  const yearlyLabels: Record<Lang, string> = {
    en: "Yearly",
    hi: "वार्षिक",
    ms: "Tahunan",
    ta: "வருடாந்திர",
  };
  const yearlyLabel = yearlyLabels[lang] || yearlyLabels.en;
  if (amount <= 0) {
    return yearlyLabel;
  }
  const formattedAmount = `${currency}${amount.toLocaleString("en-IN")}`;
  if (lang === "hi") {
    return `${yearlyLabel} (${formattedAmount} बचत)`;
  }
  if (lang === "ms") {
    return `${yearlyLabel} (Jimat ${formattedAmount})`;
  }
  if (lang === "ta") {
    return `${yearlyLabel} (${formattedAmount} சேமிப்பு)`;
  }
  return `${yearlyLabel} (Save ${formattedAmount})`;
}

export function savingsComparisonText(lang: Lang, amount: number, currency = "₹"): string {
  if (amount <= 0) return "";
  const formattedAmount = `${currency}${amount.toLocaleString("en-IN")}`;
  if (lang === "hi") {
    return `मासिक बिलिंग की तुलना में आप ${formattedAmount} बचाते हैं।`;
  }
  if (lang === "ms") {
    return `Anda jimat ${formattedAmount} berbanding bil bulanan.`;
  }
  if (lang === "ta") {
    return `மாதாந்திர பில்லிங்கோடு ஒப்பிடும்போது ${formattedAmount} சேமிப்பு.`;
  }
  return `You save ${formattedAmount} compared to monthly billing.`;
}

export function pricePerPeriod(lang: Lang, price: string | number, cycle: "monthly" | "yearly"): string {
  const priceStr = typeof price === "number" ? `₹${price.toLocaleString("en-IN")}` : price;
  if (lang === "hi") {
    return cycle === "yearly" ? `${priceStr}/वर्ष` : `${priceStr}/महीना`;
  }
  return cycle === "yearly" ? `${priceStr}/year` : `${priceStr}/month`;
}

export function billedAs(lang: Lang, cycle: "monthly" | "yearly"): string {
  if (lang === "hi") {
    return cycle === "yearly" ? "वार्षिक बिल" : "मासिक बिल";
  }
  return cycle === "yearly" ? "Billed yearly" : "Billed monthly";
}

export function downgradeBannerText(lang: Lang, targetPlanName: string, effectiveDate: string): string {
  if (lang === "hi") {
    return `आपका प्लान ${effectiveDate} को ${targetPlanName} में बदल जाएगा। तब तक आप सभी मौजूदा फीचर्स इस्तेमाल कर सकते हैं।`;
  }
  if (lang === "ms") {
    return `Pelan anda akan bertukar ke ${targetPlanName} pada ${effectiveDate}. Anda boleh terus menggunakan semua ciri sehingga itu.`;
  }
  if (lang === "ta") {
    return `உங்கள் திட்டம் ${effectiveDate} அன்று ${targetPlanName} க்கு மாறும். அதுவரை அனைத்து அம்சங்களையும் பயன்படுத்தலாம்.`;
  }
  return `Your plan will change to ${targetPlanName} on ${effectiveDate}. You'll keep all current features until then.`;
}

export function t(lang: Lang, key: keyof typeof BILLING_STRINGS): string {
  const entry = BILLING_STRINGS[key] as Record<string, string>;
  return entry[lang] || entry["en"] || "";
}

export function getTierLabel(lang: Lang, tier: string): string {
  const safeLang = lang || "en";
  const tierMap: Record<string, keyof typeof BILLING_STRINGS> = {
    free: "tierFree",
    basic: "tierBasic",
    pro: "tierPro",
    enterprise: "tierEnterprise",
  };
  const key = tierMap[tier?.toLowerCase() || "free"];
  if (!key) return tier;
  const entry = BILLING_STRINGS[key] as Record<string, string>;
  return entry[safeLang] || entry["en"] || tier;
}

const FEATURE_KEY_I18N_MAP: Record<string, keyof typeof BILLING_STRINGS> = {
  basic_analytics: "featureBasicReporting",
  advanced_analytics: "featureAdvancedReporting",
  email_notifications: "featureEmailNotifications",
  sms_notifications: "featureSmsNotifications",
  whatsapp_automation: "featureWhatsappAutomation",
  gst_features: "featureGstInvoicing",
  priority_support: "featurePrioritySupport",
  api_access: "featureApiAccess",
  custom_branding: "featureCustomBranding",
};

export function getFeatureLabel(lang: Lang, featureKey: string): string {
  const safeLang = lang || "en";
  const i18nKey = FEATURE_KEY_I18N_MAP[featureKey];
  if (!i18nKey) return featureKey;
  const entry = BILLING_STRINGS[i18nKey] as Record<string, string>;
  return entry[safeLang] || entry["en"] || featureKey;
}

export function getLimitChangeText(lang: Lang, type: "users" | "records", from: number | string, to: number | string): string {
  const safeLang = lang || "en";
  const usersEntry = BILLING_STRINGS.usersLimit as Record<string, string>;
  const recordsEntry = BILLING_STRINGS.recordsLimit as Record<string, string>;
  const unlimitedEntry = BILLING_STRINGS.unlimited as Record<string, string>;
  const label = type === "users" 
    ? (usersEntry[safeLang] || usersEntry["en"] || "Users") 
    : (recordsEntry[safeLang] || recordsEntry["en"] || "Records");
  const unlimitedStr = unlimitedEntry[safeLang] || unlimitedEntry["en"] || "Unlimited";
  const fromStr = from === -1 || from === "Unlimited" ? unlimitedStr : String(from);
  const toStr = to === -1 || to === "Unlimited" ? unlimitedStr : String(to);
  return `${label}: ${fromStr} → ${toStr}`;
}

export function getLimitText(lang: Lang, limitKey: string, value: number): string {
  const safeLang = lang || "en";
  const unlimitedEntry = BILLING_STRINGS.unlimited as Record<string, string>;
  const unlimitedStr = unlimitedEntry[safeLang] || unlimitedEntry["en"] || "Unlimited";
  const labelMap: Record<string, keyof typeof BILLING_STRINGS> = {
    users: "usersLimit",
    records: "recordsLimit",
    customers: "usersLimit",
  };
  const i18nKey = labelMap[limitKey];
  let label = limitKey;
  if (i18nKey) {
    const entry = BILLING_STRINGS[i18nKey] as Record<string, string>;
    const labelStr = entry[safeLang] || entry["en"];
    if (labelStr) label = labelStr.toLowerCase();
  }
  if (value === -1) {
    return `${unlimitedStr} ${label}`;
  }
  return `${value.toLocaleString()} ${label}`;
}

export function formatDateLocalized(lang: Lang, date: Date | string): string {
  const localeMap: Record<Lang, string> = {
    en: "en-IN",
    hi: "hi-IN",
    ms: "ms-MY",
    ta: "ta-MY"
  };
  const locale = localeMap[lang] || "en-IN";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}
