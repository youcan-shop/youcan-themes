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

  setButtonIsLoading(event);
  await submitAnswer(upsellParams);
});

function setButtonIsLoading(event) {
  const [yesButton, noButton] = document.querySelectorAll('[data-upsell-submit]');
  const buttonText = event.submitter.querySelector(".button-text");
  const spinnerLoader = event.submitter.querySelector(".spinner");

  yesButton.disabled = true;
  noButton.disabled = true;
  buttonText.style.display = 'none';
  spinnerLoader.style.display = 'inline-block';
}

async function submitAnswer(upsellParams) {
  try {
    await youcanjs.upsell.answer(upsellParams);

    window.location.reload();
  } catch (error) {
    window.location.href = "/checkout/thankyou";
  }
}
