/**
 * Increment or Decrement custom quantity input
 */
function manipulateQuantity() {
  const decrementButton = $('.decrement-button');
  const incrementButton = $('.increment-button');
  const quantityInput = $('.quantity-input');
  const inventoryInput = $('#_inventory');

  /**
   * Decreases quantity value by 1 when decrement button is clicked
   */
  decrementButton?.addEventListener('click', () => {
    const currentValue = parseInt(quantityInput.value);
    if (currentValue > 1) {
      quantityInput.value = currentValue - 1;
    }
  });

  /**
   * Increases quantity value by 1 when increment button is clicked
   */
  incrementButton?.addEventListener('click', () => {
    const currentValue = parseInt(quantityInput.value);
    const inventory = parseInt(inventoryInput.value);

    if(Number.isFinite(inventory) && currentValue >= inventory) {
      return notify(ADD_TO_CART_EXPECTED_ERRORS.max_quantity + inventory, 'warning');
    }

    quantityInput.value = currentValue + 1;
  });

  /**
   * Check if the current value exceeds the max inventory
   */
  quantityInput?.addEventListener('input', () => {
    const maxInventoryValue = parseInt(inventoryInput.value);
    restrictInputValue(quantityInput, maxInventoryValue);
  });
}

manipulateQuantity();
