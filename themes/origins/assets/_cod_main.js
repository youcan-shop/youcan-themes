/* ----- Store currency ----- */
const currencyCode = window.Dotshop.currency;

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
