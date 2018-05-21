import Vue from 'vue';
import { modal } from 'vue-strap';
import VueFileUpload from 'vue-upload-component';
import axios from 'axios';

import spinner from '../shared/components/spinner';
import storeInstance from '../frontend/store';


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

const accountSettingsApp = new Vue({
    components: {
        modal,
        spinner
    },
    data: {
        sharedState: storeInstance.state,

        tab: 'main',

        isLoading: false,

        oldPassword: '',
        newPassword: '',
        newPassword2: '',
        passwordError: null,
        passwordSuccess: null,
        hideOldPassword: false,

        deleteAccountRequested: false,
        deleteAccountError: false,
        deleteAccountReason: '',
        deleteAccountNotes: '',
        deleteAccountLoading: false,
        deleteAccountModal: false,
        deleteAccountModalPassword: '',
        deleteAccountModalError: '',

        authCardModal: false,
        authCardModalError: '',
        authCardLoading: false,
        authCardRequested: false,

        settingsError: null,
        settingsSuccess: null,

        tz: '',
        profileFirstName: '',
        profileLastName: '',
        showAffiliateProgram: null,

        verificationLoading: false,
        verificationTotal: 0,
        verificationItems: [],

        verificationPhoneModal: {
            show: false,
            loading: false,
            error: null,
            success: false,
            step: 1,
            resend: false,

            phoneNumber: '',
            phoneNumberCountry: '-1',
            phoneNumberCode: '',
            phoneNumberValid: false
        },

        verificationCardModal: {
            show: false,
            loading: false,
            error: null,

            newCardError: null,
            newCardComplete: false
        }
    },
    mounted: function() {
        this.tab = this.sharedState.extra.tab;

        if (this.tab === 'main') {
            this.tz = this.sharedState.extra.tz;
            this.profileFirstName = this.sharedState.extra.profile_first_name;
            this.profileLastName = this.sharedState.extra.profile_last_name;
            this.hideOldPassword = this.sharedState.extra.empty_password;
            this.showAffiliateProgram = this.sharedState.extra.is_affiliate_panel_enabled;
        }

        if (this.tab === 'verification') {
            this.loadVerificationItems();

            this.$watch('verificationPhoneModal.phoneNumber', newPhoneNumber => {
                this.verificationPhoneModal.phoneNumberValid = (newPhoneNumber.length > 7 && /^\d+$/.test(newPhoneNumber)) && this.phoneNumberCountry !== '-1';
            });

            if(this.sharedState.extra.stripe_key) {


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
                    this.verificationCardModal.newCardError = evt.error ? evt.error.message : null;
                    this.verificationCardModal.newCardComplete = !!evt.complete;
                });

                let elementsCompleted = [false, false, false];

                [stripeCardNumber, stripeCardCvc, stripeCardExpiry].forEach((element, idx) => {
                    element.on('change', evt => {
                        // this.cardError = evt.error ? evt.error.message : null;
                        elementsCompleted[idx] = evt.complete;
                        this.verificationCardModal.newCardComplete = elementsCompleted.every(item => item);
                    });
                });
            }
        }

        window.SM_OAUTH_CALLBACK = (err, provider) => {
            if (!err) {
                this.loadVerificationItems();
                return;
            }
        };
    },
    methods: {
        handleChangePasswordClick: function() {
            if (this.isLoading) {
                return;
            }

            let data = {
                old_password: this.oldPassword,
                password: this.newPassword,
                password2: this.newPassword2
            };

            this.isLoading = true;
            this.passwordError = this.passwordSuccess = null;
            axios.post('/api/account/settings/password', data).then(res => {
                this.isLoading = false;
                this.passwordSuccess = true;
                this.oldPassword = this.newPassword = this.newPassword2 = '';
                this.hideOldPassword = false;
            }).catch(res => {
                this.isLoading = false;
                if (res.response.data && res.response.data.error) {
                    let fields = res.response.data.error.fields;
                    if (fields && fields.old_password) {
                        this.passwordError = 'Please check your current password';
                        return;
                    }

                    if (fields && fields.password) {
                        this.passwordError = 'Passwords should match';
                        return;
                    }
                }

                this.passwordError = 'We are unable to fulfill your request at the moment, please try again later'; // TODO
            });
        },
        handleChangeSettingsClick: function() {
            if (this.isLoading) {
                return;
            }

            let data = {
                tz: this.tz,
                profile_first_name: this.profileFirstName,
                profile_last_name: this.profileLastName,
                is_affiliate_panel_enabled: +this.showAffiliateProgram
            };

            this.isLoading = true;
            this.settingsError = this.settingsSuccess = null;
            axios.put('/api/account/settings', data).then(res => {
                this.isLoading = false;
                this.settingsSuccess = true;
            }).catch(res => {
                this.isLoading = false;

                if (res.response.data && res.response.data.error && res.response.data.error.message) {
                    this.settingsError = res.response.data.error.message;
                } else {
                    this.settingsError = 'We are unable to fulfill your request at the moment, please try again later';
                }
            });
        },
        handleDeleteAccountRequest: function() {
            this.deleteAccountLoading = true;
            this.deleteAccountRequested = true;

            axios.post('/api/account/settings/delete?verify=1').then(res => {
                this.deleteAccountLoading = false;
            }).catch(res => {
                this.deleteAccountLoading = false;
                this.deleteAccountError = (res.response.data.error && res.response.data.error.message) ? res.response.data.error.message : 'We are unable to fulfill your request at the moment, please try again later'; // TODO
            });
        },
        handleDeleteAccountClick: function() {
            this.deleteAccountModal = true;
            this.deleteAccountModalPassword = '';
        },
        handleDeleteAccount: function() {
            if (this.isLoading) {
                return;
            }

            let data = {
                reason: this.deleteAccountReason,
                notes: this.deleteAccountNotes,
                password: this.deleteAccountModalPassword
            };

            this.isLoading = true;
            axios.post('/api/account/settings/delete', data).then(res => {
                location.href = '/';
            }).catch(res => {
                this.isLoading = false;
                this.deleteAccountModalError = (res.response.data.error && res.response.data.error.message) ? res.response.data.error.message : 'We are unable to fulfill your request at the moment, please try again later'; // TODO
            });
        },

        handleVerificationConnect(url) {
            window.open(url, 'modal', 'location=yes,width=600,height=600,modal=yes,resizable=yes');
        },

        loadVerificationItems() {
            this.verificationLoading = true;
            axios.post('/api/account/settings/verification/calculate_score').then(resp => {
                this.verificationLoading = false;
                this.verificationTotal = resp.data.total;
                this.verificationItems = resp.data.items;
            });
        },

        handleVerifyPhone() {
            this.verificationPhoneModal = {
                show: true,
                loading: false,
                error: null,
                success: false,
                step: 1,
                resend: false,

                phoneNumber: '',
                phoneNumberCountry: '-1',
                phoneNumberCode: '',
                phoneNumberValid: false
            };
        },

        handleVerifyPhoneSubmit() {
            let countryCode = this.verificationPhoneModal.phoneNumberCountry.split(',')[1];

            if (!countryCode) {
                return;
            }

            let data = {
                phone_number: countryCode + this.verificationPhoneModal.phoneNumber
            };

            if (this.verificationPhoneModal.step === 3) {
                if (!this.verificationPhoneModal.phoneNumberCode) {
                    return;
                }

                data.code = this.verificationPhoneModal.phoneNumberCode;
            } else {
                this.verificationPhoneModal.step = 2;
            }

            this.verificationPhoneModal.loading = true;
            this.verificationPhoneModal.error = null;
            axios.post('/api/account/settings/phone_number', data).then(res => {
                this.verificationPhoneModal.loading = false;

                if (data.code) {
                    this.verificationPhoneModal.success = true;
                    this.verificationPhoneModal.show = false;
                    this.loadVerificationItems();
                } else {
                    this.verificationPhoneModal.step = 3;
                    setTimeout(() => {
                        if (!this.verificationPhoneModal.success) {
                            this.verificationPhoneModal.resend = true;
                        }
                    }, 120000);
                }
            }).catch(res => {
                this.verificationPhoneModal.loading = false;

                if (res.response.status === 400) {
                    if (data.code) {
                        this.verificationPhoneModal.error = 'Security code is incorrect';
                    } else {
                        this.verificationPhoneModal.step = 1;
                        this.verificationPhoneModal.error = 'Please check that you are entering correct phone number';
                    }
                } else if (res.response.status === 409) {
                    this.verificationPhoneModal.error = 'This phone number already bound to another account';
                } else if (res.response.status === 429) {
                    this.verificationPhoneModal.error = 'You are trying to request verification code too often. Please wait 1-2 minutes';
                } else {
                    this.verificationPhoneModal.step = 1;
                    this.verificationPhoneModal.error = 'We are unable to fulfill your request at the moment, please try again later';
                }
            });
        },

        handleAddCard() {

        },

        closeVerifyCardModal() {
            this.verificationCardModal.show = false;
        },

        handleVerifyCard() {
            this.verificationCardModal = {
                show: true,
                loading: false,
                error: null
            };
        },

        handleVerifyCardSubmit() {
            this.verificationCardModal.error = null;
            this.verificationCardModal.loading = true;

            let fnSendRequest = (stripeSource, existing) => {
                let data = {
                    stripeSource: stripeSource,
                    existing: !!existing
                };

                axios.post('/api/account/balance/deposit/card?auth=true', data).then(res => {
                    this.verificationCardModal.success = true;
                    this.verificationCardModal.loading = false;
                    this.verificationCardModal.show = false;

                    this.loadVerificationItems();
                }).catch(err => {
                    this.verificationCardModal.loading = false;

                    if (err.response.data.error && err.response.data.error.message) {
                        this.verificationCardModal.error = err.response.data.error.message;
                    } else {
                        this.verificationCardModal.error = 'Something wrong has just happened. We already notified about this issue, and kindly ask you try this operation again a little later';
                    }
                });
            };

            if(stripe) {
                stripe.createSource(stripeCardNumber).then(result => {
                    if (result.error) {
                        // Inform the user if there was an error
                        this.verificationCardModal.loading = false;
                        this.verificationCardModal.error = result.error.message;
                        return;
                    }

                    fnSendRequest(result.source.id);
                });
            }
        }
    }
});


export default accountSettingsApp;
