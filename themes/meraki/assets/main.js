/* ----- Store currency ----- */
const CURRENCY_CODE = window.Dotshop.currency;
const CUSTOMER_LOCALE = window.Dotshop.customer_locale || 'en-US';
const CUSTOMER_COUNTRY_CODE = new Intl.Locale(CUSTOMER_LOCALE).region;
/* ------------------ */
/* ----- navbar ----- */
/* ------------------ */
const fixedNavbar = document.querySelector('.nav-fixed');
const notice = document.querySelector('.yc-notice');
const closeSearchBtn = document.getElementById('close-search-btn');
const navMenuVariables = {
  menuButton: document.getElementById('menuButton'),
  mobileMenu: document.getElementById('mobile-menu'),
  header: document.querySelector('.yc-header'),
  headerWrapper: document.querySelector('.header-wrapper'),
};
let noticeHeight = notice ? notice.offsetHeight : '0';

const makeNavbarFixed = () => {
  document.body.style.paddingTop = fixedNavbar?.offsetHeight + 'px';
  fixedNavbar?.classList.add('fixed');
};

const makeNavbarStatic = () => {
  document.body.style.paddingTop = '0';
  fixedNavbar?.classList.remove('fixed');
};

function toggleNavbar() {
  if (window.scrollY >= fixedNavbar?.offsetHeight + Number(noticeHeight)) {
    makeNavbarFixed();
  } else {
    makeNavbarStatic();
  }
}

toggleNavbar();
window.addEventListener('scroll', toggleNavbar);

/* -------------------------- */
/* ----- spinner-loader ----- */
/* -------------------------- */
function load(el) {
  const element = document.querySelector(el);

  if (!element) {
    return;
  }

  if (element) {
    element.classList.remove('hidden');
  }

  if (element.parentElement.hasAttribute('data-type')) {
    element.parentElement.setAttribute('data-type', 'loading');
    element.parentElement.disabled = true;
  }

  const nextEl = element ? element.nextElementSibling : null;

  if (nextEl) {
    nextEl.classList.add('hidden');
  }
}

function stopLoad(el) {
  const element = document.querySelector(el);

  if (!element) {
    return;
  }

  if (element) {
    element.classList.add('hidden');
  }

  if (element.parentElement.hasAttribute('data-type')) {
    element.parentElement.setAttribute('data-type', '');
    element.parentElement.disabled = false;
  }

  const nextEl = element ? element.nextElementSibling : null;
  if (nextEl) {
    nextEl.classList.remove('hidden');
  }
}

/* ----------------- */
/* ----- alert ----- */
/* ----------------- */
function notify(msg, type = 'success', timeout = 3000) {
  const alertWrapper = document.querySelector('.yc-alert');

  if (!alertWrapper) return;

  if (alertWrapper.timeoutId) {
    clearTimeout(alertWrapper.timeoutId); // Clear any existing timeout associated with this alert
  }

  if (alertWrapper.children.length > 0) {
    [...alertWrapper.classList].forEach(className => {
      if (className !== 'yc-alert') {
        alertWrapper.classList.remove(className); // Remove all classes except 'yc-alert'
      }
    });
  }

  const alertTypes = {
    success: {
      icon: 'checkmark-circle-outline',
      class: 'icon-success'
    },
    error: {
      icon: 'alert-circle-outline',
      class: 'icon-error'
    },
    warning: {
      icon: 'warning-outline',
      class: 'icon-warning'
    }
  };

  alertWrapper.classList.add(type);
  alertWrapper.classList.add('show');
  alertWrapper.innerHTML = `
    <ion-icon
      name='${alertTypes[type].icon}'
      class='text-xl ${alertTypes[type].class} icon'
    ></ion-icon>
    <span class='alert-msg text-white'>${msg}</span>
  `;

  alertWrapper.timeoutId = setTimeout(() => {
    alertWrapper.classList.remove('show');
    alertWrapper.classList.remove(type);
  }, timeout);
}

/* ------------------- */
/* ----- Overlay ----- */
/* ------------------- */
const overlay = document.querySelector('.global-overlay');

const showOverlay = () => {
  document.body.style.overflowY = 'hidden';
  overlay.style.visibility = 'visible';
  overlay.style.opacity = '1';
}

const hideOverlay = () => {
  document.body.style.overflowY = 'auto';
  overlay.style.visibility = 'hidden';
  overlay.style.opacity = '0';
};

overlay.addEventListener('click', (e) => {
  const cartDrawer = document.querySelector('.cart-drawer');

  if (e.target === overlay) {
    hideOverlay();
    closeMenu();

    if(cartDrawer && cartDrawer.classList.contains('open')) {
      cartDrawer.classList.remove('open');
      navMenuVariables.header?.classList.remove('hide');
    }
  }
});
/* ----------------------------- */
/* ----- mobile navigation ----- */
/* ----------------------------- */
function closeMenu() {
  if(navMenuVariables.headerWrapper.classList.contains('open')) {
    navMenuVariables.headerWrapper.classList.remove('open');
    navMenuVariables.mobileMenu.classList.remove('is-open');
    navMenuVariables.menuButton.classList.remove('close');
  }
};

