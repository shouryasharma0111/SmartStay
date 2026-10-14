/**
 * SmartStay AI Chatbot ("StayBot")
 * Auto-injecting floating AI Assistant widget for all SmartStay pages.
 * Supports:
 * 1. Live Google Gemini API (gemini-1.5-flash / gemini-2.5-flash) with custom system prompt.
 * 2. Built-in Offline SmartStay Knowledge Engine (zero configuration, student & landlord AI concierge).
 */

import { SmartStayAPI } from './apiService.js';
import { MOCK_PROPERTIES } from './mockData.js';

const STORAGE_API_KEY = 'smartstay_gemini_api_key';
const STORAGE_CHAT_HISTORY = 'smartstay_chat_history';

// =========================================================================
// SMARTSTAY AI KNOWLEDGE BASE & SYSTEM INSTRUCTIONS
// =========================================================================

const SMARTSTAY_SYSTEM_PROMPT = `
You are StayBot, the official intelligent AI Concierge for SmartStay (India's premier Student & Working Professional Rental Finder).

PROJECT CONTEXT & CORE ARCHITECTURE:
1. Platform Purpose:
   - Zero-brokerage verified student housing, PGs, hostels, and flats across NCR (Ghaziabad, Noida, Greater Noida, Delhi) and Bengaluru.
2. Verified Listings Workflow:
   - Step 1 (Owner): Landlord registers and submits a listing with property details, rent, photos, and utility bill (electricity bill) + Aadhaar KYC.
   - Step 2 (Initial State): Newly submitted properties are assigned 'PENDING' status by the backend.
   - Step 3 (Admin Review): Admin inspects physical address, Google Geocoding coordinates (Lat/Lng), and documents. Admin can APPROVE (status becomes VERIFIED) or REJECT (with rejection reason).
   - Step 4 (Tenant Search): Only VERIFIED listings show the green '✓ Verified' badge and appear in public tenant search.
3. College Hubs & Localities:
   - Ghaziabad: Near ABES Engineering College (Crossing Republik / NH-24), Indirapuram, KIET, AKGEC.
   - Noida: Sector 62, Knowledge Park, JSS Academy of Technical Education.
   - Greater Noida: Alpha 1, Pari Chowk, Galgotias University.
   - Delhi: North Campus (DU), South Campus, IIT Delhi.
   - Bengaluru: Koramangala (4th Block), Whitefield.
4. Room & Rent Categories:
   - Budget sharing: ₹6,000 - ₹8,500/mo (Food, Wi-Fi, Double/Triple sharing).
   - Standard PG: ₹8,500 - ₹12,000/mo (AC, Attached Bath, Power Backup).
   - Premium Studios & 1BHK: ₹12,000 - ₹25,000/mo.
5. Trust & Safety:
   - 100% scam prevention: Tenants can file fraud reports if a property is already rented, photos are fake, or owner demands unauthorized cash.
`;

// =========================================================================
// ANIMATED WAVING ROBOT AI ICON SVG
// =========================================================================

