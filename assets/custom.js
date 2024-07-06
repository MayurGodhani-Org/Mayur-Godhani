class QuickView extends HTMLElement {
  constructor() {
    super();

    this.toggle = this.querySelector('.quick-view__toggle');
    this.toggle?.addEventListener('click', this.renderInfo.bind(this));

    this.close = this.querySelector('.quick-view__modal-close');
    this.close?.addEventListener('click', this.closeModal.bind(this));

    this.modal = this.querySelector('.quick-view__modal-wrapper');
    this.modalContent = this.querySelector('.quick-view__modal-content');
    
    this.skeleton = this.querySelector('.quick-view__skeleton');
  }

  openModal() {
    document.body.classList.add('quick-view--opened');
    this.modal.classList.add('open');
  }

  closeModal() {
    document.body.classList.remove('quick-view--opened');
    this.modal.classList.remove('open');

    this.modalContent.innerHTML = '';
    this.skeleton.classList.remove('hidden');
  }

  renderInfo() {
    this.openModal();

    fetch(`${this.modal.dataset.url}?section_id=main-quick-view`)
      .then(response => response.text())
      .then(responseText => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');

        this.modalContent.innerHTML = html.querySelector('.quick-view__modal-content').innerHTML;
        this.skeleton.classList.add('hidden');
      })
      .catch((error) => {
        console.log('error', error);
      });
  }
}

customElements.define('quick-view', QuickView);

class QuickVariantSelects extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener('change', (event) => {
      const variant = this.getCurrentVariant();

      if (variant) {
        this.updateButton(variant);
        this.updatePrice(variant);
      }
      
      this.hideError(event);
    });

    this.selects = this.querySelectorAll('.quick-view__option-select');
    this.selects.forEach((select) => {
      const selectLabel = select.querySelector('.quick-view__option-select-label');
      selectLabel?.addEventListener('click', () => {
        select.classList.toggle('open');
      });

      const selectOptions = select.querySelectorAll('.quick-view__options-input');
      selectOptions.forEach((option) => {
        option.addEventListener('click', () => {
          select.classList.remove('open');
          
          selectLabel.classList.add('center');
          selectLabel.textContent = option.value;
        });
      });
    });
  }

  getSelectedOptions() {
    this.options =  Array.from(this.querySelectorAll('input:checked')).map((input) => input.value);
  }

  getCurrentVariant() {
    this.getSelectedOptions();
    
    const variantsData = JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return variantsData.find((variant) => variant.options.every((option, index) => this.options && this.options[index] == option));
  }

  updatePrice(variant) {
    const price = document.getElementById(`Price-${this.dataset.section}`);
    if (!price) return;
    
    price.innerHTML = `<span>${Shopify.formatMoney(variant.price, Shopify.money_format)}</span>
                       ${(variant.compare_at_price > variant.price) ? `<s>${Shopify.formatMoney(variant.compare_at_price, Shopify.money_format)}</s>` : ''}`;
  }

  updateButton(variant) {
    const button = document.getElementById(`QuickAdd-${this.dataset.section}`);
    if (!button) return;

    button.disabled = !variant.available;
    button.querySelector('.text').textContent = variant.available ? window.variantStrings.addToCart : window.variantStrings.soldOut;
  }

  validateOptions() {
    const options = this.querySelectorAll('.quick-view__product-option');
    options.forEach((option) => {
      const inputChecked = option.querySelectorAll('input:checked');
      if (inputChecked.length) return;

      const error = option.querySelector('.quick-view__option-error');
      if (error) error.classList.remove('hidden');
    });
  }

  hideError(event) {
    const option = event.target.closest('.quick-view__product-option');
    setTimeout(() =>{ option?.classList.remove('not-selected') }, 300);
    
    const error = option?.querySelector('.quick-view__option-error');
    if (error) error.classList.add('hidden');
  }
}

customElements.define('quick-variant-selects', QuickVariantSelects);

class QuickProductForm extends HTMLElement {
  constructor() {
    super();

    this.addButton = this.querySelector('.quick-view__form-addcart')
    this.addButton?.addEventListener('click', this.onAddCartClicked.bind(this));

    this.variantSelects = this.querySelector('quick-variant-selects');
  }

  onAddCartClicked() {
    const variant = this.variantSelects.getCurrentVariant();

    if (!variant) {
      this.variantSelects.validateOptions();
      return;
    }

    this.addButton.classList.add('loading');
    this.addButton.setAttribute('disabled', true);

    const items = [{
        'id': variant.id,
        'quantity': 1
      }];

    const enableFreeGift = variant.options.every((option) => window.gift_options.includes(option));
    const freeGiftDataEle = document.getElementById('FreeGiftProduct');
    
    if (enableFreeGift && freeGiftDataEle) {
      const freeGiftData = JSON.parse(freeGiftDataEle.textContent);
      const freeGift = freeGiftData.find((freeGiftVariant) => freeGiftVariant.options.every((option, index) => variant.options && variant.options[index] == option)) || freeGiftData[0];
      
      if (freeGift && freeGift.id !== variant.id) items.push({ 'id': freeGift.id, 'quantity': 1 })
    }
    
    fetch(window.Shopify.routes.root + 'cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 'items': items })
    })
    .then(response => response.json())
    .then(response => {
      this.addButton.classList.remove('loading');
      this.addButton.removeAttribute('disabled');

      if (response.status) {
        const error = this.querySelector('.quick-view__form-error');
        if (error) {
          error.textContent = response.description;
          setTimeout(() => { error.textContent = '' }, 3000);
        }
      } else {
        window.location = '/cart';
      }
    })
    .catch((error) => {
      console.error('Error:', error);

      this.addButton.classList.remove('loading');
      this.addButton.removeAttribute('disabled');
    });
  }
}

customElements.define('quick-product-form', QuickProductForm);

const menuDrawer = document.getElementById('MenuDrawer'),
      menuDrawerToggle = document.querySelector('.menu-drawer__toggle');

menuDrawerToggle?.addEventListener('click', () => {
  menuDrawerToggle.classList.toggle('active');
  document.body.classList.toggle('menu-drawer--opened');
});