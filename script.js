// ===========================================================
//  네이버 지도
// ===========================================================
const NAVER_MAP_CLIENT_ID = "uf90x9mu8h";  // 네이버 클라우드 Maps Client ID
const HAERANGCHAE_LATLNG = { lat: 37.45249, lng: 129.17402 }; // 핀 좌표(대략값 — 정확히 조정 가능)
const MAP_DESKTOP_SHIFT_LNG = 0.0072;      // PC에서 핀을 오른쪽으로 미는 정도(카드가 왼쪽이라)
let naverInitDone = false;

function initNaverMap() {
  if (naverInitDone) return;
  const el = document.getElementById('naver-map');
  if (!el || !window.naver || !window.naver.maps || !window.naver.maps.Map) return;
  naverInitDone = true;

  el.style.display = 'block';                       // 숨김 상태로 생성하면 빈 지도 → 먼저 표시
  const pin = document.querySelector('.map-pin');
  if (pin) pin.style.display = 'none';

  const pos = new naver.maps.LatLng(HAERANGCHAE_LATLNG.lat, HAERANGCHAE_LATLNG.lng);
  const center = (window.innerWidth > 768)
    ? new naver.maps.LatLng(HAERANGCHAE_LATLNG.lat, HAERANGCHAE_LATLNG.lng - MAP_DESKTOP_SHIFT_LNG)
    : pos;
  const map = new naver.maps.Map(el, { center: center, zoom: 16, scrollWheel: false });
  new naver.maps.Marker({ position: pos, map: map, title: '삼척바다 해랑채' });
  // 레이아웃 확정 후 크기 재계산(빈 지도 방지)
  setTimeout(function () { naver.maps.Event.trigger(map, 'resize'); map.setCenter(center); }, 300);
}
window.initNaverMap = initNaverMap;

// 인증 실패 시 빨간 에러 대신 자리표시자로 폴백
window.navermap_authFailure = function () {
  console.warn('네이버 지도 인증 실패 — Web 서비스 URL 등록을 확인하세요.');
  const el = document.getElementById('naver-map'); if (el) el.style.display = 'none';
  const pin = document.querySelector('.map-pin'); if (pin) pin.style.display = '';
};