// Toggle Menu
navMenuVariables.menuButton?.addEventListener('click', () => {
  navMenuVariables.menuButton.classList.toggle('close');

  if (navMenuVariables.mobileMenu) {
    navMenuVariables.mobileMenu.classList.toggle('is-open');

    if (navMenuVariables.mobileMenu.classList.contains('is-open')) {
      showOverlay();
      navMenuVariables.headerWrapper.classList.add('open');
    } else {
      closeMenu();
      hideOverlay();
    }
  }
})
/* ------------------ */
/* ----- search ----- */
/* ------------------ */
const searchHolder = document.getElementById('searchInputHolder');

function openSearch() {
  const searchInput = document.querySelector('.search-input');
  const isNavBarFixed = fixedNavbar?.classList.contains('fixed');

  if(notice) {
    searchHolder.style.top = `${noticeHeight}px`;
  }

  if(isNavBarFixed) {
    searchHolder.style.top = '0';
  }

  setTimeout(closeMenu, 100);

  if (!overlay) return;
  showOverlay();

  if (!searchHolder) return;

  searchHolder.style.opacity = '1';
  searchHolder.style.visibility = 'visible';
  document.body.style.overflow = "hidden";
  searchInput.focus();
}

function closeSearch() {
  if (!overlay) return;
  hideOverlay();

  if (!searchHolder) return;

  searchHolder.style.opacity = '0';
  searchHolder.style.visibility = 'hidden';
}

overlay.addEventListener('click', closeSearch);
closeSearchBtn?.addEventListener('click', closeSearch);

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

  desktopStickyElements(elementsContainer);
})();

function desktopStickyElements(elementsContainer) {
  const elementsWrapper = document.createElement('div');
  const emptySpacer = document.createElement('div');

  elementsWrapper.classList.add('sticky-elements-wrapper');
  emptySpacer.classList.add('sticky-empty-spacer');
  elementsWrapper.appendChild(elementsContainer);
  elementsWrapper.appendChild(emptySpacer);
  document.body.append(elementsWrapper);

  if (window.matchMedia("(min-width: 768px)").matches) {
    elementsWrapper.classList.add('container');
  }

  window.addEventListener('resize', () => {
    if(window.innerWidth >= 768) {
      elementsWrapper.classList.add('container');
    } else if(window.innerWidth < 768) {
      elementsWrapper.classList.remove('container');
    }
  })
}

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
    const height = video.getAttribute('data-video-height');
    const videoUrl = video.getAttribute('data-video-link');

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
function formatCurrency(amount, currencySymbol, locale = 'en-US') {
  const usePrecision = shouldUsePrecision(amount);
  const formatter = new Intl.NumberFormat(locale, {
    style: 'decimal',
    roundingMode: 'floor',
    maximumFractionDigits: usePrecision ? 2 : 0,
    minimumFractionDigits: usePrecision ? 2 : 0,
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
    return !Number.isInteger(amount);
  }

  return isMulticurrencyActive && usePrecision;
}

/**
 * Restrict the input value based on the inventory number
 *
 * @param {HTMLInputElement} inputElement - The input element.
 * @param {number} maxInventoryValue - The maximum allowable inventory value.
 */
function restrictInputValue(inputElement, maxInventoryValue) {

  if (maxInventoryValue === null) {
    return;
  }

  let currentValue = parseInt(inputElement.value);

  if (currentValue < 1) {
    inputElement.value = 1;
  }

  if (currentValue > maxInventoryValue) {
    inputElement.value = maxInventoryValue;
  }
}

/**
 * Fetching the total number of reviews for a specific product and displaying the average rating
 *
 * @param {string} productId - The product id.
 * @param {HTMLElement} closetParent - the colsest parent of the element.
 * @param {number} averageRating - the rating number of the product.
 */
async function fetchReviewsForProduct(productId, closetParent, averageRating) {
  const generalReviewsContainers = document.querySelectorAll(`${closetParent} .yc-general-review`);
  const generalReviewsWrappers = document.querySelectorAll(`${closetParent} .yc-general-review-wrapper`);
  const reviewButton = document.querySelector('#addReviewBtn');

  if (!generalReviewsContainers.length || !generalReviewsWrappers.length) {
    return;
  }

  const noDataSetter = () => {
    generalReviewsContainers.forEach(container => container.remove());
  };

  try {
    const totalReviews = await youcanjs.product.fetchReviews(productId).data();

    generalReviewsContainers.forEach(container => container.style.display = 'block');
    generalReviewsWrappers.forEach(wrapper => wrapper.innerHTML = `
      <li class='rating-stars'>
        <div class="yc-reviews-stars" style="--rating: ${averageRating};" aria-label="Rating of this product is ${averageRating} out of 5" role="img"></div>
      </li>
      <li class='general-count'>
        (${totalReviews?.length} ${ratings})
      </li>
    `);

    if(reviewButton) {
      reviewButton.style.display = 'block';
    }
  } catch (error) {
    noDataSetter();
  }
};
