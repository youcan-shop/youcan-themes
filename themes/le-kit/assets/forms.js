const MESSAGES = {
  en: {
    required: "Please fill out this field.",
    email: "Please enter a valid email address.",
    short: (/** @type {number} */ min) => `Please enter at least ${min} characters.`,
  },
  fr: {
    required: "Veuillez remplir ce champ.",
    email: "Veuillez entrer une adresse e-mail valide.",
    short: (/** @type {number} */ min) => `Veuillez entrer au moins ${min} caractères.`,
  },
  ar: {
    required: "يرجى ملء هذه الخانة.",
    email: "يرجى إدخال عنوان بريد إلكتروني صالح.",
    short: (/** @type {number} */ min) => `يرجى إدخال ما لا يقل عن ${min} حرفًا.`,
  },
};

const VALIDATED = "input[required], input[type='email'], textarea[required], select[required]";

/** @param {HTMLInputElement} input */
function setValidationMessage(input) {
  input.setCustomValidity("");
  const messages = MESSAGES[/** @type {keyof MESSAGES} */ (document.documentElement.lang)] ?? MESSAGES.en;

  if (input.validity.valueMissing) input.setCustomValidity(messages.required);
  else if (input.type === "email" && input.validity.typeMismatch) input.setCustomValidity(messages.email);
  else if (input.validity.tooShort) input.setCustomValidity(messages.short(input.minLength));
}

for (const type of ["invalid", "input"]) {
  document.addEventListener(
    type,
    (event) => {
      const target = /** @type {HTMLInputElement} */ (event.target);
      if (target.matches?.(VALIDATED)) setValidationMessage(target);
    },
    true,
  );
}

document.addEventListener("submit", (event) => {
  const button = /** @type {HTMLElement | null} */ (event.submitter?.closest("[data-confirm-message]") ?? null);
  if (button && !window.confirm(button.dataset.confirmMessage)) event.preventDefault();
});

document.addEventListener("change", (event) => {
  const select = /** @type {HTMLSelectElement} */ (event.target);
  if (!select.matches?.("[data-sort-select]")) return;

  const url = new URL(window.location.href);
  const [field, order] = select.value.split(":");

  [...url.searchParams.keys()].filter((key) => key.startsWith("page")).forEach((key) => url.searchParams.delete(key));

  if (field) {
    url.searchParams.set("sort_field", field);
    url.searchParams.set("sort_order", order);
  } else {
    url.searchParams.delete("sort_field");
    url.searchParams.delete("sort_order");
  }

  if (select.dataset.terms) url.searchParams.set("q", select.dataset.terms);
  window.location.href = url.toString();
});
