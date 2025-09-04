// ページ読み込み時にトップから開始したいが、ユーザー操作のスクロールは妨げない
(function(){
  let ran = false;
  function forceScrollToTopOnce(){
    if (ran) return;
    ran = true;
    // 既にスクロールされている/ユーザーが動かした形跡があるなら何もしない
    if (window.scrollY > 0) return;
    // 初回だけ、レイアウト確定後に1回だけトップへ
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      setTimeout(() => {
        // レイアウト遅延対策で最後にもう一度だけ
        if (window.scrollY !== 0) window.scrollTo(0, 0);
      }, 60);
    });
  }
 
 // それぞれ "once" で登録して多重発火と競合を防止
  window.addEventListener('DOMContentLoaded', forceScrollToTopOnce, { once: true });
  window.addEventListener('load', forceScrollToTopOnce, { once: true });
  // bfcache 復帰時: 永続遷移でない時のみ実行
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) forceScrollToTopOnce();
  }, { once: true });
})();

// start -----------------------------------------------------------------------------------//
//
//			#navbarのアニメーション
// 
// GSAPとSplitTextのプラグインを登録
gsap.registerPlugin(SplitText, ScrollTrigger);

// navbarの背景切替（ScrollTriggerでタイミング制御）
// ヘッダー領域を過ぎたら"scrolled"を付与
(function(){
  const navbar = document.querySelector('.navbar');
  const top = document.querySelector('#top');
  if (!navbar || !top || !window.gsap || !window.ScrollTrigger) return;

  // 正の値で遅らせる / 負の値で早める（px）
  const NAVBAR_BG_SWITCH_OFFSET_PX = 0;

  // 初期背景画像（navbar要素のdata属性から取得）
  const initialBgUrl = navbar.getAttribute('data-initial-bg');
  if (initialBgUrl) {
    try {
      const absoluteUrl = new URL(initialBgUrl, document.baseURI).href;
      document.documentElement.style.setProperty('--nav-bg-image', `url("${absoluteUrl}")`);
    } catch (_) {
      document.documentElement.style.setProperty('--nav-bg-image', `url(${initialBgUrl})`);
    }
  }

  ScrollTrigger.create({
    trigger: top,
    start: 'bottom top+=' + NAVBAR_BG_SWITCH_OFFSET_PX,
    // 例: +100で遅らせる / -100で早める
    onEnter: () => {
      navbar.classList.add('scrolled');
      // スクロール後は画像を消す
      document.documentElement.style.setProperty('--nav-bg-image', 'none');
    },
    onEnterBack: () => {
      navbar.classList.remove('scrolled');
      // ヘッダー内に戻ったら初期画像に戻す
      if (initialBgUrl) {
        try {
          const absoluteUrl = new URL(initialBgUrl, document.baseURI).href;
          document.documentElement.style.setProperty('--nav-bg-image', `url("${absoluteUrl}")`);
        } catch (_) {
          document.documentElement.style.setProperty('--nav-bg-image', `url(${initialBgUrl})`);
        }
      }
    },
    onLeaveBack: () => {
      navbar.classList.remove('scrolled');
      if (initialBgUrl) {
        try {
          const absoluteUrl = new URL(initialBgUrl, document.baseURI).href;
          document.documentElement.style.setProperty('--nav-bg-image', `url("${absoluteUrl}")`);
        } catch (_) {
          document.documentElement.style.setProperty('--nav-bg-image', `url(${initialBgUrl})`);
        }
      }
    }
  });
})();

(function(){
  const navbar = document.querySelector('.navbar');
  if(!navbar) return;
  function applyOffset(){
    const h = navbar.offsetHeight;
    document.documentElement.style.setProperty('--navbar-height', h + 'px');
  }
  // 初期表示直後にも反映
  applyOffset();
  window.addEventListener('load', applyOffset);
  window.addEventListener('resize', applyOffset);
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(applyOffset);
    ro.observe(navbar);
  }
})();

