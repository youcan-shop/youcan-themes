document.getElementById("upsell-form").addEventListener("submit", async function (event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const answer = event.submitter.value;

  const upsellParams = {
    upsell_id: formData.get("upsell_id"),
    answer: answer,
    order_id: formData.get("order_id"),
    product_offers: {}
  };

  formData.forEach((value, key) => {
    if (!["upsell_id", "order_id"].includes(key)) {
      upsellParams.product_offers[key] = value;
    }
  });

  setButtonIsLoading(event, true);
  await submitAnswer(upsellParams);
});

function setButtonIsLoading(event, loading) {
  const [yesButton, noButton] = document.querySelectorAll('[data-upsell-submit]');
  const buttonText = event.submitter.querySelector(".button-text");
  const spinnerLoader = event.submitter.querySelector(".spinner");

  if (loading) {
    yesButton.disabled = true;
    noButton.disabled = true;
    buttonText.style.display = 'none';
    spinnerLoader.style.display = 'inline-block';
  } else {
    yesButton.disabled = false;
    noButton.disabled = false;
    buttonText.style.display = 'inline';
    spinnerLoader.style.display = 'none';
  }
}

async function submitAnswer(upsellParams) {
  const response = await youcanjs.upsell.answer(upsellParams);

  if (response) {
    window.location.reload();
  }
}
