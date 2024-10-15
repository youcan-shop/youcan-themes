/* ----- Store currency ----- */
const currencyCode = window.Dotshop.currency;
const customerLocale = window.Dotshop.customer_locale;
/* ------------------ */
/* ----- navbar ----- */
/* ------------------ */
const fixedNavbar = document.querySelector('.nav-fixed');
const notice = document.querySelector('.yc-notice');

const makeNavbarFixed = () => {
  document.body.style.paddingTop = fixedNavbar.offsetHeight + 'px';
  fixedNavbar.classList.add('fixed');
};

const makeNavbarStatic = () => {
  document.body.style.paddingTop = '0';
  fixedNavbar.classList.remove('fixed');
};

function toggleNavbar() {
  if (window.scrollY >= fixedNavbar.offsetHeight + notice.offsetHeight) {
    makeNavbarFixed();
  } else {
    makeNavbarStatic();
  }
}

if (fixedNavbar && notice) {
  toggleNavbar();
  window.addEventListener('scroll', toggleNavbar);
}

/* -------------------------- */
/* ----- spinner-loader ----- */
/* -------------------------- */
function load(el) {
  const loader = document.querySelector(el);
  if (loader) {
    loader.classList.remove('hidden');
  }

  const nextEl = loader ? loader.nextElementSibling : null;

  if (nextEl) {
    nextEl.classList.add('hidden');
  }
}

function stopLoad(el) {
  const loader = document.querySelector(el);
  if (loader) {
    loader.classList.add('hidden');
  }

  const nextEl = loader ? loader.nextElementSibling : null;
  if (nextEl) {
    nextEl.classList.remove('hidden');
  }
}

/* ----------------- */
/* ----- alert ----- */
/* ----------------- */
function notify(msg, type = 'success', timeout = 3000) {
  const alert = document.querySelector('.yc-alert');
  if (!alert) return;

  const icons = alert.querySelectorAll('.icon');
  if (!icons || !icons.length) return;

  const alertClassList = alert.classList.value;

  icons.forEach((icon) => icon.style.display = 'none');
  alert.querySelector(`.icon-${type}`).style.display = 'block';
  alert.querySelector('.alert-msg').innerText = msg;

  alert.classList.add(type);
  alert.classList.add('show');

  setTimeout(() => alert.setAttribute('class', alertClassList), timeout);
}

/* ----------------------------- */
/* ----- navigation-drawer ----- */
/* ----------------------------- */
const overlay = document.querySelector('.global-overlay');
const drawer = document.querySelector('.navigation-drawer');

const showOverlay = () => {
  const overlay = document.querySelector('.global-overlay');

  document.body.style.overflowY = 'hidden';
  overlay.style.visibility = 'visible';
  overlay.style.opacity = '1';
}

const hideOverlay = () => {
  const overlay = document.querySelector('.global-overlay');
  const drawerBtn = document.querySelector('.close-drawer-btn');

  const closeDrawer = () => {
    document.body.style.overflowY = 'auto';
    overlay.style.visibility = 'hidden';
    overlay.style.opacity = '0';
    drawer.style.transform = 'translateX(150vw)';
  };

  if (drawerBtn) {
    drawerBtn.addEventListener('click', closeDrawer);
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeDrawer();
    }
  });
};


if (overlay) {
  hideOverlay();
}

function openDrawer(el) {
  const targetedDrawer = document.querySelector(`.navigation-drawer${el}`);
  if (targetedDrawer) {
    showOverlay();
    targetedDrawer.style.transform = 'none';
    targetedDrawer.style.opacity = '1';
  }
}

/* ------------------ */
/* ----- search ----- */
/* ------------------ */
const searchHolder = document.getElementById('searchInputHolder');
let noticeHeight = notice?.offsetHeight;

function isNavBarFixed() {
  return fixedNavbar?.classList.contains('fixed');
}

function openSearch() {
  noticeHeight = isNavBarFixed() ? 0 : notice?.offsetHeightconsole;

  if (!overlay) return;

  overlay.style.height = `calc(100vh + ${noticeHeight || 0}px)`;
  overlay.style.top = `${noticeHeight || 0}px`;
  overlay.style.opacity = '1';
  overlay.style.visibility = 'visible';
  document.body.style.overflowY = 'hidden';

  if (!searchHolder) return;

  searchHolder.style.opacity = '1';
  searchHolder.style.visibility = 'visible';
  searchHolder.style.top = `${noticeHeight || 0}px`;

  if(isNavBarFixed()) {
    fixedNavbar.style.zIndex= '1001';
  }
}

function closeSearch() {
  if (!overlay) return;

  overlay.style.opacity = '0';
  overlay.style.visibility = 'hidden';
  overlay.style.height = '100vh';
  document.body.style.overflowY = 'auto';

  if(isNavBarFixed()) {
    fixedNavbar.style.zIndex= '101';
  }

  if (!searchHolder) return;

  searchHolder.style.opacity = '0';
  searchHolder.style.visibility = 'hidden';
}