// 共通のSplitText処理を関数化
function splitAndAnimate(selector, staggerDelay) {
  const split = new SplitText(selector, { type: "words,chars,lines" });
  const chars = split.chars;
  gsap.set(chars, { autoAlpha: 0, scale: 0, y: 30, rotationX: 10 });
  return gsap.to(chars, {
    autoAlpha: 1,
    scale: 1,
    y: 0,
    rotationX: 0,
    stagger: staggerDelay,
    transformOrigin: "0% 50%",
    ease: "power2.out",
  });
}

/* ===== Primary nav toggle ('.nav-toggle' ⇄ '#primary-nav') ===== */
(function () {
  const btn  = document.querySelector('.nav-toggle');
  const list = document.getElementById('primary-nav');
  if (!btn || !list) return;

  // type属性を明示的にbuttonにする（HTML側でtype="button"がベスト）
  if (btn.tagName === 'BUTTON' && btn.type !== 'button') {
    btn.type = 'button';
  }

  const OPEN_ATTR = 'data-open';
  const DESKTOP_BREAKPOINT = 960;

  // 初期状態でメニューを閉じる（モバイルで開きっぱなし防止）
  function setInitialState() {
    if (window.innerWidth > DESKTOP_BREAKPOINT) {
      // デスクトップではCSSで常時表示。属性は付けない
      list.removeAttribute(OPEN_ATTR);
      btn.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('nav-open');
    } else {
      // モバイルでは初期状態で非表示
      list.removeAttribute(OPEN_ATTR);
      btn.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('nav-open');
    }
  }
  setInitialState();

  const isOpen = () => list.hasAttribute(OPEN_ATTR);
  const open = () => {
    list.setAttribute(OPEN_ATTR, '');
    btn.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('nav-open');
  };
  const close = () => {
    list.removeAttribute(OPEN_ATTR);
    btn.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('nav-open');
  };
  const toggle = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    isOpen() ? close() : open();
  };

  // ボタンで開閉（click/keydown: Enter/Space）
  btn.addEventListener('click', (e) => {
    // toggleのみ実行（close()を即時呼ばない）
    toggle(e);
  });
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      toggle(e);
    }
  });

  // メニュー内リンクで閉じる（#アンカー遷移も考慮）
  list.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    if (window.innerWidth <= DESKTOP_BREAKPOINT) {
      close();
    }
    // デフォルトのリンク遷移はそのまま
  });

  // 外側クリックで閉じる
  document.addEventListener('click', (e) => {
    if (isOpen() && !list.contains(e.target) && !btn.contains(e.target)) close();
  });

  // ESCで閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  // デスクトップ幅に戻ったら閉じる
  window.addEventListener('resize', () => {
    setInitialState();
  });
})();

// start -----------------------------------------------------------------------------------//
//
//			.messageのアニメーション
//

const messageAnimation = gsap.timeline({
	scrollTrigger: {
		trigger: ".message",
		start: 'top 60%',
	},
});
  
messageAnimation
.from(".message .bg-image", { autoAlpha: 0, duration: 1.0 })
.from(".message .bg-color", { autoAlpha: 0, yPercent: 100, transformOrigin: "center bottom" }, "<=1")
.from(".message .back p", { autoAlpha: 0, y: -100 }, "<=0.1")
.from(".message .container .mark-wrapper ul li", { autoAlpha: 0, y: 100, stagger: 0.2 }, "<")
.add(splitAndAnimate(".message .container .text h2", 0.04), "<")
.add(splitAndAnimate(".message .container .text .sentence", 0.01), "<=0.15")






// start -----------------------------------------------------------------------------------//
//
//			.storiesのアニメーション
//
const storiesAnimation= gsap.timeline({
	scrollTrigger: {
		trigger: ".stories",
		start:'top 45%',
	},
});

