/**
 * HSB Jewells — Main Interactive Controller
 * Features: Mobile Nav, Video Sound/Loop Controls, Quick-View Modal, Filter Tabs, WhatsApp Concierge
 */

document.addEventListener('DOMContentLoaded', function () {
  // 1. Mobile Navigation Toggle
  const toggle = document.querySelector('.nav-toggle');
  const links = document.getElementById('nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.innerHTML = open ? '&times;' : '&#9776;';
    });

    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '&#9776;';
      });
    });
  }

  // 2. Video Controls & Autoplay Assurance for 10s Looping Videos
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
      if (vid.muted) {
        this.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
        this.setAttribute('title', 'Unmute Sound');
      } else {
        this.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
        this.setAttribute('title', 'Mute Sound');
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

      if (vid.paused) {
        vid.play();
        this.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
        this.setAttribute('title', 'Pause Video');
      } else {
        vid.pause();
        this.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        this.setAttribute('title', 'Play Video');
      }
    });
  });

  // 3. Product Quick-View Modal
  const modalBackdrop = document.getElementById('quickViewModal');
  const modalMedia = document.getElementById('modalMedia');
  const modalTag = document.getElementById('modalTag');
  const modalTitle = document.getElementById('modalTitle');
  const modalDesc = document.getElementById('modalDesc');
  const modalSpecs = document.getElementById('modalSpecs');
  const modalPrice = document.getElementById('modalPrice');
  const modalWaLink = document.getElementById('modalWaLink');
  const modalClose = document.getElementById('modalClose');

  function openQuickView(data) {
    if (!modalBackdrop) return;
    
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

    modalPrice.innerHTML = data.price || 'Price on Request';

    if (modalWaLink) {
      const text = encodeURIComponent('Hello HSB Jewells, I am inquiring about the "' + data.title + '" from your official website.');
      modalWaLink.href = 'https://wa.me/917016458131?text=' + text;
    }

    modalBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
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

  // 4. Interactive Category / Metal Filtering (for shop.html & products)
  const filterBtns = document.querySelectorAll('.filter-btn');
  const filterableItems = document.querySelectorAll('[data-category]');

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      const filterValue = this.getAttribute('data-filter');

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
});