if (NAVER_MAP_CLIENT_ID) {
  const s = document.createElement('script');
  s.src = 'https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=' + NAVER_MAP_CLIENT_ID;
  // 라이브러리가 naver.maps.Map 을 비동기로 준비할 수 있어, 준비될 때까지 폴링 후 생성
  s.onload = function () {
    let tries = 0;
    (function poll() {
      if (naverInitDone) return;
      if (window.naver && window.naver.maps && window.naver.maps.Map) { initNaverMap(); return; }
      if (++tries > 50) { console.warn('naver.maps 로드 대기 시간 초과'); return; }
      setTimeout(poll, 200);
    })();
  };
  s.onerror = function () { console.warn('네이버 지도 스크립트 로드 실패'); window.navermap_authFailure(); };
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

// ===== Gallery: 마우스 드래그 + 터치 방향판별(가로=슬라이드 / 세로=페이지 스크롤) =====
const gimgs = document.querySelector('.g-imgs');
if (gimgs) {
  let raf = null;
  const cancelMomentum = () => { if (raf) { cancelAnimationFrame(raf); raf = null; } };
  const momentum = (v0) => {                         // 손 뗀 뒤 관성 글라이드
    let v = v0;
    const glide = () => {
      if (Math.abs(v) < 0.4) { gimgs.style.scrollSnapType = ''; raf = null; return; }
      gimgs.scrollLeft -= v; v *= 0.93;
      raf = requestAnimationFrame(glide);
    };
    cancelMomentum(); raf = requestAnimationFrame(glide);
  };

  /* --- 마우스 드래그 (데스크톱) --- */
  let dragging = false, lastX = 0, lastT = 0, vel = 0;
  gimgs.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;   // 터치는 아래 touch 핸들러가 처리
    cancelMomentum();
    dragging = true; lastX = e.clientX; lastT = e.timeStamp; vel = 0;
    gimgs.style.scrollSnapType = 'none';
    gimgs.classList.add('dragging');
    try { gimgs.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });
  gimgs.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    gimgs.scrollLeft -= dx;
    vel = dx / ((e.timeStamp - lastT) || 16);
    lastX = e.clientX; lastT = e.timeStamp;
  });
  const mouseUp = () => {
    if (!dragging) return;
    dragging = false; gimgs.classList.remove('dragging');
    momentum(vel * 16);
  };
  gimgs.addEventListener('pointerup', mouseUp);
  gimgs.addEventListener('pointercancel', mouseUp);

  /* --- 터치 (모바일): 방향 판별 ---
     touch-action:pan-y 라서 세로 swipe는 브라우저가 '페이지 스크롤'로 처리하고,
     가로 swipe일 때만 여기서 슬라이드(preventDefault). 세로면 손대지 않음 → 페이지 스크롤 안 끊김 */
  let tx = 0, ty = 0, tScroll = 0, tDir = null, tLastX = 0, tLastT = 0, tVel = 0;
  gimgs.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    tx = tLastX = t.clientX; ty = t.clientY;
    tScroll = gimgs.scrollLeft; tDir = null; tVel = 0; tLastT = e.timeStamp;
    cancelMomentum();
  }, { passive: true });
  gimgs.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    const dx = t.clientX - tx, dy = t.clientY - ty;
    if (tDir === null) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) tDir = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      else return;
    }
    if (tDir === 'x') {
      e.preventDefault();                            // 가로일 때만 페이지 스크롤 막고 슬라이드
      gimgs.style.scrollSnapType = 'none';
      gimgs.scrollLeft = tScroll - dx;
      tVel = (t.clientX - tLastX) / ((e.timeStamp - tLastT) || 16);
      tLastX = t.clientX; tLastT = e.timeStamp;
    }
    /* tDir === 'y' → 아무것도 안 함(브라우저가 페이지 세로 스크롤 수행) */
  }, { passive: false });
  gimgs.addEventListener('touchend', () => {
    if (tDir === 'x') momentum(tVel * 16);
    tDir = null;
  });
}

// ===== Cinematic: 유튜브 영상 (스크롤로 재생 / 22초부터 시작·반복) =====
const YT_VIDEO_ID = 'KulDUFffwgU';   // 유튜브 영상 ID
const VIDEO_START = 22;              // 시작 지점(초)
const play = document.querySelector('.play-btn');
const ytHost = document.getElementById('yt-player');
let ytPlayer = null, ytReady = false, ytInView = false;

// ----- 배경음악(BGM): 영상은 숨기고 소리만 재생 -----
const BGM_VIDEO_ID = '86gToHFkbiU';
const BGM_VOLUME = 40;                 // 0~100 (배경음악 볼륨)
const bgmHost = document.getElementById('bgm-player');
const bgmBtn = document.querySelector('.bgm-toggle');
let bgmPlayer = null, bgmReady = false, bgmWanted = true, bgmGestureDone = false;
function updateBgmBtn() {
  if (!bgmBtn || !bgmPlayer || !bgmPlayer.getPlayerState) return;
  bgmBtn.classList.toggle('playing', bgmPlayer.getPlayerState() === YT.PlayerState.PLAYING);
}
function startBgm() {
  if (!bgmReady || !bgmPlayer) return;
  bgmPlayer.unMute(); bgmPlayer.setVolume(BGM_VOLUME); bgmPlayer.playVideo();
}

function seekToStartIfNeeded() {
  if (ytPlayer && ytPlayer.getCurrentTime && ytPlayer.getCurrentTime() < VIDEO_START) {
    ytPlayer.seekTo(VIDEO_START, true);
  }
}

// 가능한 최고 화질로 힌트(유튜브가 무시할 수도 있음 — 플레이어가 클수록 효과적)
function forceHQ(p) {
  try {
    const levels = p.getAvailableQualityLevels && p.getAvailableQualityLevels();
    const best = (levels && levels.length) ? levels[0] : 'highres';  // levels[0]가 최고 화질
    if (p.setPlaybackQuality) p.setPlaybackQuality(best);
    if (p.setPlaybackQualityRange) p.setPlaybackQualityRange(best, best);
  } catch (_) {}
}