const ROBOT_WAVING_SVG = `
<svg class="staybot-robot-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Antenna with Glowing Signal Tip -->
  <line x1="24" y1="5" x2="24" y2="12" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="24" cy="4.5" r="3.2" fill="#38BDF8" class="staybot-antenna-light"/>
  
  <!-- Robot Head -->
  <rect x="10.5" y="11.5" width="27" height="20" rx="7" fill="#FFFFFF" stroke="#DBEAFE" stroke-width="1.2"/>
  
  <!-- Ear Headphones -->
  <rect x="7.5" y="17.5" width="3" height="8" rx="1.5" fill="#38BDF8"/>
  <rect x="37.5" y="17.5" width="3" height="8" rx="1.5" fill="#38BDF8"/>
  
  <!-- Visor Screen -->
  <rect x="14" y="14.5" width="20" height="12.5" rx="4.5" fill="#0F172A"/>
  
  <!-- Glowing Animated Eyes -->
  <ellipse cx="18.5" cy="20.5" rx="2" ry="2.5" fill="#38BDF8" class="staybot-eye left"/>
  <ellipse cx="29.5" cy="20.5" rx="2" ry="2.5" fill="#38BDF8" class="staybot-eye right"/>
  
  <!-- Rosy Cheeks -->
  <circle cx="16" cy="24" r="1.1" fill="#FB7185" opacity="0.8"/>
  <circle cx="32" cy="24" r="1.1" fill="#FB7185" opacity="0.8"/>
  
  <!-- Friendly Curved Smile -->
  <path d="M21.5 24C22.5 25.2 25.5 25.2 26.5 24" stroke="#38BDF8" stroke-width="1.3" stroke-linecap="round"/>
  
  <!-- Torso Body -->
  <path d="M13.5 32.5C13.5 31 15 30 17 30H31C33 30 34.5 31 34.5 32.5L35.5 42.5C35.5 44 34 45 32.5 45H15.5C14 45 12.5 44 12.5 42.5L13.5 32.5Z" fill="#FFFFFF"/>
  <rect x="18" y="33.5" width="12" height="6" rx="2" fill="#E0F2FE"/>
  <!-- AI Core Heartbeat Pulse -->
  <circle cx="24" cy="36.5" r="1.8" fill="#10B981" class="staybot-core-pulse"/>
  
  <!-- Resting Left Arm -->
  <path d="M13 33C10.5 35 9 38.5 10.5 41C11.5 42.5 13.5 42 14 40" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round"/>
  
  <!-- Waving Right Hand Arm Group -->
  <g class="staybot-waving-arm-group">
    <!-- Arm segment -->
    <path d="M34 32C37.5 28.5 40.5 23.5 38.5 17.5" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
    <!-- Cute Waving Hand Mitten -->
    <ellipse cx="38.5" cy="15.5" rx="3.2" ry="2.6" transform="rotate(-15 38.5 15.5)" fill="#FFFFFF"/>
    <!-- Motion Sparkle -->
    <path d="M42.5 9L43.5 11L45.5 12L43.5 13L42.5 15L41.5 13L39.5 12L41.5 11L42.5 9Z" fill="#FDE047" class="staybot-sparkle"/>
    <path d="M43.5 14C45 15.5 45 18 44 19.5" stroke="#FDE047" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="1 2" class="staybot-motion-arc"/>
  </g>
</svg>
`;

// Initial Greeting
const DEFAULT_GREETING = "Hello! 👋 I'm **StayBot**, your SmartStay AI assistant. How can I help you today? Ask me about verified PGs near your college, budget rooms, verification rules, or how to list your property!";

// =========================================================================
// WIDGET AUTO-INJECTION & DOM SETUP
// =========================================================================

class StayBotWidget {
  constructor() {
    this.isOpen = false;
    this.apiKey = localStorage.getItem(STORAGE_API_KEY) || '';
    this.messages = this.loadHistory();
    this.injectDOM();
    this.initEvents();
    this.renderMessages();
  }

