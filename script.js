// Get chatbot elements
const chatbotToggleBtn = document.getElementById('chatbotToggleBtn');
const chatbotPanel = document.getElementById('chatbotPanel');

if (chatbotToggleBtn && chatbotPanel) {
  // Toggle chat open/closed when clicking the button
  chatbotToggleBtn.addEventListener('click', () => {
    chatbotPanel.classList.toggle('open');
  });

  // Close chat when clicking anywhere except the chat panel or button
  document.addEventListener('click', (e) => {
    // If chat is open AND user clicked outside chat area, close it
    if (chatbotPanel.classList.contains('open') && 
        !chatbotPanel.contains(e.target) && 
        !chatbotToggleBtn.contains(e.target)) {
      chatbotPanel.classList.remove('open');
    }
  });
}

// Chat UI elements (for sending messages to OpenAI)
const chatbotInput = document.getElementById('chatbotInput');
const chatbotMessages = document.getElementById('chatbotMessages');
const chatbotSendBtn = document.getElementById('chatbotSendBtn');

// Conversation history (start simple — system can be updated later)
const messages = [
  { role: 'system', content: `You are WayChat, Waymark’s friendly creative assistant.

Waymark is a video ad creation platform that helps people turn ideas, products, or messages into high-quality, ready-to-run videos. The platform is used by small businesses, agencies, and marketers to create broadcast-   ads with minimal friction.

Your job is to help users shape raw input — whether it’s a business name, a tagline, a product, a vibe, or a rough idea — into a short-form video concept.

Your responses may include suggested video structures, voiceover lines, tone and visual direction, music suggestions, and clarifying follow-up questions.

If the user's input is unclear, ask 1–2 short questions to help sharpen the direction before offering creative suggestions.

Only respond to questions related to Waymark, its tools, its platform, or the creative process of making short-form video ads. If a question is unrelated, politely explain that you're focused on helping users create video ads with Waymark.

Keep your replies concise, collaborative, and focused on helping users express their message clearly. Always align with modern marketing best practices — and stay supportive and friendly.` }
];

// Call OpenAI Chat Completions API
async function callOpenAI(messagesArray) {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: messagesArray,
          temperature: 0.8,
          max_tokens: 300
        })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status} ${text}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (err) {
    console.error('OpenAI request failed', err);
    throw err;
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAssistantHtml(content) {
  // Convert double newlines into paragraph breaks, single newlines to <br>
  const escaped = escapeHtml(content);
  const withParagraphs = escaped.replace(/\n\s*\n/g, '</p><p>');
  const withLineBreaks = withParagraphs.replace(/\n/g, '<br>');
  return `<p>${withLineBreaks}</p>`;
}

function appendMessage(content, className = '') {
  if (!chatbotMessages) return;
  const el = document.createElement('div');
  el.className = `chat-message ${className}`.trim();
  // For assistant messages, allow simple formatting (paragraphs and line breaks)
  if (className.includes('assistant')) {
    el.innerHTML = formatAssistantHtml(content);
  } else {
    el.textContent = content;
  }
  chatbotMessages.appendChild(el);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// Show an animated thinking indicator (returns the element)
function showThinking() {
  if (!chatbotMessages) return null;
  const el = document.createElement('div');
  el.className = 'chat-message assistant thinking';
  // Use raw HTML for dots animation
  el.innerHTML = '<span class="dots"><span></span><span></span><span></span></span>';
  chatbotMessages.appendChild(el);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  return el;
}

// Wire up send button and Enter-to-send for the chatbot UI
if (chatbotInput && chatbotMessages && chatbotSendBtn) {
  async function sendCurrentMessage(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const text = chatbotInput.value.trim();
    if (!text) return;

    // show user message
    appendMessage(text, 'user');
    chatbotInput.value = '';

    // add to conversation
    messages.push({ role: 'user', content: text });

  // show thinking indicator (animated)
  showThinking();

    try {
      const reply = await callOpenAI(messages);
      // remove thinking node (last .thinking)
      const thinking = chatbotMessages.querySelector('.thinking');
      if (thinking) thinking.remove();
      // show assistant reply
      appendMessage(reply, 'assistant');
      messages.push({ role: 'assistant', content: reply });
    } catch (err) {
      const thinking2 = chatbotMessages.querySelector('.thinking');
      if (thinking2) thinking2.textContent = 'Error: could not get response';
      else appendMessage('Error: could not get response', 'assistant error');
    }
  }

  // click on send button
  chatbotSendBtn.addEventListener('click', sendCurrentMessage);

  // allow Enter to send
  chatbotInput.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      sendCurrentMessage(ev);
    }
  });
}
