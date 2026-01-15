import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Lang = "en" | "hi";

interface FAQItem {
  question: { en: string; hi: string };
  answer: { en: string; hi: string };
}

interface FAQProps {
  lang: Lang;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: {
      en: "Can I switch plans later?",
      hi: "क्या मैं बाद में प्लान बदल सकता हूं?"
    },
    answer: {
      en: "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated difference. When downgrading, the change takes effect at the end of your billing cycle.",
      hi: "हां, आप किसी भी समय अपना प्लान अपग्रेड या डाउनग्रेड कर सकते हैं। अपग्रेड करते समय, आपसे प्रो-रेटेड अंतर लिया जाएगा। डाउनग्रेड करते समय, बदलाव आपके बिलिंग साइकल के अंत में प्रभावी होता है।"
    }
  },
  {
    question: {
      en: "Is there a free trial?",
      hi: "क्या कोई मुफ्त ट्रायल है?"
    },
    answer: {
      en: "The Free plan is always available with no time limit. For paid plans, we offer a 7-day money-back guarantee. Payroll Add-On includes a 7-day free trial.",
      hi: "मुफ्त प्लान हमेशा बिना समय सीमा के उपलब्ध है। पेड प्लान्स के लिए, हम 7 दिन की मनी-बैक गारंटी देते हैं। Payroll ऐड-ऑन में 7 दिन का मुफ्त ट्रायल शामिल है।"
    }
  },
  {
    question: {
      en: "What payment methods do you accept?",
      hi: "आप कौन से भुगतान तरीके स्वीकार करते हैं?"
    },
    answer: {
      en: "We accept all major credit/debit cards, UPI, net banking, and popular wallets through Razorpay. GST invoice is provided for all payments.",
      hi: "हम Razorpay के माध्यम से सभी प्रमुख क्रेडिट/डेबिट कार्ड, UPI, नेट बैंकिंग और लोकप्रिय वॉलेट स्वीकार करते हैं। सभी भुगतानों के लिए GST इनवॉइस प्रदान किया जाता है।"
    }
  },
  {
    question: {
      en: "How does the Payroll Add-On pricing work?",
      hi: "Payroll ऐड-ऑन की प्राइसिंग कैसे काम करती है?"
    },
    answer: {
      en: "Payroll pricing is based on your employee count. 1-5 employees: ₹99/month, 6-20 employees: ₹199/month, 21-50 employees: ₹399/month. You can start with a 7-day free trial.",
      hi: "Payroll की कीमत आपके कर्मचारियों की संख्या पर आधारित है। 1-5 कर्मचारी: ₹99/माह, 6-20 कर्मचारी: ₹199/माह, 21-50 कर्मचारी: ₹399/माह। आप 7 दिन के मुफ्त ट्रायल से शुरू कर सकते हैं।"
    }
  },
  {
    question: {
      en: "Can I cancel anytime?",
      hi: "क्या मैं कभी भी रद्द कर सकता हूं?"
    },
    answer: {
      en: "Yes, you can cancel your subscription at any time. Your access continues until the end of your current billing period. No questions asked.",
      hi: "हां, आप किसी भी समय अपनी सदस्यता रद्द कर सकते हैं। आपकी पहुंच आपके वर्तमान बिलिंग अवधि के अंत तक जारी रहती है। कोई सवाल नहीं पूछा जाता।"
    }
  },
  {
    question: {
      en: "Is my data secure?",
      hi: "क्या मेरा डेटा सुरक्षित है?"
    },
    answer: {
      en: "Absolutely. We use industry-standard encryption, secure servers, and follow best practices for data protection. Your data is backed up daily and you can export it anytime.",
      hi: "बिल्कुल। हम इंडस्ट्री-स्टैंडर्ड एन्क्रिप्शन, सुरक्षित सर्वर का उपयोग करते हैं और डेटा सुरक्षा के लिए सर्वोत्तम प्रथाओं का पालन करते हैं। आपका डेटा रोजाना बैकअप लिया जाता है और आप इसे कभी भी एक्सपोर्ट कर सकते हैं।"
    }
  }
];

const CONTENT = {
  title: { en: "Frequently Asked Questions", hi: "अक्सर पूछे जाने वाले प्रश्न" }
};

export function FAQ({ lang }: FAQProps) {
  return (
    <div className="max-w-3xl mx-auto" data-testid="faq-section">
      <h2 className="text-2xl font-bold text-center mb-8" data-testid="text-faq-title">
        {CONTENT.title[lang]}
      </h2>
      <Accordion type="single" collapsible className="w-full">
        {FAQ_ITEMS.map((item, idx) => (
          <AccordionItem key={idx} value={`faq-${idx}`} data-testid={`faq-item-${idx}`}>
            <AccordionTrigger className="text-left" data-testid={`faq-trigger-${idx}`}>
              {item.question[lang]}
            </AccordionTrigger>
            <AccordionContent data-testid={`faq-content-${idx}`}>
              {item.answer[lang]}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