  loadHistory() {
    try {
      const saved = sessionStorage.getItem(STORAGE_CHAT_HISTORY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { sender: 'bot', text: DEFAULT_GREETING, time: this.getCurrentTime() }
    ];
  }

  saveHistory() {
    try {
      sessionStorage.setItem(STORAGE_CHAT_HISTORY, JSON.stringify(this.messages));
    } catch (e) {}
  }

  getCurrentTime() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  injectDOM() {
    if (document.getElementById('staybot-root')) return;

    const container = document.createElement('div');
    container.id = 'staybot-root';
    container.innerHTML = `
      <!-- Trigger Button -->
      <button class="staybot-trigger" id="staybotTrigger" title="Chat with SmartStay AI Assistant">
        <span class="staybot-trigger-badge">AI</span>
        <div class="staybot-trigger-icon-wrap">
          <div class="staybot-robot-icon-container">
            ${ROBOT_WAVING_SVG}
          </div>
          <span class="staybot-trigger-close-icon">✕</span>
        </div>
      </button>

      <!-- Chat Window -->
      <div class="staybot-window" id="staybotWindow">
        <!-- Header -->
        <div class="staybot-header">
          <div class="staybot-header-left">
            <div class="staybot-avatar">
              ${ROBOT_WAVING_SVG}
            </div>
            <div class="staybot-header-title">
              <h4>StayBot <span style="font-size:10px; background:#10B981; color:#fff; padding:1px 5px; border-radius:4px;">AI</span></h4>
              <p><span class="staybot-status-dot"></span> Online • SmartStay Concierge</p>
            </div>
          </div>
          <div class="staybot-header-actions">
            <button class="staybot-header-btn" id="staybotSettingsBtn" title="AI Settings / API Key">⚙️</button>
            <button class="staybot-header-btn" id="staybotCloseBtn" title="Close Chat">✕</button>
          </div>
        </div>

        <!-- Settings Drawer -->
        <div class="staybot-settings-drawer" id="staybotSettingsDrawer">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h4 style="margin:0; font-size:15px; color:#0F172A;">⚙️ AI Configuration</h4>
            <button class="staybot-header-btn" id="staybotCloseSettingsBtn" style="color:#0F172A; background:#F1F5F9;">✕</button>
          </div>
          <p style="font-size:12.5px; color:#64748B; margin-bottom:14px; line-height:1.4;">
            StayBot works out-of-the-box using the built-in SmartStay Project Knowledge Engine. Optionally add your Google Gemini API Key for live generative AI:
          </p>
          <label style="font-size:12px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Gemini API Key (Optional)</label>
          <input type="password" id="staybotApiKeyInput" class="staybot-input" style="width:100%; margin-bottom:12px;" placeholder="AIzaSy..." value="${this.apiKey}">
          <button id="staybotSaveKeyBtn" style="background:#2563EB; color:#fff; padding:8px 14px; border-radius:8px; font-size:13px; font-weight:700; border:none; cursor:pointer; margin-bottom:12px;">Save API Key</button>
          
          <hr style="border:none; border-top:1px solid #E2E8F0; margin:14px 0;">
          <button id="staybotClearChatBtn" style="background:#FEE2E2; color:#DC2626; padding:8px 14px; border-radius:8px; font-size:12.5px; font-weight:600; border:none; cursor:pointer;">Clear Chat History</button>
        </div>

        <!-- Chat Body -->
        <div class="staybot-body" id="staybotBody"></div>

        <!-- Suggestion Chips -->
        <div class="staybot-chips-wrap" id="staybotChips">
          <button class="staybot-chip" data-query="Show me verified PGs near ABES College">🎓 Near ABES College</button>
          <button class="staybot-chip" data-query="Find budget rooms under ₹8,000">💰 Under ₹8,000</button>
          <button class="staybot-chip" data-query="How does property verification work on SmartStay?">🛡️ Verification Rules</button>
          <button class="staybot-chip" data-query="How can I list my PG as an owner?">🏢 How to List PG</button>
          <button class="staybot-chip" data-query="How do I report a fake or rented listing?">🚨 Report Fake PG</button>
        </div>

        <!-- Footer Input -->
        <div class="staybot-footer">
          <input type="text" id="staybotInput" class="staybot-input" placeholder="Ask StayBot anything about PGs, rent...">
          <button class="staybot-send-btn" id="staybotSendBtn" title="Send Message">➤</button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
  }

  initEvents() {
    const trigger = document.getElementById('staybotTrigger');
    const windowEl = document.getElementById('staybotWindow');
    const closeBtn = document.getElementById('staybotCloseBtn');
    const sendBtn = document.getElementById('staybotSendBtn');
    const input = document.getElementById('staybotInput');
    const settingsBtn = document.getElementById('staybotSettingsBtn');
    const closeSettingsBtn = document.getElementById('staybotCloseSettingsBtn');
    const saveKeyBtn = document.getElementById('staybotSaveKeyBtn');
    const clearChatBtn = document.getElementById('staybotClearChatBtn');

    trigger.addEventListener('click', () => this.toggleChat());
    closeBtn.addEventListener('click', () => this.toggleChat(false));

    sendBtn.addEventListener('click', () => this.handleUserSend());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleUserSend();
    });

    // Chips click
    document.querySelectorAll('.staybot-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const q = chip.getAttribute('data-query');
        input.value = q;
        this.handleUserSend();
      });
    });

    // Settings
    settingsBtn.addEventListener('click', () => {
      document.getElementById('staybotSettingsDrawer').classList.toggle('open');
    });
    closeSettingsBtn.addEventListener('click', () => {
      document.getElementById('staybotSettingsDrawer').classList.remove('open');
    });
    saveKeyBtn.addEventListener('click', () => {
      const key = document.getElementById('staybotApiKeyInput').value.trim();
      localStorage.setItem(STORAGE_API_KEY, key);
      this.apiKey = key;
      alert('API Key saved successfully!');
      document.getElementById('staybotSettingsDrawer').classList.remove('open');
    });
    clearChatBtn.addEventListener('click', () => {
      this.messages = [{ sender: 'bot', text: DEFAULT_GREETING, time: this.getCurrentTime() }];
      this.saveHistory();
      this.renderMessages();
      document.getElementById('staybotSettingsDrawer').classList.remove('open');
    });
  }

  toggleChat(forceState = null) {
    this.isOpen = forceState !== null ? forceState : !this.isOpen;
    const windowEl = document.getElementById('staybotWindow');
    const triggerEl = document.getElementById('staybotTrigger');
    windowEl.classList.toggle('open', this.isOpen);
    if (triggerEl) triggerEl.classList.toggle('active', this.isOpen);

    if (this.isOpen) {
      setTimeout(() => {
        document.getElementById('staybotInput')?.focus();
        this.scrollToBottom();
      }, 200);
    }
  }

  scrollToBottom() {
    const body = document.getElementById('staybotBody');
    if (body) {
      body.scrollTop = body.scrollHeight;
    }
  }

  renderMessages() {
    const body = document.getElementById('staybotBody');
    if (!body) return;

    body.innerHTML = this.messages.map(msg => {
      const isBot = msg.sender === 'bot';
      return `
        <div class="staybot-msg ${isBot ? 'bot' : 'user'}">
          <div class="staybot-bubble">
            ${this.formatMarkdown(msg.text)}
            ${msg.cards ? this.renderPropertyMiniCards(msg.cards) : ''}
          </div>
          <span class="staybot-time">${msg.time}</span>
        </div>
      `;
    }).join('');

    this.scrollToBottom();
  }

  formatMarkdown(text) {
    if (!text) return '';
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:#EEF2F6; padding:2px 4px; border-radius:4px; font-size:12px;">$1</code>')
      .replace(/\n/g, '<br>');
    return formatted;
  }

  renderPropertyMiniCards(cards) {
    if (!Array.isArray(cards) || cards.length === 0) return '';
    return cards.map(p => `
      <div class="staybot-prop-mini-card">
        <img src="${p.image || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop'}" alt="${p.name}" class="staybot-prop-mini-img">
        <div class="staybot-prop-mini-info">
          <div class="staybot-prop-mini-title">${p.name}</div>
          <div class="staybot-prop-mini-meta">
            <span>₹${Number(p.rent).toLocaleString('en-IN')}/mo • ${p.locality || p.city}</span>
            <span class="staybot-prop-badge">✓ Verified</span>
          </div>
          <a href="Smartstay PropertyListing (HTML).html" style="display:inline-block; margin-top:6px; font-size:11px; font-weight:700; color:#2563EB; text-decoration:none;">View Property →</a>
        </div>
      </div>
    `).join('');
  }

  showTyping() {
    const body = document.getElementById('staybotBody');
    if (!body) return;
    const typing = document.createElement('div');
    typing.id = 'staybotTypingIndicator';
    typing.className = 'staybot-msg bot';
    typing.innerHTML = `
      <div class="staybot-typing">
        <span class="staybot-dot"></span>
        <span class="staybot-dot"></span>
        <span class="staybot-dot"></span>
      </div>
    `;
    body.appendChild(typing);
    this.scrollToBottom();
  }

  hideTyping() {
    const typing = document.getElementById('staybotTypingIndicator');
    if (typing) typing.remove();
  }

  async handleUserSend() {
    const input = document.getElementById('staybotInput');
    const text = input.value.trim();
    if (!text) return;

    // Add user message
    this.messages.push({ sender: 'user', text, time: this.getCurrentTime() });
    input.value = '';
    this.renderMessages();
    this.saveHistory();

    this.showTyping();

    try {
      let botResponse = '';
      let recommendedCards = [];

      // If user configured Gemini API Key, try live Gemini API first
      if (this.apiKey) {
        try {
          const res = await this.queryGeminiAPI(text);
          botResponse = res;
        } catch (apiErr) {
          console.warn('Gemini API query failed, falling back to built-in SmartStay Intelligence:', apiErr);
          const fallback = this.generateLocalAIResponse(text);
          botResponse = fallback.text;
          recommendedCards = fallback.cards;
        }
      } else {
        // Built-in SmartStay Knowledge Engine (100% reliable offline/online)
        await new Promise(r => setTimeout(r, 600)); // natural typing pause
        const local = this.generateLocalAIResponse(text);
        botResponse = local.text;
        recommendedCards = local.cards;
      }

      this.hideTyping();
      this.messages.push({
        sender: 'bot',
        text: botResponse,
        cards: recommendedCards,
        time: this.getCurrentTime()
      });
      this.renderMessages();
      this.saveHistory();
    } catch (err) {
      this.hideTyping();
      this.messages.push({
        sender: 'bot',
        text: "I'm having trouble connecting right now. Please try again or check your query!",
        time: this.getCurrentTime()
      });
      this.renderMessages();
    }
  }

  /**
   * Mode 1: Query Google Gemini API
   */
  async queryGeminiAPI(userPrompt) {
    const allProps = await this.getLivePropertiesSnapshot();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

    const payload = {
      contents: [
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      systemInstruction: {
        parts: [{
          text: `${SMARTSTAY_SYSTEM_PROMPT}\n\nCURRENT LIVE PROPERTIES IN DATABASE:\n${JSON.stringify(allProps)}`
        }]
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I found information for your request.";
  }

  async getLivePropertiesSnapshot() {
    const res = await SmartStayAPI.getProperties({});
    return (res.data || []).slice(0, 10).map(p => ({
      id: p.id,
      name: p.name,
      rent: p.rent,
      city: p.city,
      locality: p.locality,
      type: p.propertyType,
      gender: p.gender,
      verified: p.verification_status === 'VERIFIED'
    }));
  }

  /**
   * Mode 2: Built-in SmartStay Conversational Knowledge Engine
   */
  generateLocalAIResponse(query) {
    const q = query.toLowerCase();

    // 1. College / Locality Intent: ABES / Ghaziabad
    if (q.includes('abes') || q.includes('crossing republik') || q.includes('ghaziabad')) {
      const matches = MOCK_PROPERTIES.filter(p => p.city === 'Ghaziabad' || (p.locality && p.locality.includes('ABES')));
      return {
        text: `Here are the top **Verified Student PGs near ABES Engineering College, Ghaziabad** with zero brokerage and fast Wi-Fi:`,
        cards: matches.slice(0, 2)
      };
    }

    // 2. Noida / Sector 62 / JSS
    if (q.includes('noida') || q.includes('sector 62') || q.includes('jss')) {
      const matches = MOCK_PROPERTIES.filter(p => p.city === 'Noida');
      return {
        text: `I found these verified listings in **Noida (Sector 62 / IT Corridor)** close to colleges & metro stations:`,
        cards: matches.slice(0, 2)
      };
    }

    // 3. Greater Noida / Alpha 1 / Pari Chowk / Galgotias
    if (q.includes('greater noida') || q.includes('alpha') || q.includes('galgotias')) {
      const matches = MOCK_PROPERTIES.filter(p => p.city === 'Greater Noida');
      return {
        text: `Here are popular student residences in **Greater Noida (Alpha 1 / Knowledge Park)**:`,
        cards: matches.slice(0, 2)
      };
    }

    // 4. Bengaluru / Koramangala / Whitefield
    if (q.includes('bengaluru') || q.includes('bangalore') || q.includes('koramangala')) {
      const matches = MOCK_PROPERTIES.filter(p => p.city === 'Bengaluru');
      return {
        text: `Found verified properties in **Bengaluru (Koramangala & Whitefield)**:`,
        cards: matches.slice(0, 2)
      };
    }

    // 5. Budget / Low Rent ("under 8000", "cheap", "budget", "under 7000", "under 10000")
    if (q.includes('under') || q.includes('budget') || q.includes('cheap') || q.includes('6000') || q.includes('7000') || q.includes('8000')) {
      const matches = MOCK_PROPERTIES.filter(p => p.rent <= 9000);
      return {
        text: `Here are top student budget accommodations **under ₹9,000 / month** including food and Wi-Fi:`,
        cards: matches.slice(0, 2)
      };
    }

    // 6. Girls / Boys PG
    if (q.includes('girl') || q.includes('female') || q.includes('women')) {
      const matches = MOCK_PROPERTIES.filter(p => p.gender === 'Girls');
      return {
        text: `Here are safe, biometric-secured **Girls PGs & Hostels** with 24/7 warden support:`,
        cards: matches.slice(0, 2)
      };
    }

    // 7. Verification Workflow FAQ
    if (q.includes('verif') || q.includes('badge') || q.includes('pending') || q.includes('approve') || q.includes('document')) {
      return {
        text: `🛡️ **SmartStay Verification Workflow Explained:**\n\n1. **Landlord Submission:** Owner submits listing with property details + uploaded **Electricity Bill** & Aadhaar KYC.\n2. **Pending Queue:** New listings are set to **PENDING** automatically.\n3. **Admin Audit:** Admin inspects documents, Google Maps coordinates, and photo integrity.\n4. **Verified Status:** Once approved, the listing gets the green **✓ Verified** badge and becomes live for tenants in search.\n5. **Rejections:** If rejected, the owner receives a specific rejection reason to correct.`,
        cards: []
      };
    }

    // 8. Owner / Listing FAQ
    if (q.includes('list') || q.includes('owner') || q.includes('add property') || q.includes('landlord')) {
      return {
        text: `🏢 **How to List Your Property as an Owner:**\n\n1. Go to the [**Owner Dashboard**](SmartStay%20OwnerDashboard%20(HTML).html).\n2. Complete your Personal, Contact, and Address sections.\n3. In **Your Properties**, click **＋ Add another property**.\n4. Upload your recent utility bill and ID in the **Documents** section.\n5. Your listing will be reviewed by Admin within 24 hours!`,
        cards: []
      };
    }

    // 9. Fraud / Fake Listing Reporting
    if (q.includes('report') || q.includes('fake') || q.includes('scam') || q.includes('fraud') || q.includes('already rented')) {
      return {
        text: `🚨 **Reporting a Fraud or Fake Listing:**\n\nSmartStay takes student safety seriously!\n• If you notice a listing that is already rented, has fake photos, or demands hidden offline charges, click the **Report Listing** button on the property card or in the Admin Reports center.\n• Our Admin team investigates reports within 4 hours and automatically suspends repeat violators.`,
        cards: []
      };
    }

    // 10. General / Default Fallback
    const randomPicks = MOCK_PROPERTIES.slice(0, 2);
    return {
      text: `I can help you search verified PGs, hostels, and rooms across Ghaziabad, Noida, Delhi, Greater Noida, and Bengaluru. Try asking:\n• *"Show PGs near ABES College under ₹9,000"*\n• *"Find Girls hostels in Ghaziabad"*\n• *"How does landlord verification work?"*`,
      cards: randomPicks
    };
  }
}

// Auto-initialize reliably across all script loading timings
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new StayBotWidget();
  });
} else {
  new StayBotWidget();
}