storiesAnimation
.from(".stories .bg", { autoAlpha: 0, filter: "blur(30px)", x:100, y:100, duration:1.75})
.from(".stories .title h3",{ autoAlpha: 0, y:-50 },"<=0.5")
.from(".stories .title h2",{ autoAlpha: 0, y:50 },"<=0.1")
.from(".stories .splide",{ autoAlpha: 0, y:100, duration:1.5 },"<=1")



// start -----------------------------------------------------------------------------------//
//
//			.charmのアニメーション
//
const charmTitleAnimation = gsap.timeline({
	defaults: {
		autoAlpha: 0,
		filter: "blur(30px)",
		x: -100,
		y: 100,
		duration: 0.75,
	},
	scrollTrigger: {
		trigger: ".charm",
		start: 'top 45%',
	},
});
  
charmTitleAnimation
.from(".charm .container .title .text h3", { duration: 1.0 })
.from(".charm .container .title .text h2", {}, "<=0.25")
.from(".charm .container .title .thumb", { x: 100 }, "<=0.5")



// .charm .container .box-wrapper .box 要素を配列として取得
const charmBoxes = gsap.utils.toArray(".charm .container .box-wrapper .box");

// 各ボックスに対してアニメーションを設定
charmBoxes.forEach((target) => {
  // 子要素の取得
  const thumb = target.querySelector(".top .thumb");
  const textElements = target.querySelectorAll(".top .text .en, .top .text h3");
  const textLi = target.querySelectorAll(".top .text ul li");
  const geometory = target.querySelector(".top .text .geometory");
  const sentence = target.querySelector(".bottom .sentence");

  // タイムラインの作成とデフォルト設定
  const charmBoxAnimation = gsap.timeline({
    defaults: {
      autoAlpha: 0,
      filter: "blur(30px)",
      x: -100,
      y: 100,
      duration: 0.75,
    },
    scrollTrigger: {
      trigger: target,
      start: 'top 45%',
    },
  });

  // アニメーションの定義
  charmBoxAnimation
    .from(thumb, { duration: 1.0 })
    .from(textElements, {}, "<=0.25")
    .from(textLi, { x: 100, stagger: 0.1 }, "-=0.5")
    .from(geometory, { x: 100 }, "<")
    .from(sentence, { x: 100 }, "<");
});


// start -----------------------------------------------------------------------------------//
//
//			.flowのアニメーション
//

// .flowセクションのタイトルアニメーション
const flowTitleAnimation = gsap.timeline({
	defaults: {
		autoAlpha: 0,
		filter: "blur(30px)",
		scale: 2,
		duration: 1.15,
	},
	scrollTrigger: {
		trigger: ".flow .title",
		start: 'top 55%',
	},
});
  
flowTitleAnimation
.from('.flow .container .title h3', {})
.from('.flow .container .title h2', {}, "<");

// .flowセクションのボックスアニメーション
gsap.from(".flow .container .box-wrapper .box", {
	autoAlpha: 0,
	y: 100,
	filter: "blur(30px)",
	stagger: 0.3,
	duration: 0.75,
	scrollTrigger: {
		trigger: ".flow .container .box-wrapper",
		start: 'top 60%',
	},
});


// start -----------------------------------------------------------------------------------//
//
//			.footerのアニメーション
//

// 要素の取得
const footer = document.querySelector('.footer');
const footerLogoPlane = footer.querySelector('.logo .plane');
const footerLogoWhite = footer.querySelector('.logo .white');
const footerLinks = footer.querySelectorAll('.container .top nav ul li a, .container .privacy p a, .container .copyright small');

// 初期設定
gsap.set(footer, {
  backgroundImage: "linear-gradient(90deg, rgba(210,210,210,1) 0%, rgba(255,255,255,1) 100%)"
});
gsap.set(footerLinks, { color: "#111" });
gsap.set(footerLogoWhite, { autoAlpha: 0 });

// アニメーションの定義
const footerAnimation = gsap.timeline({
  scrollTrigger: {
    trigger: footer,
    start: 'top 45%',
  },
});