// 유튜브 API 준비되면 호출됨
window.onYouTubeIframeAPIReady = function () {
  if (ytHost) {
    ytPlayer = new YT.Player('yt-player', {
      videoId: YT_VIDEO_ID,
      playerVars: { autoplay: 0, controls: 0, mute: 1, start: VIDEO_START, rel: 0,
                    modestbranding: 1, playsinline: 1, disablekb: 1, fs: 0 },
      events: {
        onReady: (e) => {
          ytReady = true; e.target.mute(); forceHQ(e.target);
          if (ytInView) { seekToStartIfNeeded(); e.target.playVideo(); }
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.ENDED) { ytPlayer.seekTo(VIDEO_START, true); ytPlayer.playVideo(); }
          if (e.data === YT.PlayerState.PLAYING) forceHQ(ytPlayer);   // 재생 시작 시 최고 화질 힌트
          if (play) {
            if (e.data === YT.PlayerState.PLAYING) play.classList.remove('is-paused');
            else if (e.data === YT.PlayerState.PAUSED) play.classList.add('is-paused');
          }
        }
      }
    });
  }
  if (bgmHost) {
    bgmPlayer = new YT.Player('bgm-player', {
      videoId: BGM_VIDEO_ID,
      playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: BGM_VIDEO_ID, rel: 0,
                    playsinline: 1, disablekb: 1, fs: 0 },
      events: {
        onReady: () => {
          bgmReady = true; bgmPlayer.setVolume(BGM_VOLUME);
          if (bgmWanted) startBgm();   // 자동재생 시도(허용되는 PC면 바로 재생, 막히면 첫 상호작용 때 재생)
        },
        onStateChange: updateBgmBtn
      }
    });
  }
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

  // 챕터 태그 클릭 → 해당 초로 이동 후 재생
  document.querySelectorAll('.cine-tag').forEach((tag) => {
    tag.addEventListener('click', () => {
      const t = parseInt(tag.dataset.t, 10);
      if (ytReady && ytPlayer) { ytPlayer.seekTo(t, true); ytPlayer.playVideo(); }
      document.querySelectorAll('.cine-tag').forEach((x) => x.classList.remove('active'));
      tag.classList.add('active');
    });
  });
}

// ===== 배경음악: 첫 상호작용 시 자동 재생 + 토글 버튼 =====
if (bgmHost) {
  // API 로드 보장(시네마틱이 없을 때 대비)
  if (!document.querySelector('script[src*="iframe_api"]')) {
    const t = document.createElement('script'); t.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(t);
  }
  // 브라우저 정책상 소리 자동재생이 막히므로, 첫 사용자 제스처 때 재생
  const kick = (e) => {
    window.removeEventListener('pointerdown', kick);
    window.removeEventListener('touchstart', kick);
    window.removeEventListener('keydown', kick);
    bgmGestureDone = true;
    if (e && e.target && e.target.closest && e.target.closest('.bgm-toggle')) return; // 버튼은 버튼 핸들러가 처리
    if (bgmWanted) startBgm();
  };
  window.addEventListener('pointerdown', kick);
  window.addEventListener('touchstart', kick);
  window.addEventListener('keydown', kick);

  // 음악 on/off 토글
  if (bgmBtn) {
    bgmBtn.addEventListener('click', () => {
      bgmGestureDone = true;
      if (!bgmReady) { bgmWanted = true; return; }          // 준비되면 onReady에서 재생
      if (bgmPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
        bgmPlayer.pauseVideo(); bgmWanted = false;
        bgmBtn.classList.add('is-hidden');   // 사용자가 직접 끄면 버튼 숨김
      } else { bgmWanted = true; startBgm(); }
      updateBgmBtn();
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
  const targets = document.querySelectorAll('.reveal-group, .reveal, .cine-reveal');
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
