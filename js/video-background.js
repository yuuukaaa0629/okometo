/**
 * 背景メディア制御スクリプト（Contactセクション用）
 * - <video> と <iframe> (Vimeo) の両対応
 * - 失敗時は確実に静止画へフォールバック
 * - 動きやデータ節約設定を尊重
 */

class VideoBackground {
  constructor() {
    this.section = null;         // .contact
    this.container = null;       // .contact .video-background
    this.mediaEl = null;         // <video> または <iframe>
    this.injectedImg = null;     // JSで注入したフォールバック画像
    this.observer = null;        // IntersectionObserver（videoのみ）

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    this.section   = document.querySelector('.contact');
    this.container = document.querySelector('.contact .video-background');
    this.mediaEl   = document.querySelector('.contact .video-background video, .contact .video-background iframe');

    if (!this.section || !this.container || !this.mediaEl) {
      console.warn('[VideoBackground] 必要な要素が見つかりません (.contact / .video-background / video|iframe)');
      return;
    }

    // アクセシビリティ（動きを抑制/省データ）
    if (this.prefersReducedMotion() || this.prefersReducedData()) {
      this.useImageFallback();
      return;
    }

    if (this.mediaEl.tagName === 'VIDEO') {
      this.setupVideoAttributes();
      this.wireVideoEvents();
      this.setupIntersectionObserver();
    } else if (this.mediaEl.tagName === 'IFRAME') {
      // Vimeo は iframe の load で表示OKにする
      this.mediaEl.addEventListener('load', () => this.markReady(), { once: true });
      // 追加の postMessage 制御までは行わず、背景として表示のみに徹する
    }
  }

  prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  prefersReducedData() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-data: reduce)').matches;
  }

  setupVideoAttributes() {
    const video = this.mediaEl;
    // 自動再生に必要な属性
    video.muted = true;
    video.loop = true;
    video.playsInline = true; // iOS Safari
    video.preload = 'none';

    // 画面幅に応じて poster を差し替え
    try {
      const isMobile = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
      video.poster = isMobile ? './images/contact-fallback-mobile.webp' : './images/contact-fallback.webp';
    } catch (_) {}
  }

  wireVideoEvents() {
    const video = this.mediaEl;

    video.addEventListener('error', (e) => {
      console.error('[VideoBackground] 動画読み込みエラー:', e);
      this.useImageFallback();
    });

    video.addEventListener('stalled', () => {
      setTimeout(() => {
        if (video.networkState === HTMLMediaElement.NETWORK_LOADING) {
          console.warn('[VideoBackground] 読み込み停滞、フォールバックに切替');
          this.useImageFallback();
        }
      }, 3000);
    });
  }

  setupIntersectionObserver() {
    // 画面に見えている時だけ再生（videoのみ）
    const video = this.mediaEl;
    const options = { threshold: 0.1, rootMargin: '200px 0px' };
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!video) return;
        if (entry.isIntersecting) {
          video.preload = 'auto';
          this.tryPlay();
        } else {
          video.pause();
        }
      });
    }, options);

    if (this.section) this.observer.observe(this.section);
  }

  async tryPlay() {
    const video = this.mediaEl;
    try {
      const playPromise = video.play?.();
      if (playPromise && typeof playPromise.then === 'function') {
        await playPromise;
      }
      this.markReady();
      // this.monitorPerformance(); // 必要になったら有効化
    } catch (err) {
      console.warn('[VideoBackground] 自動再生に失敗:', err && err.name ? err.name : err);
      this.useImageFallback();
    }
  }

  markReady() {
    this.container.classList.add('has-video');
  }

  useImageFallback() {
    // CSS初期状態は画像表示/メディア非表示。ここでは念のための処理のみ。
    this.container.classList.remove('has-video');

    // 直下に <img> が無い場合のみ、動画ポスター等から注入を試みる
    const directImg = this.container.querySelector(':scope > img');
    if (!directImg) {
      let src = null;
      if (this.mediaEl && this.mediaEl.tagName === 'VIDEO') {
        // <video> 内の <img> を探す（あれば）
        const nestedImg = this.container.querySelector('video img');
        src = nestedImg?.getAttribute('src') || nestedImg?.getAttribute('data-src');
      }
      if (src) {
        const img = new Image();
        img.src = src;
        img.alt = 'background fallback';
        this.container.appendChild(img);
        this.injectedImg = img;
      }
    }

    // 念のため video は停止
    if (this.mediaEl && this.mediaEl.tagName === 'VIDEO') {
      try { this.mediaEl.pause(); } catch {}
    }
  }

  monitorPerformance() {
    const video = this.mediaEl;
    if (!video || video.tagName !== 'VIDEO') return;

    let lastTime = performance.now();
    let frames = 0;
    let lowCount = 0;

    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        const fps = frames;
        frames = 0;
        lastTime = now;

        if (fps < 20) lowCount++; else lowCount = 0;
        if (lowCount >= 2) {
          console.warn('[VideoBackground] 低FPSが継続。画像に切替ます。');
          this.useImageFallback();
          return;
        }
      }
      if (this.container.classList.contains('has-video') && !video.paused) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  // 手動トグル（デバッグ用）
  toggleVideo() {
    const video = this.mediaEl;
    if (!video || video.tagName !== 'VIDEO') return;
    if (video.paused) {
      this.tryPlay();
    } else {
      video.pause();
      this.container.classList.remove('has-video');
    }
  }

  destroy() {
    try { if (this.observer) this.observer.disconnect(); } catch {}
    try {
      if (this.mediaEl && this.mediaEl.tagName === 'VIDEO') {
        this.mediaEl.pause();
      }
    } catch {}
    if (this.injectedImg?.parentNode === this.container) {
      this.container.removeChild(this.injectedImg);
    }
  }
}

// ==== 初期化 / クリーンアップ ====
let videoBackground = null;

window.addEventListener('load', () => {
  videoBackground = new VideoBackground();
});

window.addEventListener('beforeunload', () => {
  if (videoBackground) videoBackground.destroy();
});

window.VideoBackground = VideoBackground;