overlay.addEventListener('click', closeSearch);

/* ---------------------------------------------- */
/* ----- Group Sticky elements in one place ----- */
/* ---------------------------------------------- */
(function groupStickyElements() {
  const elements = document.querySelectorAll('.is_sticky');

  if (!elements || !elements.length) return;

  const elementsContainer = document.createElement('div');
  elementsContainer.classList.add('sticky-elements-container');

  elements.forEach((element) => {
    elementsContainer.appendChild(element);
  });

  document.body.append(elementsContainer);
})();

/* ------------------------------------------------------ */
/* ----- Display each video section -------------------- */
/* ------------------------------------------------------ */
function processVideoSections() {
  const videoSections = document.querySelectorAll('.video-wrapper');

  if (!videoSections || !videoSections.length) return;

  videoSections.forEach((video) => {
    const facebookVideo = video.querySelector('.facebook-video');
    const youtubeVideo = video.querySelector('.youtube-video');
    const width = video.getAttribute('data-video-width') * (window.innerWidth / 100);
    const height =  video.getAttribute('data-video-height');
    const videoUrl=  video.getAttribute('data-video-link');

    function getBestThumbnailUrl(videoId) {
      return new Promise((resolve) => {
        const img = new Image();
        const maxResUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

        img.onload = () => {
          resolve(maxResUrl);
        };

        img.onerror = () => {
          resolve(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
        };

        img.src = maxResUrl;
      });
    }

    function extractYouTubeVideoId(url) {
      const regex = /(?:v=|youtu\.be\/)([^&]+)/;
      const match = url.match(regex);
      return match ? match[1] : null;
    }

    async function initializeYouTubeVideo(youtubeVideo) {
      const spinner = youtubeVideo.querySelector('.spinner');
      const videoId = extractYouTubeVideoId(videoUrl);
      youtubeVideo.style.width = width + 'px';
      youtubeVideo.style.height = height + 'px';
      const youtubeThumbnail = youtubeVideo.querySelector('.youtube-thumbnail');
      const youtubePlayButton = youtubeVideo.querySelector('.youtube-play-button');

      const thumbnailUrl = await getBestThumbnailUrl(videoId);
      youtubeThumbnail.src = thumbnailUrl;

      const iframe = document.createElement('iframe');
      iframe.width = width;
      iframe.height = height;
      iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.style.display = 'none';
      youtubeVideo.appendChild(iframe);

      youtubeVideo.addEventListener('click', function () {
        youtubeThumbnail.style.display = 'none';
        youtubePlayButton.style.display = 'none';
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1`;
        iframe.style.display = 'block';
        spinner.style.display = 'block';

        iframe.addEventListener('load', function () {
          spinner.style.display = 'none';
        });
      });
    }

    document.addEventListener('DOMContentLoaded', async function () {
      if (youtubeVideo) {
        await initializeYouTubeVideo(youtubeVideo);
      } else if (facebookVideo) {
        facebookVideo.width = width;
        facebookVideo.height = height;
        facebookVideo.src = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoUrl)}`;
      }
    });
  });
}

processVideoSections();

function decodeHtmlEntities(text) {
  let textarea = document.createElement('textarea');
  textarea.innerHTML = text;

  return textarea.value;
}

function renderTextContent(htmlContent) {
  let tempElement = document.createElement('div');
  tempElement.innerHTML = htmlContent;
  
  return tempElement.innerText || tempElement.textContent;
}

if (FORM.errors) {
  let decodedText = decodeHtmlEntities(FORM.errors);
  notify(renderTextContent(decodedText), 'error', 20000);
}

/**
 * Formats a given amount into a currency string.
 *
 * @param {number} amount - The numerical value to be formatted.
 * @param {string} currencySymbol - The symbol of the currency (e.g., $, €, £, USD, EUR, etc).
 * @param {string} [locale='en-US'] - Optional. The locale string to format the currency (e.g., 'en-US', 'fr-FR').
 * @param {boolean} [usePrecision=false] - Optional. Whether to include decimal precision.
 * @returns {string} - The formatted currency string.
 */
function formatCurrency(amount, currencySymbol, locale = 'en-US', usePrecision = false) {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'decimal',
    maximumFractionDigits: usePrecision ? 2 : 0,
    roundingMode: 'floor'
  });

  const formattedValue = formatter.format(amount);

  const determineSymbolPositionFormatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'symbol',
  });

  const parts = determineSymbolPositionFormatter.formatToParts(1); // format with 1 USD just to determine the position of the currency symbol
  const symbolIndex = parts.findIndex(part => part.type === 'currency');

  return symbolIndex === 0
    ? `${currencySymbol} ${formattedValue}`
    : `${formattedValue} ${currencySymbol}`;
}

function shouldUsePrecision(amount) {
  const { multicurrency_settings } = Dotshop.store;
  const { isMulticurrencyActive, usePrecision } = multicurrency_settings;

  if (!isMulticurrencyActive) {
    return !(amount % 1 === 0)
  }

  return isMulticurrencyActive && usePrecision;
}
