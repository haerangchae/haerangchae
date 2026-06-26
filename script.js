// ===========================================================
//  네이버 지도 설정 — 여기 두 줄만 채우면 실제 지도가 뜹니다
// ===========================================================
//  1) 네이버 클라우드 플랫폼 > Maps > Application 등록 후 받은 Client ID
//     (등록 시 "Web 서비스 URL"에 http://localhost:8123 과 실제 도메인을 추가하세요)
const NAVER_MAP_CLIENT_ID = "";           // 예: "abcd1234ef"
//  2) 해랑채 정확한 위도/경도 (네이버 지도에서 핀 우클릭 → 좌표로 확인해 교체)
const HAERANGCHAE_LATLNG = { lat: 37.45249, lng: 129.17402 }; // 대략값(증산해변 인근)

function initNaverMap() {
  const el = document.getElementById('naver-map');
  if (!el || !window.naver || !naver.maps) return;
  const pos = new naver.maps.LatLng(HAERANGCHAE_LATLNG.lat, HAERANGCHAE_LATLNG.lng);
  const map = new naver.maps.Map(el, {
    center: pos, zoom: 16, scrollWheel: false,
    mapTypeControl: false, logoControl: true, mapDataControl: false,
  });
  new naver.maps.Marker({ position: pos, map, title: '삼척바다 해랑채' });
  el.style.display = 'block';                       // 지도 노출
  const pin = document.querySelector('.map-pin');
  if (pin) pin.style.display = 'none';              // 자리표시자 숨김
}

