import Vue from 'vue';
import { modal } from 'vue-strap';
import axios from 'axios';

import Spinner from './spinner';
import storeInstance from '../../frontend/store';


let stripe, stripeElements, stripeCardNumber, stripeCardCvc, stripeCardExpiry;

const stripeElementsStyles = {
    base: {
        color: '#a3a3a3',
        fontWeight: 600,
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: '16px',
        padding: '1em',
        fontSmoothing: 'antialiased',
        ':focus': { color: '#424770' },
        '::placeholder': { color: '#9BACC8' },
        ':focus::placeholder': { color: '#CFD7DF' }
    },
    invalid: {
        color: '#a3a3a3',
        ':focus': { color: '#FA755A' },
        '::placeholder': { color: '#FFCCA5' }
    }
};
const stripeElementsClasses = {
    focus: 'focus',
    empty: 'empty',
    invalid: 'invalid'
};

export default Vue.component('depositCardModal', {
    components: {
        modal,
        Spinner
    },

    data() {
        return {
            sharedState: storeInstance.state,
            showModal: false,
            // amount: '',
            error: null,
            loading: false,
            success: false,

            selectedCard: null,
            cards: [],
            cardsLoading: true,
            //cardEmail: '',
            rememberNewCard: false,
            newCardError: null,
            newCardComplete: false
        };
    },

    props: ['show', 'amount'],

    watch: {
      show(val) {
        this.showModal = val;
      },

      showModal(val) {
        if (!val) {
          this.$emit('close');
        }
      }
    },

    mounted() {
        stripe = Stripe(this.sharedState.extra.stripe_key);
        stripeElements = stripe.elements();

        stripeCardNumber = stripeElements.create('cardNumber', {
            style: stripeElementsStyles,
            classes: stripeElementsClasses
        });

        stripeCardCvc = stripeElements.create('cardCvc', {
            style: stripeElementsStyles,
            classes: stripeElementsClasses
        });

        stripeCardExpiry = stripeElements.create('cardExpiry', {
            style: stripeElementsStyles,
            classes: stripeElementsClasses
        });

        stripeCardNumber.mount(this.$refs.stripeCardNumberElement);
        stripeCardCvc.mount(this.$refs.stripeCardCvcElement);
        stripeCardExpiry.mount(this.$refs.stripeCardExpiryElement);

        stripeCardNumber.addEventListener('change', evt => {
            this.newCardError = evt.error ? evt.error.message : null;
            this.newCardComplete = !!evt.complete;
        });

        let elementsCompleted = [false, false, false];

        [stripeCardNumber, stripeCardCvc, stripeCardExpiry].forEach((element, idx) => {
            element.on('change', evt => {
                // this.cardError = evt.error ? evt.error.message : null;
                elementsCompleted[idx] = evt.complete;
                this.newCardComplete = elementsCompleted.every(item => item);
            });
        });

        axios.get('/api/account/balance/deposit/card/cards').then(resp => {
            this.cards = resp.data;
            this.cardsLoading = false;

            if (!resp.data.length) {
                this.selectedCard = 'new';
            } else if (resp.data.length === 1) {
                this.selectedCard = resp.data[0].id;
            }
        });
    },

    methods: {
        handleDepositCardProcess() {
            if (this.selectedCard === 'new' && this.newCardError) {
                this.error = this.newCardError;
                return;
            }

            if (isNaN(this.amount) || +this.amount < 1 || this.amount > 25) {
                this.error = 'Please enter correct amount';
            }

            this.error = null;
            this.loading = true;

            let fnSendRequest = (stripeSource, existing) => {
                let data = {
                    amount: this.amount,
                    remember: this.rememberNewCard,
                    stripeSource: stripeSource,
                    existing: !!existing
                };

                axios.post('/api/account/balance/deposit/card', data).then(res => {
                    this.$emit('success');
                    this.$emit('close');
                    this.success = true;
                    this.loading = false;
                }).catch(err => {
                    this.loading = false;

                    if (err.response.data.error && err.response.data.error.message) {
                        this.error = err.response.data.error.message;
                    } else {
                        this.error = 'Something wrong has just happened. We already notified about this issue, and kindly ask you try this operation again a little later';
                    }
                });
            };

            if (this.selectedCard === 'new') {
                stripe.createSource(stripeCardNumber).then(result => {
                    if (result.error) {
                        // Inform the user if there was an error
                        this.loading = false;
                        this.error = result.error.message;
                        return;
                    }

                    fnSendRequest(result.source.id);
                });
            } else {
                fnSendRequest(this.selectedCard, true);
            }
        },
    },

    template: `
        <modal effect="fade" v-model="showModal" class="modal-custom modal-creditcard" v-cloak>
        <div slot="modal-header" class="modal-header">
          <button type="button" class="close" :disabled="loading" @click="showModal = false"><span>&times;</span></button>
          <h4 class="modal-title">Pay using a credit card</h4>
        </div>
        <div slot="modal-body" class="modal-body">
          <div class="request-form" v-if="!success">
            <ul class="card-selection" v-if="!cardsLoading">
              <li v-for="card in cards">
                <label><input type="radio" v-model="selectedCard" :value="card.id" /> <span v-text="card.name"></span></label>
              </li>
              <li v-if="cards.length">
                <label><input type="radio" v-model="selectedCard" value="new" /> Use New Card</span></label>
              </li>
            </ul>
            <Spinner v-else></Spinner>

            <div class="submit-order">
              <div class="submit-credit-card">
                <div class="submit-payment-section">
                  <div class="field field-card" v-show="selectedCard === 'new'">
                    <div class="flex" >
                      <div class="width-7 padding1em">
                        <h6>Card Number</h6>
                        <div ref="stripeCardNumberElement"></div>
                      </div>
                      <div class="width-3 padding1em">
                        <h6>CVC</h6>
                        <div ref="stripeCardCvcElement"></div>
                      </div>
                    </div>
                    <div class="flex" >
                      <div class="width-5 padding1em">
                        <h6>Expires</h6>
                        <div ref="stripeCardExpiryElement">
                        </div>
                      </div>
                      <div class="width-5 padding1em flex flex-column">
                        <h6>Use this card for future orders</h6>
                        <div class="radio">
                          <input id="radio-3" name="radio" type="checkbox" v-model="rememberNewCard">
                          <label for="radio-3" class="radio-label">
                            <div>Yes, save this card</div>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div class="flex">
                      <div class="width-5 padding1em">
                        <h5>Purchase amount</h5>
                        <div class="flex deposit">
                          <input v-model="amount" type="text" placeholder="0.00" readonly>
                          <span>USD</span>
                        </div>
                      </div>
                      <div class="width-5 padding1em">
                        <div class="flex icons">
                          <div class="icons-container">
                            <div class="icon icon-visa"></div>
                            <div class="icon icon-amer-express"></div>
                            <div class="icon icon-master-card"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-show="selectedCard !== 'new'">
                      <div class="flex">
                          <div class="width-5 padding1em">
                            <h5>Purchase amount</h5>
                            <div class="flex deposit">
                              <input v-model="amount" type="text" placeholder="0.00" readonly>
                              <span>USD</span>
                            </div>
                          </div>
                          <div class="width-5 padding1em">
                            <div class="flex icons">
                              <div class="icons-container">
                                <div class="icon icon-visa"></div>
                                <div class="icon icon-amer-express"></div>
                                <div class="icon icon-master-card"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="text-danger" v-if="error" v-text="error"></div>
          </div>
        </div>
        <div slot="modal-footer" class="modal-footer">
          <a v-if="!success" href="#" class="btn submit btn-primary" v-bind:disabled="loading || cardsLoading || !selectedCard" @click.prevent="handleDepositCardProcess">
            <svg class="icon icon-lock">
              <use xlink:href="/static/images/sprite.svg#lock"></use>
            </svg>
            <span>DEPOSIT</span>
          </a>
          <a v-else href="#" class="btn btn-success" disabled style="width: 300px; margin: 0 auto; display: block; color: #fff;">PAYMENT HAS BEEN DONE</a>
        </div>
      </modal>
    `
});
