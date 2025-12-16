/**
 * AI Chat Widget - ElevenLabs-style Simple Embed
 * Just add: <webchat-widget agent-id="your_id"></webchat-widget>
 * And: <script src="https://yourapi.com/widget.js" async></script>
 */

(function() {
  'use strict';

  // Widget configuration
  const WIDGET_VERSION = '1.0.0';
  
  // Get API URL from script tag or default to same origin
  const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');
  const API_URL = scriptTag ? new URL(scriptTag.src).origin : window.location.origin;

  /**
   * Custom Web Component for Chat Widget
   */
  class WebchatWidget extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      
      // State
      this.agentId = '';
      this.sessionId = '';
      this.visitorName = '';
      this.visitorPhone = '';
      this.conversationId = null;
      this.lastMessageTime = null;
      this.eventSource = null; // SSE connection
      this.isOpen = false;
      this.isMinimized = true;
      this.messages = [];
      this.displayedMessageIds = new Set(); // Track displayed messages
      
      // Color customization
      this.primaryColor = '#3B82F6'; // Default blue
      this.secondaryColor = '#EFF6FF'; // Default light blue
    }

    connectedCallback() {
      this.agentId = this.getAttribute('agent-id') || '';
      this.primaryColor = this.getAttribute('primary-color') || '#3B82F6';
      this.secondaryColor = this.getAttribute('secondary-color') || '#EFF6FF';
      
      if (!this.agentId) {
        console.error('Webchat Widget: agent-id attribute is required');
        return;
      }

      this.render();
      this.loadSession();
      this.attachEventListeners();
    }

    disconnectedCallback() {
      this.stopStreaming();
    }

    /**
     * Load session from localStorage
     * Session ID Strategy:
     * - Check localStorage for existing session (within 24 hours)
     * - If exists and valid, reuse it
     * - If expired or missing, create new session
     */
    loadSession() {
      const SESSION_LIFETIME = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      const storageKey = `webchat_session_${this.agentId}`;
      const storedData = localStorage.getItem(storageKey);
      
      let sessionValid = false;
      
      if (storedData) {
        try {
          const { sessionId, timestamp } = JSON.parse(storedData);
          const age = Date.now() - timestamp;
          
          if (age < SESSION_LIFETIME) {
            // Session still valid - reuse it
            this.sessionId = sessionId;
            sessionValid = true;
            console.log('Reusing existing session:', sessionId);
          }
        } catch (e) {
          // Invalid stored data, create new session
        }
      }
      
      if (!sessionValid) {
        // Create new session
        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        localStorage.setItem(storageKey, JSON.stringify({
          sessionId: this.sessionId,
          timestamp: Date.now()
        }));
        console.log('Created new session:', this.sessionId);
      }

      // Always show chat interface
      this.showChatInterface();
      
      // Use session_id as customer_phone for webchat (platform isolation)
      this.visitorPhone = this.sessionId;
      
      // Check if returning visitor in this session
      this.checkReturningVisitor();
    }
    
    /**
     * Check if this is a returning visitor (within same session)
     */
    async checkReturningVisitor() {
      try {
        const response = await fetch(
          `${API_URL}/api/webchat/${this.agentId}/messages?visitor_phone=${encodeURIComponent(this.sessionId)}&since=2020-01-01`
        );
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.data.messages && data.data.messages.length > 0) {
            // Returning visitor - load previous messages
            console.log('Returning visitor - loading history');
            data.data.messages.forEach(msg => {
              if (!this.displayedMessageIds.has(msg.message_id)) {
                this.addMessage(msg.message_text, msg.sender, msg.timestamp);
                this.displayedMessageIds.add(msg.message_id);
              }
            });
            
            const lastMsg = data.data.messages[data.data.messages.length - 1];
            this.lastMessageTime = lastMsg.timestamp;
            this.conversationId = data.data.conversation_id;
            
            // Start polling
            this.startPolling();
          } else {
            // New visitor - show welcome
            this.addSystemMessage('Hi! 👋 How can I help you today?');
          }
          
          // Start SSE streaming for real-time messages
          this.startStreaming();
        }
      } catch (error) {
        console.error('Failed to check returning visitor:', error);
        // Show welcome message anyway
        this.addSystemMessage('Hi! 👋 How can I help you today?');
        // Start SSE streaming
        this.startStreaming();
      }
    }

    /**
     * Save visitor info to localStorage
     */
    saveVisitorInfo(name, phone) {
      this.visitorName = name;
      this.visitorPhone = phone;
      localStorage.setItem(`webchat_visitor_${this.agentId}`, JSON.stringify({ name, phone }));
    }



    /**
     * Send message to backend
     */
    async sendMessage(text) {
      if (!text.trim()) return;



      // Clear input first
      const input = this.shadowRoot.querySelector('#message-input');
      if (input) input.value = '';

      // Add message to UI
      this.addMessage(text, 'user');

      try {
        const response = await fetch(`${API_URL}/api/webchat/${this.agentId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            session_id: this.sessionId,
            visitor_phone: this.sessionId, // Use session_id as customer_phone
            visitor_name: this.visitorName || ''
          })
        });

        if (response.ok) {
          const data = await response.json();
          this.conversationId = data.data.conversation_id;
          
          // Show typing indicator
          this.showTypingIndicator();
        } else {
          this.addSystemMessage('Failed to send message. Please try again.');
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        this.addSystemMessage('Connection error. Please check your internet.');
      }
    }

    /**
     * Start SSE streaming for real-time messages
     */
    startStreaming() {
      // Close existing connection if any
      this.stopStreaming();
      
      const streamUrl = `${API_URL}/api/webchat/${this.agentId}/stream?session_id=${encodeURIComponent(this.sessionId)}`;
      
      try {
        this.eventSource = new EventSource(streamUrl);
        
        console.log('EventSource created:', streamUrl);
        
        // Connection established
        this.eventSource.addEventListener('connected', (event) => {
          console.log('SSE connected event:', event.data);
        });
        
        // New message received (using onmessage for default event type)
        this.eventSource.onmessage = (event) => {
          console.log('SSE onmessage fired! Raw data:', event.data);
          try {
            const data = JSON.parse(event.data);
            console.log('SSE message parsed:', data);
            
            // Hide typing indicator
            this.hideTypingIndicator();
            
            // Add message if not already displayed
            if (!this.displayedMessageIds.has(data.message_id)) {
              console.log('Adding message to chat:', data.message_text);
              this.addMessage(data.message_text, 'agent', data.timestamp);
              this.displayedMessageIds.add(data.message_id);
              this.lastMessageTime = data.timestamp;
            } else {
              console.log('Message already displayed:', data.message_id);
            }
          } catch (error) {
            console.error('Failed to parse SSE message:', error, 'Raw data:', event.data);
          }
        };
        
        // Log all events for debugging
        this.eventSource.onopen = () => {
          console.log('SSE connection opened');
        };
        
        // Typing indicator (custom event type)
        this.eventSource.addEventListener('typing', (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('SSE typing event:', data);
            if (data.isTyping) {
              this.showTypingIndicator();
            } else {
              this.hideTypingIndicator();
            }
          } catch (error) {
            console.error('Failed to parse typing event:', error);
          }
        });
        
        // Connection error
        this.eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          // EventSource automatically reconnects
        };
        
        console.log('SSE streaming started');
      } catch (error) {
        console.error('Failed to start SSE streaming:', error);
      }
    }

    /**
     * Stop SSE streaming
     */
    stopStreaming() {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
        console.log('SSE streaming stopped');
      }
    }

    /**
     * Add message to chat
     */
    addMessage(text, sender, timestamp = null) {
      const messagesContainer = this.shadowRoot.querySelector('#messages');
      if (!messagesContainer) return;

      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${sender}`;
      
      // Add avatar for agent messages
      if (sender === 'agent') {
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = 'AI';
        messageDiv.appendChild(avatar);
      }
      
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      bubble.textContent = text;
      
      messageDiv.appendChild(bubble);
      
      if (timestamp) {
        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messageDiv.appendChild(time);
      }
      
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * Add system message
     */
    addSystemMessage(text) {
      const messagesContainer = this.shadowRoot.querySelector('#messages');
      if (!messagesContainer) return;

      const messageDiv = document.createElement('div');
      messageDiv.className = 'message system';
      messageDiv.textContent = text;
      
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
      const messagesContainer = this.shadowRoot.querySelector('#messages');
      if (!messagesContainer) return;

      const existing = this.shadowRoot.querySelector('.typing-indicator');
      if (existing) return;

      const indicator = document.createElement('div');
      indicator.className = 'message agent typing-indicator';
      indicator.innerHTML = `
        <div class="message-avatar">AI</div>
        <div class="message-bubble"><span></span><span></span><span></span></div>
      `;
      
      messagesContainer.appendChild(indicator);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
      const indicator = this.shadowRoot.querySelector('.typing-indicator');
      if (indicator) {
        indicator.remove();
      }
    }

    /**
     * Show welcome form
     */
    showWelcomeForm() {
      const container = this.shadowRoot.querySelector('#chat-container');
      if (!container) return;

      container.innerHTML = `
        <div id="welcome-form">
          <h3>Start a conversation</h3>
          <p>Please enter your details to begin</p>
          <input type="text" id="visitor-name" placeholder="Your name" required />
          <input type="tel" id="visitor-phone" placeholder="Phone number" required />
          <button id="start-chat">Start Chat</button>
        </div>
      `;
    }

    /**
     * Show chat interface
     */
    showChatInterface() {
      const container = this.shadowRoot.querySelector('#chat-container');
      if (!container) return;

      container.innerHTML = `
        <div id="chat-header">
          <div id="chat-header-content">
            <h3 id="chat-header-title">Chat Support</h3>
            <p id="chat-header-subtitle">We typically reply instantly</p>
          </div>
          <button id="minimize-btn">✕</button>
        </div>
        <div id="messages"></div>
        <div id="input-container">
          <input type="text" id="message-input" placeholder="Type your message..." />
          <button id="send-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
      this.shadowRoot.addEventListener('click', (e) => {
        const target = e.target;

        // Toggle widget - use closest() to handle clicks on SVG children
        if (target.id === 'chat-button' || target.closest('#chat-button')) {
          e.preventDefault();
          e.stopPropagation();
          this.toggleWidget();
          return;
        }

        // Start chat
        if (target.id === 'start-chat') {
          const nameInput = this.shadowRoot.querySelector('#visitor-name');
          const phoneInput = this.shadowRoot.querySelector('#visitor-phone');
          
          if (nameInput && phoneInput && nameInput.value && phoneInput.value) {
            this.saveVisitorInfo(nameInput.value, phoneInput.value);
            this.showChatInterface();
            this.initSession();
          }
        }

        // Send message - use closest() for button children
        if (target.id === 'send-btn' || target.closest('#send-btn')) {
          const input = this.shadowRoot.querySelector('#message-input');
          if (input && input.value) {
            this.sendMessage(input.value);
          }
        }

        // Minimize
        if (target.id === 'minimize-btn') {
          this.minimizeWidget();
        }
      });

      // Send on Enter key
      this.shadowRoot.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.id === 'message-input') {
          const input = e.target;
          if (input.value) {
            this.sendMessage(input.value);
          }
        }
      });
    }

    /**
     * Toggle widget open/closed
     */
    toggleWidget() {
      this.isMinimized = !this.isMinimized;
      const widget = this.shadowRoot.querySelector('#widget');
      if (widget) {
        widget.style.display = this.isMinimized ? 'none' : 'flex';
      }
      const button = this.shadowRoot.querySelector('#chat-button');
      if (button) {
        if (this.isMinimized) {
          button.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          `;
        } else {
          button.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          `;
        }
      }
    }

    /**
     * Minimize widget
     */
    minimizeWidget() {
      this.isMinimized = true;
      const widget = this.shadowRoot.querySelector('#widget');
      if (widget) {
        widget.style.display = 'none';
      }
      const button = this.shadowRoot.querySelector('#chat-button');
      if (button) {
        button.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        `;
      }
    }

    /**
     * Render widget HTML and CSS
     */
    render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          }

          #chat-button {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: ${this.primaryColor};
            color: white;
            border: none;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          #chat-button svg {
            pointer-events: none;
          }

          #chat-button:hover {
            transform: scale(1.1);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
          }

          #chat-button:active {
            transform: scale(0.95);
          }

          #widget {
            display: none;
            flex-direction: column;
            width: 380px;
            height: 600px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            position: absolute;
            bottom: 80px;
            right: 0;
            animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          #chat-header {
            background: ${this.primaryColor};
            color: white;
            padding: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          #chat-header-content {
            flex: 1;
          }

          #chat-header-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 4px 0;
          }

          #chat-header-subtitle {
            font-size: 12px;
            opacity: 0.9;
            margin: 0;
          }

          #minimize-btn {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 6px;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            transition: background 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          #minimize-btn:hover {
            background: rgba(255, 255, 255, 0.2);
          }

          #chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          #welcome-form {
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          #welcome-form h3 {
            margin: 0;
            font-size: 20px;
          }

          #welcome-form p {
            margin: 0;
            color: #666;
            font-size: 14px;
          }

          #welcome-form input {
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
          }

          #welcome-form button {
            padding: 12px;
            background: ${this.primaryColor};
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
          }

          #welcome-form button:hover {
            opacity: 0.9;
          }

          #messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            background: rgba(0, 0, 0, 0.02);
          }

          .message {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            max-width: 85%;
          }

          .message.user {
            align-self: flex-end;
            flex-direction: row-reverse;
          }

          .message.agent {
            align-self: flex-start;
          }

          .message.system {
            align-self: center;
            font-size: 12px;
            color: #666;
            font-style: italic;
          }

          .message-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: ${this.primaryColor};
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 600;
            flex-shrink: 0;
          }

          .message.user .message-avatar {
            display: none;
          }

          .message-bubble {
            padding: 12px 16px;
            border-radius: 16px;
            word-wrap: break-word;
            line-height: 1.5;
            font-size: 14px;
          }

          .message.user .message-bubble {
            background: ${this.primaryColor};
            color: white;
            border-top-right-radius: 4px;
          }

          .message.agent .message-bubble {
            background: #F0F0F0;
            color: #000;
            border-top-left-radius: 4px;
          }

          .message-time {
            font-size: 11px;
            color: #999;
            margin-top: 4px;
            padding: 0 8px;
          }

          .typing-indicator .message-bubble {
            display: flex;
            gap: 4px;
            padding: 10px 14px;
          }

          .typing-indicator span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #999;
            animation: typing 1.4s infinite;
          }

          .typing-indicator span:nth-child(2) {
            animation-delay: 0.2s;
          }

          .typing-indicator span:nth-child(3) {
            animation-delay: 0.4s;
          }

          @keyframes typing {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-10px); }
          }

          #input-container {
            display: flex;
            padding: 16px;
            border-top: 1px solid #eee;
            gap: 8px;
            background: white;
          }

          #message-input {
            flex: 1;
            height: 48px;
            padding: 0 16px;
            border: 2px solid ${this.primaryColor};
            border-radius: 12px;
            font-size: 14px;
            outline: none;
            transition: all 0.2s;
            background: white;
          }

          #message-input:focus {
            border-color: ${this.primaryColor};
            box-shadow: 0 0 0 3px ${this.primaryColor}33;
          }

          #message-input::placeholder {
            color: #999;
          }

          #send-btn {
            width: 48px;
            height: 48px;
            background: ${this.primaryColor};
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            flex-shrink: 0;
          }

          #send-btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
          }

          #send-btn:active {
            transform: translateY(0);
          }

          #send-btn svg {
            width: 20px;
            height: 20px;
            pointer-events: none;
          }

          @media (max-width: 480px) {
            :host {
              bottom: 0;
              right: 0;
              left: 0;
            }

            #widget {
              width: 100%;
              height: 100vh;
              border-radius: 0;
              bottom: 0;
            }

            #chat-button {
              position: fixed;
              bottom: 20px;
              right: 20px;
            }
          }
        </style>

        <button id="chat-button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
        <div id="widget">
          <div id="chat-container"></div>
        </div>
      `;
    }
  }

  // Register custom element
  if (!customElements.get('webchat-widget')) {
    customElements.define('webchat-widget', WebchatWidget);
  }

  console.log(`AI Chat Widget v${WIDGET_VERSION} loaded`);
})();
