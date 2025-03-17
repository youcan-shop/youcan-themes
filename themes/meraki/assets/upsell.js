const yesButton = document.querySelector('[data-upsell-submit-yes]');
const noButton = document.querySelector('[data-upsell-submit-no]');

function loadingButton(event, loading) {
  const buttonText = event.target.querySelector('.button-text');
  const spinnerLoader = event.target.querySelector('.spinner');

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

async function submitAnswer(event, answer) {
  const productOffer = document.querySelector('[data-product-offer]');
  const upsellId = document.querySelector('[data-upsell-id]');
  const orderId = document.querySelector('[data-order-id]');
  const upsellParams = {
    upsell_id: upsellId?.dataset.upsellId,
    answer: answer,
    order_id: orderId?.dataset.orderId,
    product_offers: {
      [productOffer?.name]: productOffer?.value
    }
  };

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

yesButton?.addEventListener('click', (event) => { submitAnswer(event, 'yes'); });
noButton?.addEventListener('click', (event) => { submitAnswer(event, 'no'); });
