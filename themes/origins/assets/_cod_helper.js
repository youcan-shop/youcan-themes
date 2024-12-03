/* --------------------------- */
/* ----- countdown timer ----- */
/* --------------------------- */

/**
 * addZero function, adds a zero in front of a number if it's less than 10
 * @param {number} x - number to be checked
 * @returns {string} - number with a zero in front if it's less than 10
 */
const addZero = (x) => {
  if (x < 10 && x >= 0) {
    return `0${x}`;
  }

  return x;
}

/**
 * $ function, a shorthand for document.querySelector
 * countdown function, takes a target element and sets the countdown timer
 * @param {*} target
 */
const $ = elem => document.querySelector(elem);

/**
 * mountSlider function, mounts a slider based on the screen size
 * @param {MediaQueryList} isMobile - media query list representing mobile screen size
 * @param {Object} mobileSlider - object representing the mobile slider
 * @param {Object} desktopSlider - object representing the desktop slider
 */
function mountSlider(isMobile, mobileSlider, desktopSlider) {
  let isMobileSliderMounted = false;
  let isDesktopSliderMounted = false;

  const runSlider = () => {
    try {
      if (isMobile.matches && !isMobileSliderMounted) {
        window.requestAnimationFrame(() => {
          mobileSlider.mount();
          isMobileSliderMounted = true;
        });

        return;
      }
      if (!isDesktopSliderMounted) {
        window.requestAnimationFrame(() => {
          desktopSlider.mount();
          isDesktopSliderMounted = true;
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  runSlider();
  isMobile.addEventListener('change', runSlider, { passive: true });
}

/**
 * If the value is float fix the decimal in tow digits
 * @param {string | number} value
 * @returns {number} formated value
 */
function isFloat(value) {
  if (isNaN(value)) {
    return 0;
  }

  const numericValue = Number(value);

  if (Number.isInteger(numericValue)) {
    return numericValue.toFixed(0);
  }

  return numericValue.toFixed(2);
}
