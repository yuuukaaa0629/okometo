gsap.registerPlugin(SplitText);

// スプリットテキスト設定
const splitText = new SplitText(".loading .main", { type: "chars" });
const taglineSplit = new SplitText(".loading .tagline", { type: "chars, words" });

const loading = document.querySelector(".loading");
const loadingBg = document.querySelector(".loading .bg");

const headerH2 = new SplitText(".top .first-view .text h2 .catch", { type: "words,chars,lines" });
const headerH1 = new SplitText(".top .first-view .text h1 .catch", { type: "words,chars,lines" });

gsap.set(loading, { autoAlpha: 1 });
gsap.set([".loading .main", ".loading .tagline"], { autoAlpha: 0 });
gsap.set([headerH2.words, headerH1.chars], { autoAlpha: 0, y: 100, rotationX: 5 });
gsap.set(".top .first-view .text ul li", { autoAlpha: 0, y: 100 });
// ナビバー初期状態（ロゴとメニューを非表示）
//gsap.set([".navbar .logo", ".navbar nav ul li"], { autoAlpha: 0 });

// ローディングアニメーション
function loadingAnimation() {
	const tl = gsap.timeline();

	tl.to([".loading .main", ".loading .tagline"], { autoAlpha: 1, duration: 0.01 })
	.from(splitText.chars, { opacity: 0, stagger: 0.125, ease: "power1.in", duration: 0.3 })
    .from(taglineSplit.chars, { opacity: 0, yPercent: 0, stagger: 0.075, ease: "power1.in", duration: 0.3 }, "-=0.15")
    .to(splitText.chars, { opacity: 0, stagger: 0.125, ease: "power3.inOut", duration: 0.15 }, "+=1")
    .to(taglineSplit.chars, { opacity: 0, stagger: 0.06, ease: "power3.inOut", duration: 0.25 }, "<")
    .to(loadingBg, { autoAlpha: 0, yPercent: -100, ease: "power3.inOut", duration: 0.7 }, "-=0.25")
    .to(loading, { autoAlpha: 0, ease: "power3.inOut", duration: 0.1, 
		onComplete: () => {
			loading.style.display = "none";
		},
    })

  return tl;
}

// ナビバーアニメーション
function navbarAnimation() {
  const tl = gsap.timeline();

  tl.from(".navbar .logo", { autoAlpha: 0, x: -100, filter: "blur(30px)" })
    .from(".navbar nav ul li", { autoAlpha: 0, y: 60, stagger: 0.1 }, "<");

  return tl;
}

// ヘッダーアニメーション
function headerAnimation() {
  const tl = gsap.timeline();
  const isMobile = window.innerWidth <= 767;
  
  if (isMobile) {
      tl.from(".top .first-view .splide", { autoAlpha: 0, y: 200,stagger:0.2,duration:0.6,ease:"back.out(1.4)"})
      .to(".top .first-view .text", { autoAlpha: 1, y: 0, rotationX: 0, stagger: 0.05}, "-=0.3")
      .to(headerH2.words, { autoAlpha: 1, y: 0, rotationX: 0, stagger: 0.05,ease: "power2.out" }, "-=0.2")
      .to(headerH1.chars, { autoAlpha: 1, y: 0, rotationX: 0, stagger: 0.025,ease: "power2.out" },"-=0.1")
      .to(".top .first-view .text ul li", { autoAlpha: 1, y: 0, stagger: 0.06 }, "-=0.2")
      .from(".top .first-view .text .sentence", { autoAlpha: 0, y: 100 }, "-=0.2");
      
  }else{
    tl.to(headerH2.words, { autoAlpha: 1, y: 0, rotationX: 0, stagger: 0.05, ease: "power2.out" })
      .to(headerH1.chars, { autoAlpha: 1, y: 0, rotationX: 0, stagger: 0.025, ease: "power2.out" }, "-=0.1")
      .to(".top .first-view .text ul li", { autoAlpha: 1, y: 0, stagger: 0.06 }, "-=0.2")
      .from(".top .first-view .text .sentence", { autoAlpha: 0, y: 100 }, "-=0.2")
      .from(".top .first-view .splide", { autoAlpha: 0, y: 200, x: 200 }, "<");
  }

  return tl;
}

// 開始処理
function openingEffect() {
  const masterTimeline = gsap.timeline();

  // loading → navbar → header の順で実行
  masterTimeline
    .add(loadingAnimation())
    .add(navbarAnimation())
    .add(headerAnimation());
}

// 実行
openingEffect();

document.addEventListener('DOMContentLoaded', () => {
    const loading = document.querySelector('.loading');
    const mainText = loading.querySelector('.main');
    const tagline = loading.querySelector('.tagline');
    const loadingGif = loading.querySelector('.loading-gif');

    // 初期状態の設定
    gsap.set([mainText, tagline, loadingGif], { opacity: 0 });

    // アニメーションの作成
    const loadingAnimation = gsap.timeline({
        onComplete: () => {
            // アニメーション完了後の処理
            setTimeout(() => {
                gsap.to(loading, {
                    opacity: 0,
                    duration: 1,
                    ease: 'power2.inOut',
                    onComplete: () => {
                        loading.style.display = 'none';
                    }
                });
            }, 1000);
        }
    });

    // アニメーションの実行
    loadingAnimation
        .to(mainText, {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power2.out'
        })
        .to(tagline, {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power2.out'
        }, '-=0.5')
        .to(loadingGif, {
            opacity: 1,
            scale: 1,
            duration: 1,
            ease: 'back.out(1.7)'
        }, '-=0.5');
});
