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

  await submitAnswer(event, upsellParams);
});

function loadingButton(event, loading) {
  const yesButton = document.querySelector(".upsell-submit-yes");
  const noButton = document.querySelector(".upsell-submit-no");
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

async function submitAnswer(event, upsellParams) {
  loadingButton(event, true);
  try {
    const response = await youcanjs.upsell.answer(upsellParams);

    if (response.error) throw new Error(response.error);

    window.location.reload(); // reload the page if success;
  } catch (error) {
    loadingButton(event, false);
    notify(error, 'error');
  } finally {
    loadingButton(event, false);
  }
}
