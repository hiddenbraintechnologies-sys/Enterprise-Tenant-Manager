import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config, getRandomTenant, buildUrl, getHeaders } from './config.js';
import { authenticate, getAuthenticatedHeaders } from './helpers/auth-helper.js';

// Custom metrics
const messageSendTime = new Trend('message_send_time');
const messageDeliveryRate = new Rate('message_delivery_rate');
const templateLoadTime = new Trend('template_load_time');
const conversationLoadTime = new Trend('conversation_load_time');
const whatsappErrors = new Counter('whatsapp_errors');
const messagesPerSecond = new Counter('messages_sent');

export const options = {
  scenarios: {
    // Normal messaging traffic
    normal_messaging: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
    // Broadcast campaign simulation
    broadcast_campaign: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      stages: [
        { duration: '1m', target: 200 },
        { duration: '3m', target: 500 },
        { duration: '1m', target: 200 },
      ],
      preAllocatedVUs: 100,
      maxVUs: 300,
      startTime: '10m',
    },
    // Conversation load
    conversation_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      startTime: '15m',
      exec: 'conversationFlow',
    },
  },
  thresholds: {
    'message_send_time': ['p(95)<1000', 'p(99)<2000'],
    'message_delivery_rate': ['rate>0.95'],
    'template_load_time': ['p(95)<500'],
    'conversation_load_time': ['p(95)<1000'],
    'whatsapp_errors': ['count<100'],
    'http_req_failed': ['rate<0.05'],
  },
};

// Phone number generator
function generatePhoneNumber(countryCode = '+91') {
  const number = Math.floor(Math.random() * 9000000000) + 1000000000;
  return `${countryCode}${number}`;
}

// Message templates
const messageTemplates = [
  {
    templateId: 'order_confirmation',
    params: { orderId: 'ORD-12345', amount: '1,500' },
  },
  {
    templateId: 'appointment_reminder',
    params: { date: '2024-01-15', time: '10:00 AM' },
  },
  {
    templateId: 'payment_received',
    params: { amount: '5,000', method: 'UPI' },
  },
  {
    templateId: 'welcome_message',
    params: { name: 'Customer' },
  },
];

export function setup() {
  console.log(`Starting WhatsApp load test against ${config.baseUrl}`);
  return { startTime: new Date().toISOString() };
}

export default function (data) {
  const tenant = getRandomTenant();
  const userIndex = Math.floor(Math.random() * config.usersPerTenant) + 1;
  
  // Authenticate
  const tokenData = authenticate(tenant, userIndex);
  const headers = getAuthenticatedHeaders(tokenData);
  
  messageSendFlow(headers, tenant);
}

export function conversationFlow() {
  const tenant = getRandomTenant();
  const userIndex = Math.floor(Math.random() * config.usersPerTenant) + 1;
  
  const tokenData = authenticate(tenant, userIndex);
  const headers = getAuthenticatedHeaders(tokenData);
  
  conversationBrowseFlow(headers, tenant);
}

function messageSendFlow(headers, tenant) {
  group('WhatsApp Message Send', () => {
    // Select random template
    const template = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
    const phone = generatePhoneNumber();
    
    const messagePayload = JSON.stringify({
      to: phone,
      templateId: template.templateId,
      templateParams: template.params,
      channel: 'whatsapp',
    });
    
    const start = Date.now();
    const res = http.post(
      buildUrl(config.endpoints.whatsapp.send),
      messagePayload,
      { headers }
    );
    const sendTime = Date.now() - start;
    
    messageSendTime.add(sendTime);
    messagesPerSecond.add(1);
    
    const success = check(res, {
      'send status is 200 or 202': (r) => r.status === 200 || r.status === 202,
      'send returns message ID': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.messageId !== undefined || body.id !== undefined;
        } catch {
          return r.status === 200 || r.status === 202;
        }
      },
      'send time < 2s': () => sendTime < 2000,
    });
    
    messageDeliveryRate.add(success);
    if (!success) whatsappErrors.add(1);
    
    // Check message status (30% of messages)
    if (success && Math.random() < 0.3) {
      sleep(0.5);
      
      group('Check Status', () => {
        try {
          const body = JSON.parse(res.body);
          const messageId = body.messageId || body.id;
          
          if (messageId) {
            const statusRes = http.get(
              `${buildUrl(config.endpoints.whatsapp.status)}/${messageId}`,
              { headers }
            );
            
            check(statusRes, {
              'status check is 200': (r) => r.status === 200,
            });
          }
        } catch (e) {
          // Ignore parse errors
        }
      });
    }
  });
  
  sleep(Math.random() * 0.5);
}

function conversationBrowseFlow(headers, tenant) {
  group('WhatsApp Conversations', () => {
    // Load templates
    group('Templates', () => {
      const start = Date.now();
      const res = http.get(buildUrl(config.endpoints.whatsapp.templates), { headers });
      const loadTime = Date.now() - start;
      
      templateLoadTime.add(loadTime);
      
      check(res, {
        'templates status is 200': (r) => r.status === 200,
        'templates returns array': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body) || Array.isArray(body.templates);
          } catch {
            return r.status === 200;
          }
        },
      });
    });
    
    sleep(0.3);
    
    // Load conversations list
    group('Conversations List', () => {
      const start = Date.now();
      const res = http.get(
        `${buildUrl(config.endpoints.whatsapp.conversations)}?page=1&limit=20`,
        { headers }
      );
      const loadTime = Date.now() - start;
      
      conversationLoadTime.add(loadTime);
      
      check(res, {
        'conversations status is 200': (r) => r.status === 200,
      });
    });
    
    sleep(0.5);
    
    // Load specific conversation (simulate)
    group('Conversation Detail', () => {
      const conversationId = `conv_${Math.random().toString(36).substring(7)}`;
      const res = http.get(
        `${buildUrl(config.endpoints.whatsapp.conversations)}/${conversationId}/messages`,
        { headers }
      );
      
      check(res, {
        'conversation detail status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      });
    });
  });
  
  sleep(Math.random() * 2 + 1);
}

export function teardown(data) {
  console.log(`WhatsApp load test completed. Started at: ${data.startTime}`);
}
