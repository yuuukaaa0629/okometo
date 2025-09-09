/**
 * 背景動画制御スクリプト（Contactセクション用）
 * - CSS/HTML（.video-background, .has-video）に合わせて実装
 * - 失敗時は確実に静止画へフォールバック
 * - 画面内のときだけ再生（IntersectionObserver）
 */

class VideoBackground {
  constructor() {
    this.section = null;         // .contact
    this.container = null;       // .contact .video-background
    this.video = null;           // video要素
    this.injectedImg = null;     // JSで注入したフォールバック画像（なければ null）
    this.observer = null;

    // 初期化
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    this.section   = document.querySelector('.contact');
    this.container = document.querySelector('.contact .video-background');
    this.video     = document.querySelector('.contact .video-background video');

    if (!this.section || !this.container || !this.video) {
      console.warn('[VideoBackground] 必要な要素が見つかりません (.contact / .video-background / video)');
      return;
    }

    // アクセシビリティ（動きを抑制している場合は静止画運用）
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.useImageFallback();
      return;
    }
    // 省データモードのユーザーは画像にフォールバック
    if (window.matchMedia && window.matchMedia('(prefers-reduced-data: reduce)').matches) {
      this.useImageFallback();
      return;
    }
    
    // 画面幅に応じて poster を差し替え（<video> はレスポンシブ poster を持てないため JS で対応）
    try {
      const isMobile = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
      if (isMobile) {
        this.video.poster = './images/contact-fallback-mobile.webp';
      } else {
        this.video.poster = './images/contact-fallback.webp';
      }
    } catch (_) {}
    this.setupVideoAttributes();
    this.wireVideoEvents();
    this.setupIntersectionObserver();
  }

  setupVideoAttributes() {
    // 自動再生に必要な属性
    this.video.muted = true;
    this.video.loop = true;
    this.video.playsInline = true; // iOS Safari
    // 初期は軽量に
    this.video.preload = 'none';
  }

  wireVideoEvents() {
    // エラーハンドリング（読み込み失敗・停滞）

    this.video.addEventListener('error', (e) => {
      console.error('[VideoBackground] 動画読み込みエラー:', e);
      this.useImageFallback();
    });

    this.video.addEventListener('stalled', () => {
      // ネットワーク停滞が続くならフォールバック
      setTimeout(() => {
        if (this.video.networkState === HTMLMediaElement.NETWORK_LOADING) {
          console.warn('[VideoBackground] 読み込み停滞、フォールバックに切替');
          this.useImageFallback();
        }
      }, 3000);
    });
  }

  setupIntersectionObserver() {
    // 画面に見えている時だけ再生
    const options = { threshold: 0.1, rootMargin: '200px 0px' };
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!this.video) return;
        if (entry.isIntersecting) {
          // 見えたら本読み込み + 再生
          this.video.preload = 'auto';
          this.tryPlay(false);
        } else {
          this.video.pause();
        }
      });
    }, options);

    this.observer.observe(this.section);
  }

  async tryPlay(fromCanPlay) {
    try {
      // 再生を試みる
      const playPromise = this.video.play();
      if (playPromise && typeof playPromise.then === 'function') {
        await playPromise;
      }
      // 再生できていれば動画を表示
      this.container.classList.add('has-video');
      // this.monitorPerformance(); // 必要になったら有効化
    } catch (err) {
      console.warn('[VideoBackground] 自動再生に失敗:', err && err.name ? err.name : err);
      this.useImageFallback();
    }
  }

  useImageFallback() {
    // CSSの初期状態は「画像が見えて動画が非表示」。
    // ただし HTML の構造が <video> 内のフォールバック<img> だけだと表示されないため、
    // 必要に応じて <img> を .video-background 直下に注入する。
    this.container.classList.remove('has-video');

    // すでに直下に <img> があるか確認
    const directImg = this.container.querySelector(':scope > img');
    if (directImg) {
      // そのままCSSに任せる
    } else {
      // <video> 内のフォールバック <img> から src を拾って注入
      const nestedImg = this.container.querySelector('video img');
      const src = nestedImg?.getAttribute('src') || nestedImg?.getAttribute('data-src');

      if (src) {
        const img = new Image();
        img.src = src;
        img.alt = nestedImg?.getAttribute('alt') || 'background fallback';
        // CSS側（.video-background img, video）でレイアウト制御するためクラスは不要
        this.container.appendChild(img);
        this.injectedImg = img;
      } else {
        // フォールバック画像の指定が無い場合は、何も注入できないのでログを出す
        console.warn('[VideoBackground] フォールバック画像が見つかりませんでした。');
      }
    }

    // 念のため動画は停止
    if (this.video) {
      this.video.pause();
    }
  }

  monitorPerformance() {
    // 簡易FPSチェック。20fpsを継続的に下回ると静止画に切替
    let lastTime = performance.now();
    let frames = 0;
    let lowCount = 0; // 連続で低FPSになった回数

    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        const fps = frames;
        frames = 0;
        lastTime = now;

        if (fps < 20) {
          lowCount++;
        } else {
          lowCount = 0;
        }

        if (lowCount >= 2) { // 約2秒連続で低FPS
          console.warn('[VideoBackground] 低FPSが継続。画像に切替ます。');
          this.useImageFallback();
          return;
        }
      }
      // すでにフォールバックしていなければ継続
      if (this.container.classList.contains('has-video') && !this.video.paused) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }

  // 手動トグル（デバッグ用）
  toggleVideo() {
    if (!this.video) return;
    if (this.video.paused) {
      this.tryPlay(false);
    } else {
      this.video.pause();
      this.container.classList.remove('has-video');
    }
  }

  destroy() {
    try {
      if (this.observer) this.observer.disconnect();
    } catch {}
    try {
      if (this.video) {
        this.video.pause();
        // ソースの解放（必要に応じて）
        // this.video.src = '';
        // this.video.load();
      }
    } catch {}
    // 注入した画像は削除（任意）
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

// グローバルへ公開（デバッグ用）
window.VideoBackground = VideoBackground;