if (NAVER_MAP_CLIENT_ID) {
  const s = document.createElement('script');
  s.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAP_CLIENT_ID}`;
  s.onload = initNaverMap;
  s.onerror = () => console.warn('네이버 지도 스크립트 로드 실패 — Client ID/도메인 등록을 확인하세요.');
  document.head.appendChild(s);
}

// ===== GNB: transparent → solid on scroll =====
const gnb = document.getElementById('gnb');
const onScroll = () => {
  if (window.scrollY > 60) gnb.classList.add('scrolled');
  else gnb.classList.remove('scrolled');
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ===== Mobile menu (backdrop + 닫기버튼 + 바깥 터치로 닫힘) =====
const burger = document.querySelector('.gnb-burger');
const nav = document.querySelector('.gnb-nav');
const navBackdrop = document.querySelector('.nav-backdrop');
const navClose = document.querySelector('.nav-close');
function openNav() { nav.classList.add('open'); navBackdrop && navBackdrop.classList.add('show'); }
function closeNav() { nav.classList.remove('open'); navBackdrop && navBackdrop.classList.remove('show'); }
burger.addEventListener('click', () => nav.classList.contains('open') ? closeNav() : openNav());
navClose && navClose.addEventListener('click', closeNav);
navBackdrop && navBackdrop.addEventListener('click', closeNav);
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });

// ===== Hero carousel =====
const slides = document.querySelectorAll('.hero-slide');
const dots = document.querySelectorAll('.hero-dots .dot');
let cur = 0;
let timer;

function go(i) {
  cur = (i + slides.length) % slides.length;
  slides.forEach((s, n) => s.classList.toggle('is-active', n === cur));
  dots.forEach((d, n) => d.classList.toggle('is-active', n === cur));
}
function next() { go(cur + 1); }
function start() { timer = setInterval(next, 5000); }
function reset() { clearInterval(timer); start(); }

dots.forEach(d =>
  d.addEventListener('click', () => { go(+d.dataset.i); reset(); })
);
if (slides.length > 1) start();

// ===== Hero drag / swipe (mouse + touch via Pointer Events) =====
const heroEl = document.querySelector('.hero');
if (heroEl && slides.length > 1) {
  let startX = null, dragging = false;
  const THRESHOLD = 50; // px

  heroEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.hero-dots') || e.target.closest('a,button')) return;
    startX = e.clientX; dragging = true;
    heroEl.classList.add('dragging');
    try { heroEl.setPointerCapture(e.pointerId); } catch (_) {}
  });
  const end = (e) => {
    if (!dragging || startX === null) { dragging = false; return; }
    const dx = (e.clientX ?? startX) - startX;
    if (Math.abs(dx) > THRESHOLD) { if (dx < 0) next(); else go(cur - 1); reset(); }
    dragging = false; startX = null;
    heroEl.classList.remove('dragging');
  };
  heroEl.addEventListener('pointerup', end);
  heroEl.addEventListener('pointercancel', () => { dragging = false; startX = null; heroEl.classList.remove('dragging'); });
}

// ===== Gallery: 1:1 드래그 + 관성 (터치는 네이티브 스크롤) =====
const gimgs = document.querySelector('.g-imgs');
if (gimgs) {
  let dragging = false, lastX = 0, lastT = 0, vel = 0, raf = null;
  const cancelMomentum = () => { if (raf) { cancelAnimationFrame(raf); raf = null; } };
  gimgs.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;          // 터치는 네이티브 스크롤(부드러움) 사용
    if (e.button !== 0) return;
    cancelMomentum();
    dragging = true; lastX = e.clientX; lastT = e.timeStamp; vel = 0;
    gimgs.style.scrollSnapType = 'none';            // 드래그 중 스냅 해제 → 손 따라 1:1 이동
    gimgs.classList.add('dragging');
    try { gimgs.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });
  gimgs.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dt = (e.timeStamp - lastT) || 16;
    gimgs.scrollLeft -= dx;                          // 움직인 만큼 정확히
    vel = dx / dt;                                   // px/ms
    lastX = e.clientX; lastT = e.timeStamp;
  });
  const release = () => {
    if (!dragging) return;
    dragging = false; gimgs.classList.remove('dragging');
    let v = vel * 16;                                // 관성 시작 속도(프레임당 px)
    const glide = () => {
      if (Math.abs(v) < 0.4) { gimgs.style.scrollSnapType = ''; raf = null; return; }
      gimgs.scrollLeft -= v; v *= 0.93;              // 감속
      raf = requestAnimationFrame(glide);
    };
    cancelMomentum(); raf = requestAnimationFrame(glide);
  };
  gimgs.addEventListener('pointerup', release);
  gimgs.addEventListener('pointercancel', release);
}

// ===== Cinematic: 유튜브 영상 (스크롤로 재생 / 22초부터 시작·반복) =====
const YT_VIDEO_ID = 'KulDUFffwgU';   // 유튜브 영상 ID
const VIDEO_START = 22;              // 시작 지점(초)
const play = document.querySelector('.play-btn');
const ytHost = document.getElementById('yt-player');
let ytPlayer = null, ytReady = false, ytInView = false;

function seekToStartIfNeeded() {
  if (ytPlayer && ytPlayer.getCurrentTime && ytPlayer.getCurrentTime() < VIDEO_START) {
    ytPlayer.seekTo(VIDEO_START, true);
  }
}

// 유튜브 API 준비되면 호출됨
window.onYouTubeIframeAPIReady = function () {
  if (!ytHost) return;
  ytPlayer = new YT.Player('yt-player', {
    videoId: YT_VIDEO_ID,
    playerVars: { autoplay: 0, controls: 0, mute: 1, start: VIDEO_START, rel: 0,
                  modestbranding: 1, playsinline: 1, disablekb: 1, fs: 0 },
    events: {
      onReady: (e) => {
        ytReady = true; e.target.mute();
        if (ytInView) { seekToStartIfNeeded(); e.target.playVideo(); }
      },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.ENDED) { ytPlayer.seekTo(VIDEO_START, true); ytPlayer.playVideo(); }
        if (play) {
          if (e.data === YT.PlayerState.PLAYING) play.classList.remove('is-paused');
          else if (e.data === YT.PlayerState.PAUSED) play.classList.add('is-paused');
        }
      }
    }
  });
};

if (ytHost) {
  // 유튜브 IFrame API 로드
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);

  // 화면에 들어오면 재생, 벗어나면 일시정지
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        ytInView = e.isIntersecting;
        if (!ytReady) return;
        if (e.isIntersecting) { seekToStartIfNeeded(); ytPlayer.playVideo(); }
        else ytPlayer.pauseVideo();
      });
    }, { threshold: 0.35 });
    io.observe(document.querySelector('.cinematic'));
  }

  // 재생/일시정지 버튼
  if (play) {
    play.addEventListener('click', () => {
      if (!ytReady) return;
      if (ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
      else { seekToStartIfNeeded(); ytPlayer.playVideo(); }
    });
  }
}

// ===== 스크롤 등장 효과 (Scroll Reveal) =====
// .reveal-group(자식 순차) / .reveal(단일) 요소가 화면에 들어오면 재생합니다.
// 효과의 세기·속도·간격은 styles.css의 "스크롤 등장 효과" 블록에서 조절하세요.
(() => {
  // 갤러리 카드 4장은 0,1,2,3 순서로 도미노 지정
  document.querySelectorAll('.gallery .g-cell.reveal').forEach((c, i) => {
    c.style.setProperty('--reveal-order', i);
  });
  const targets = document.querySelectorAll('.reveal-group, .reveal');
  if (!('IntersectionObserver' in window)) {           // 미지원 브라우저는 그냥 모두 표시
    targets.forEach((t) => t.classList.add('is-shown'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-shown'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  targets.forEach((t) => io.observe(t));
})();
