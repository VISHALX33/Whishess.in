/**
 * Whishess AI Assistant — component-style vanilla JS widget
 * Depends on: faqData.js (window.WHISHESS_FAQ_DATA)
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'whishess_ai_open';
  var data = window.WHISHESS_FAQ_DATA;
  if (!data) return;

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ROBOT_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="5" y="8" width="14" height="11" rx="2"/>' +
    '<circle cx="9.5" cy="13" r="1.2" fill="currentColor" stroke="none"/>' +
    '<circle cx="14.5" cy="13" r="1.2" fill="currentColor" stroke="none"/>' +
    '<path d="M9.5 16.2h5"/>' +
    '<path d="M12 8V5"/><circle cx="12" cy="4" r="1.2"/>' +
    '<path d="M5 11H3"/><path d="M21 11h-2"/>' +
    '</svg>';

  var CLOSE_SVG =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
    '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>' +
    '</svg>';

  /* ---------- ChatMessage ---------- */
  function ChatMessage(role, text) {
    this.role = role;
    this.text = text;
  }

  ChatMessage.prototype.render = function () {
    var wrap = document.createElement('div');
    wrap.className = 'wf-ai-msg wf-ai-msg--' + this.role;
    wrap.setAttribute('role', 'article');
    var bubble = document.createElement('div');
    bubble.className = 'wf-ai-msg-bubble';
    bubble.textContent = this.text;
    wrap.appendChild(bubble);
    return wrap;
  };

  /* ---------- TypingIndicator ---------- */
  function TypingIndicator() {
    this.el = document.createElement('div');
    this.el.className = 'wf-ai-typing';
    this.el.setAttribute('aria-label', 'Assistant is typing');
    this.el.setAttribute('role', 'status');
    for (var i = 0; i < 3; i++) {
      this.el.appendChild(document.createElement('span'));
    }
  }

  TypingIndicator.prototype.mount = function (parent) {
    parent.appendChild(this.el);
    this.scroll(parent);
  };

  TypingIndicator.prototype.unmount = function () {
    if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
  };

  TypingIndicator.prototype.scroll = function (parent) {
    var body = parent.closest ? parent.closest('.wf-ai-widget-body') : null;
    if (body) body.scrollTop = body.scrollHeight;
  };

  /* ---------- FAQList ---------- */
  function FAQList(items, onSelect) {
    this.items = items;
    this.onSelect = onSelect;
    this.el = document.createElement('div');
    this.el.className = 'wf-ai-faq';
    this.el.setAttribute('role', 'list');
    var label = document.createElement('p');
    label.className = 'wf-ai-faq-label';
    label.textContent = 'Quick questions';
    this.el.appendChild(label);
    var self = this;
    items.forEach(function (item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wf-ai-faq-btn';
      btn.setAttribute('role', 'listitem');
      btn.textContent = item.question;
      btn.addEventListener('click', function () {
        self.onSelect(item);
      });
      self.el.appendChild(btn);
    });
  }

  FAQList.prototype.render = function () {
    return this.el;
  };

  /* ---------- AIButton ---------- */
  function AIButton(onToggle) {
    this.onToggle = onToggle;
    this.el = document.createElement('button');
    this.el.type = 'button';
    this.el.className = 'wf-ai-btn';
    this.el.setAttribute('aria-label', 'Open Whishess AI Assistant');
    this.el.setAttribute('aria-expanded', 'false');
    this.el.setAttribute('aria-controls', 'wf-ai-widget');
    this.el.innerHTML = ROBOT_SVG;
    var self = this;
    this.el.addEventListener('click', function () {
      self.onToggle();
    });
  }

  AIButton.prototype.setOpen = function (open) {
    this.el.classList.toggle('is-open', open);
    this.el.setAttribute('aria-expanded', open ? 'true' : 'false');
    this.el.setAttribute('aria-label', open ? 'Close Whishess AI Assistant' : 'Open Whishess AI Assistant');
  };

  /* ---------- AIChatWidget ---------- */
  function AIChatWidget(faqData, button) {
    this.faqData = faqData;
    this.button = button;
    this.isOpen = false;
    this.busy = false;
    this.typing = new TypingIndicator();

    this.el = document.createElement('div');
    this.el.id = 'wf-ai-widget';
    this.el.className = 'wf-ai-widget';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-labelledby', 'wf-ai-widget-title');
    this.el.setAttribute('aria-hidden', 'true');

    this.el.innerHTML =
      '<header class="wf-ai-widget-header">' +
        '<div class="wf-ai-widget-avatar">' + ROBOT_SVG + '</div>' +
        '<div class="wf-ai-widget-meta">' +
          '<div class="wf-ai-widget-title" id="wf-ai-widget-title">Whishess AI Assistant</div>' +
          '<div class="wf-ai-widget-status">Online</div>' +
        '</div>' +
        '<button type="button" class="wf-ai-widget-close" aria-label="Close chat">' + CLOSE_SVG + '</button>' +
      '</header>';

    this.body = document.createElement('div');
    this.body.className = 'wf-ai-widget-body';
    this.el.appendChild(this.body);

    this.messagesWrap = document.createElement('div');
    this.messagesWrap.className = 'wf-ai-messages';
    this.messagesWrap.setAttribute('role', 'log');
    this.messagesWrap.setAttribute('aria-live', 'polite');
    this.messagesWrap.setAttribute('aria-relevant', 'additions');
    this.body.appendChild(this.messagesWrap);

    var welcome = new ChatMessage('assistant', faqData.welcome);
    this.messagesWrap.appendChild(welcome.render());

    var self = this;
    this.faqList = new FAQList(faqData.items, function (item) {
      self.handleFAQ(item);
    });
    this.body.appendChild(this.faqList.render());

    this.closeBtn = this.el.querySelector('.wf-ai-widget-close');
    this.closeBtn.addEventListener('click', function () {
      self.close();
    });
  }

  AIChatWidget.prototype.handleFAQ = function (item) {
    if (this.busy) return;
    this.busy = true;
    var self = this;

    var userMsg = new ChatMessage('user', item.question);
    this.messagesWrap.appendChild(userMsg.render());
    this.scroll();

    this.typing.mount(this.messagesWrap);

    var delay = reduceMotion
      ? 100
      : self.faqData.typingDelayMs.min +
        Math.random() * (self.faqData.typingDelayMs.max - self.faqData.typingDelayMs.min);

    window.setTimeout(function () {
      self.typing.unmount();
      var reply = new ChatMessage('assistant', item.answer);
      self.messagesWrap.appendChild(reply.render());
      self.scroll();
      self.busy = false;
    }, delay);
  };

  AIChatWidget.prototype.scroll = function () {
    this.body.scrollTop = this.body.scrollHeight;
  };

  AIChatWidget.prototype.open = function () {
    if (this.isOpen) return;
    this.isOpen = true;
    this.el.classList.add('is-open');
    this.el.setAttribute('aria-hidden', 'false');
    this.button.setOpen(true);
    this.syncBackToTop(true);
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
    var self = this;
    window.setTimeout(function () {
      self.closeBtn.focus();
    }, reduceMotion ? 0 : 280);
  };

  AIChatWidget.prototype.close = function () {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.remove('is-open');
    this.el.setAttribute('aria-hidden', 'true');
    this.button.setOpen(false);
    this.syncBackToTop(false);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    this.button.el.focus();
  };

  AIChatWidget.prototype.toggle = function () {
    if (this.isOpen) this.close();
    else this.open();
  };

  AIChatWidget.prototype.syncBackToTop = function (widgetOpen) {
    var btt = document.querySelector('.wf-back-to-top');
    if (btt) btt.classList.toggle('is-above-widget', widgetOpen);
  };

  AIChatWidget.prototype.restoreSession = function () {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') this.open();
    } catch (e) {}
  };

  /* ---------- Init ---------- */
  function init() {
    document.querySelectorAll('.wf-whatsapp-float').forEach(function (el) {
      el.remove();
    });

    if (document.querySelector('.wf-ai-btn')) return;

    var widget;
    var button = new AIButton(function () {
      widget.toggle();
    });

    widget = new AIChatWidget(data, button);

    document.body.appendChild(widget.el);
    document.body.appendChild(button.el);

    document.dispatchEvent(new CustomEvent('whishess:ai-ready'));

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && widget.isOpen) {
        e.preventDefault();
        widget.close();
      }
    });

    widget.restoreSession();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
