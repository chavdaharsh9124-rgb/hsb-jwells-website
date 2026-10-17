/**
 * HSB Jewells — Main Interactive Controller
 * Features: 
 * - Mobile Navigation Toggle
 * - 10s Looping Video Autoplay & Controls (Play/Pause, Sound Toggle)
 * - Product Quick-View Modal with Dynamic WhatsApp Inquiry
 * - Interactive Category Filter (Shop & Collections)
 * - Google Analytics 4 (GA4) Full Telemetry & Conversion Event Tracking
 */

// Safe GA4 Event Dispatcher
function trackGAEvent(eventName, params) {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params || {});
    } else if (window.dataLayer && Array.isArray(window.dataLayer)) {
      window.dataLayer.push(Object.assign({ event: eventName }, params || {}));
    }
    console.debug('[GA4 Event]', eventName, params);
  } catch (err) {
    console.debug('[GA4] Event dispatch suppressed:', err);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // ----------------------------------------------------
  // 1. Mobile Navigation Toggle
  // ----------------------------------------------------
  const toggle = document.querySelector('.nav-toggle');
  const links = document.getElementById('nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.innerHTML = open ? '&times;' : '&#9776;';
      trackGAEvent('navigation_interaction', {
        action: open ? 'open_mobile_menu' : 'close_mobile_menu'
      });
    });

    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '&#9776;';
      });
    });
  }

  // ----------------------------------------------------
  // 2. Video Controls & Autoplay Assurance for 10s Looping Videos
  // ----------------------------------------------------
  const loopVideos = document.querySelectorAll('video[autoplay]');
  loopVideos.forEach(function (video) {
    video.muted = true;
    video.loop = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(function () {
        // Autoplay policy fallback: ensure mute is active
        video.muted = true;
        video.play();
      });
    }
  });

  // Sound Toggle on Video Frames
  document.querySelectorAll('.video-sound-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const videoBox = this.closest('.hero-video-box') || this.closest('.reel-card') || this.closest('.video-container');
      if (!videoBox) return;
      const vid = videoBox.querySelector('video');
      if (!vid) return;

      vid.muted = !vid.muted;
      const videoSrc = (vid.currentSrc || vid.getAttribute('src') || 'reel').split('/').pop();

      if (vid.muted) {
        this.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
        this.setAttribute('title', 'Unmute Sound');
        trackGAEvent('video_sound_toggle', {
          action: 'mute',
          video_name: videoSrc
        });
      } else {
        this.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
        this.setAttribute('title', 'Mute Sound');
        trackGAEvent('video_sound_toggle', {
          action: 'unmute',
          video_name: videoSrc
        });
      }
    });
  });

  // Play/Pause Toggle
  document.querySelectorAll('.video-play-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const videoBox = this.closest('.hero-video-box') || this.closest('.reel-card') || this.closest('.video-container');
      if (!videoBox) return;
      const vid = videoBox.querySelector('video');
      if (!vid) return;

      const videoSrc = (vid.currentSrc || vid.getAttribute('src') || 'reel').split('/').pop();

      if (vid.paused) {
        vid.play();
        this.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
        this.setAttribute('title', 'Pause Video');
        trackGAEvent('video_playback_toggle', {
          action: 'play',
          video_name: videoSrc
        });
      } else {
        vid.pause();
        this.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        this.setAttribute('title', 'Play Video');
        trackGAEvent('video_playback_toggle', {
          action: 'pause',
          video_name: videoSrc
        });
      }
    });
  });

  // ----------------------------------------------------
  // 3. Product Quick-View Modal
  // ----------------------------------------------------
  const modalBackdrop = document.getElementById('quickViewModal');
  const modalMedia = document.getElementById('modalMedia');
  const modalTag = document.getElementById('modalTag');
  const modalTitle = document.getElementById('modalTitle');
  const modalDesc = document.getElementById('modalDesc');
  const modalSpecs = document.getElementById('modalSpecs');
  const modalPrice = document.getElementById('modalPrice');
  const modalWaLink = document.getElementById('modalWaLink');
  const modalClose = document.getElementById('modalClose');

  let currentModalItem = null;

  function openQuickView(data) {
    if (!modalBackdrop) return;
    currentModalItem = data;
    
    // Check if media is video or image
    if (data.video) {
      modalMedia.innerHTML = '<video src="' + data.video + '" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>';
    } else {
      modalMedia.innerHTML = '<img src="' + data.img + '" alt="' + (data.title || 'Jewellery') + '" style="width:100%;height:100%;object-fit:cover;">';
    }

    modalTag.textContent = data.tag || 'Fine Jewellery';
    modalTitle.textContent = data.title || '';
    modalDesc.textContent = data.desc || '';
    
    // Specs pills
    if (modalSpecs && data.specs) {
      modalSpecs.innerHTML = '';
      data.specs.split(',').forEach(function (s) {
        const span = document.createElement('span');
        span.className = 'spec-pill';
        span.textContent = s.trim();
        modalSpecs.appendChild(span);
      });
    }

    // XSS Sanitized price insertion
    modalPrice.textContent = data.price || 'Price on Request';

    if (modalWaLink) {
      const text = encodeURIComponent('Hello HSB Jewells, I am inquiring about the "' + data.title + '" (' + (data.tag || 'Jewellery') + ') from your official website.');
      modalWaLink.href = 'https://wa.me/917016458131?text=' + text;
    }

    modalBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Track GA4 view_item event
    trackGAEvent('view_item', {
      item_name: data.title,
      item_category: data.tag,
      price: data.price,
      currency: 'INR'
    });
  }

  function closeQuickView() {
    if (!modalBackdrop) return;
    modalBackdrop.classList.remove('open');
    document.body.style.overflow = '';
    const vid = modalMedia.querySelector('video');
    if (vid) vid.pause();
  }

  if (modalClose) modalClose.addEventListener('click', closeQuickView);
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', function (e) {
      if (e.target === modalBackdrop) closeQuickView();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeQuickView();
  });

  // Track WhatsApp click from Quick View Modal
  if (modalWaLink) {
    modalWaLink.addEventListener('click', function () {
      if (currentModalItem) {
        trackGAEvent('generate_lead', {
          method: 'whatsapp',
          source: 'quick_view_modal',
          item_name: currentModalItem.title,
          item_category: currentModalItem.tag,
          price: currentModalItem.price
        });
      }
    });
  }

  // Attach quick view trigger
  document.querySelectorAll('.btn-quick-view').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const card = this.closest('.product-card') || this.closest('.reel-card');
      if (!card) return;

      const data = {
        title: card.dataset.title || card.querySelector('h3')?.textContent || 'HSB Jewellery',
        tag: card.dataset.tag || card.querySelector('.product-tag')?.textContent || 'Fine Jewellery',
        desc: card.dataset.desc || card.querySelector('p')?.textContent || '',
        price: card.dataset.price || card.querySelector('.product-price')?.innerHTML || 'Price on Request',
        specs: card.dataset.specs || '92.5 Sterling Silver, Hallmarked, Handcrafted',
        img: card.dataset.img || card.querySelector('img')?.getAttribute('src'),
        video: card.dataset.video || card.querySelector('video')?.getAttribute('src')
      };

      openQuickView(data);
    });
  });

  // ----------------------------------------------------
  // 4. Interactive Category / Metal Filtering (shop.html)
  // ----------------------------------------------------
  const filterBtns = document.querySelectorAll('.filter-btn');
  const filterableItems = document.querySelectorAll('[data-category]');

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      const filterValue = this.getAttribute('data-filter');

      // Track GA4 category filter click
      trackGAEvent('select_content', {
        content_type: 'jewellery_filter',
        item_id: filterValue
      });

      filterableItems.forEach(function (item) {
        const itemCategories = (item.getAttribute('data-category') || '').split(' ');
        if (filterValue === 'all' || itemCategories.includes(filterValue)) {
          item.style.display = '';
          item.style.opacity = '0';
          setTimeout(() => { item.style.opacity = '1'; }, 50);
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  // ----------------------------------------------------
  // 5. Global WhatsApp Click Telemetry
  // ----------------------------------------------------
  document.querySelectorAll('a[href*="wa.me"]').forEach(function (link) {
    // Avoid double tracking on modal link
    if (link.id === 'modalWaLink') return;

    link.addEventListener('click', function () {
      const isFloating = this.classList.contains('floating-whatsapp');
      const isHero = Boolean(this.closest('.hero-cta'));
      const isHeader = Boolean(this.closest('.nav-wrap'));
      const isFooter = Boolean(this.closest('.footer'));

      let source = 'inline_link';
      if (isFloating) source = 'floating_button';
      else if (isHero) source = 'hero_cta';
      else if (isHeader) source = 'header_nav';
      else if (isFooter) source = 'footer';

      trackGAEvent('generate_lead', {
        method: 'whatsapp',
        source: source,
        page_path: window.location.pathname
      });
    });
  });

  // ----------------------------------------------------
  // 6. Global Phone Call Telemetry
  // ----------------------------------------------------
  document.querySelectorAll('a[href^="tel:"]').forEach(function (link) {
    link.addEventListener('click', function () {
      trackGAEvent('contact', {
        method: 'phone_call',
        phone_number: this.getAttribute('href').replace('tel:', ''),
        page_path: window.location.pathname
      });
    });
  });

  // ----------------------------------------------------
  // 7. Form Submission Telemetry
  // ----------------------------------------------------
  document.querySelectorAll('form').forEach(function (form) {
    form.addEventListener('submit', function () {
      const formType = form.closest('#custom-form') ? 'custom_design_request' : 'contact_inquiry';
      trackGAEvent('form_submission', {
        form_type: formType,
        page_path: window.location.pathname
      });
    });
  });

  // ----------------------------------------------------
  // 8. Outbound Social & Map Telemetry
  // ----------------------------------------------------
  document.querySelectorAll('a[href*="instagram.com"], a[href*="facebook.com"], a[href*="maps.google"], a[href*="goo.gl/maps"]').forEach(function (link) {
    link.addEventListener('click', function () {
      const href = this.getAttribute('href');
      let platform = 'social';
      if (href.includes('instagram')) platform = 'instagram';
      else if (href.includes('facebook')) platform = 'facebook';
      else if (href.includes('maps')) platform = 'google_maps';

      trackGAEvent('outbound_click', {
        platform: platform,
        destination: href
      });
    });
  });

  // ----------------------------------------------------
  // 9. Asset Security & Theft Prevention
  // Protects original jewellery photography and videos from unauthorized drag scraping
  // ----------------------------------------------------
  document.addEventListener('dragstart', function (e) {
    if (e.target.nodeName === 'IMG' || e.target.nodeName === 'VIDEO') {
      e.preventDefault();
    }
  }, { passive: false });
});
