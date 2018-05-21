import Promise from 'promise-polyfill';
import Vue from 'vue';
import axios from 'axios';
import Raven from 'raven-js';
import RavenVue from 'raven-js/plugins/vue';

import storeInstance from './store';
import messagingInstance from '../shared/messaging';
import headerApp from './header';
import mainApp from './main';
import jobsApp from './jobs';
import landingApp from './landing';
import productApp from './product';
import orderApp from './order';
import userApp from './user';
import becomeSellerApp from './becomeSeller';
import accountUnsubscribeApp from './unsubscribe';
import accountUnsubscribeSettingsApp from './unsubscribeSettings';
import noticeApp from './../account/notice';
import buyerRequestApp from './../projects/buyerRequest';
import spinner from '../shared/components/spinner';

import './style/index.scss';


// Installing Promise polyfill
if (!window.Promise) {
    window.Promise = Promise;
}

// Add custom header to every XHR request
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

if (window.SM_BOOTSTRAP_DATA) {
    storeInstance.bootstrap(window.SM_BOOTSTRAP_DATA);

    if (storeInstance.state.config.sentry) {
        // Install Raven

        let raven = Raven.config(
            storeInstance.state.config.sentry.dsn, { debug: true }
        ).addPlugin(RavenVue, Vue).install();

        window.onunhandledrejection = Promise._unhandledRejectionFn = function(evt) {
            Raven.captureException(evt.reason);
        };
    }

    if (storeInstance.state.user && storeInstance.state.config.messaging) {
        messagingInstance.init(storeInstance.state.config.messaging.server, storeInstance.state.user);
    }
}


headerApp.$mount('#sm-header');

if (document.getElementById('invite-noticer')) {
    noticeApp.$mount('#invite-noticer');
}

if (document.getElementById('sm-main')) {
    mainApp.$mount('#sm-main');
}
if (document.getElementById('sm-jobs')) {
    jobsApp.$mount('#sm-jobs');
}
if (document.getElementById('sm-buyer-request')) {
    buyerRequestApp.$mount('#sm-buyer-request');
}

if (document.getElementById('sm-landing')) {
    landingApp.$mount('#sm-landing');
}

if (document.getElementById('sm-product')) {
    productApp.$mount('#sm-product');
}

if (document.getElementById('sm-order')) {
    orderApp.$mount('#sm-order');
}

if (document.getElementById('sm-user')) {
    userApp.$mount('#sm-user');
}

if (document.getElementById('sm-become-seller')) {
    becomeSellerApp.$mount('#sm-become-seller');
}

if (document.getElementById('sm-account-unsubscribe')) {
    accountUnsubscribeApp.$mount('#sm-account-unsubscribe');
}

if (document.getElementById('sm-account-unsubscribe-settings')) {
    accountUnsubscribeSettingsApp.$mount('#sm-account-unsubscribe-settings');
}

if (document.getElementById('sm-cookies-notification')) {
    let cookieAccepted = null;
    try { cookieAccepted = localStorage['cookAcc']; } catch (e) {}

    if (!cookieAccepted) {
        cookieAccepted = /cookAcc=1/.test(document.cookie);
    }

    if (!cookieAccepted) {
        new Vue({
            el: '#sm-cookies-notification',
            data: { show: true },
            methods: {
                handleAccept: function() {
                    this.show = false;
                    try { localStorage['cookAcc'] = 1; } catch (e) {}
                    document.cookie = 'cookAcc=1; expires=Mon, 20 Mar 2034 13:00:00 UTC; path=/';
                }
            }
        });
    }
}

if (document.getElementById('sm-become-seller-landing')) {
    new Vue({
        el: '#sm-become-seller-landing',
        data: {
            faqOpened: {}
        },
        methods: {
            handleOpenSignupModal: function() {
                storeInstance.bus.$emit('header.openSignupModal');
            },
            handleOpenLoginModal: function() {
                storeInstance.bus.$emit('header.openLoginModal');
            }
        }
    });
}

if (document.getElementById('sm-affiliate-landing')) {
    new Vue({
        el: '#sm-affiliate-landing',
        data: {
            faqOpened: {}
        },
        methods: {
            handleOpenSignupModal: function() {
                storeInstance.bus.$emit('header.openSignupModal');
            },
            handleOpenLoginModal: function() {
                storeInstance.bus.$emit('header.openLoginModal');
            }
        }
    });
}

if (document.getElementById('sm-contact-us')) {
    new Vue({
        el: '#sm-contact-us',
        data: {
            reason: '',
            email: '',
            comments: '',
            loading: false,
            sent: false
        },
        methods: {
            handleSendClick: function() {
                this.loading = true;
                axios.post('/api/contact', { reason: this.reason, email: this.email, comments: this.comments }).then(res => {
                    this.loading = false;
                    this.sent = true;
                }).catch(err => {
                    this.loading = false;
                    // TODO
                });
            }
        }
    });
}

if (document.getElementById('sm-order-payment')) {
    new Vue({
        el: '#sm-order-payment',
        components: {
            spinner
        },
        data: {
            sharedState: storeInstance.state,

            error: null,
            success: null
        },
        mounted() {
            let fnCheckStatus = timeout => {
                this.checkStatus(() => setTimeout(fnCheckStatus.bind(this, timeout * 2), Math.min(timeout, 16000)));
            };

            fnCheckStatus(1000);
        },
        methods: {
            checkStatus(retryCallback) {
                axios.post(`/api/order/${this.sharedState.extra.service.id}/${this.sharedState.extra.order.id}/status`).then(res => {
                    if (res.data.is_pending) {
                        return retryCallback();
                    }

                    if (res.data.error) {
                        this.error = res.data.error;
                    }

                    if (res.data.success) {
                        this.success = 'Your payment is confirmed.';

                        if (storeInstance.state.user) {
                            location.href = res.data._url;
                        } else {
                            this.success += ' Please login to view your order';
                        }
                    }
                }).catch(err => {
                    retryCallback(err);
                });
            }
        }
    });
}

if (document.getElementById('sm-user-endorse')) {
    new Vue({
        el: '#sm-user-endorse',
        data: {
            sharedState: storeInstance.state,

            loading: false,
            error: null,
            success: null,

            text: '',

            selectedSkills: {}
        },
        methods: {
            handleEndorseClick() {
                if (this.success && !this.sharedState.user) {
                    // Reopen login window if user has suddenly closed it
                    storeInstance.bus.$emit('header.openLoginModal', { text: this.success });
                    return;
                }

                this.loading = true;
                this.error = this.success = null;
                axios.post('/api/endorse', { user_id: this.sharedState.extra.user.id, text: this.text }).then(resp => {
                    this.loading = false;

                    if (!this.sharedState.user) {
                        this.success = 'Thank you for your response, please login or signup in order to publish it';
                        storeInstance.bus.$emit('header.openLoginModal', { text: this.success });
                    } else {
                        this.success = 'Thank you for your response';
                    }
                }).catch(err => {
                    this.loading = false;

                    if (err.response.data && err.response.data.error) {
                        this.error = err.response.data.error.message;
                    } else {
                        this.error = 'Something wrong has just happened. We already notified about this issue, and kindly ask you try this operation again a little later';
                    }
                });
            },

            handleSkillSelect(idx) {
                if (this.selectedSkills[idx]) {
                    this.$delete(this.selectedSkills, idx);
                } else {
                    this.$set(this.selectedSkills, idx, true);
                }

                if (Object.keys(this.selectedSkills).length) {
                    let skills = Object.keys(this.selectedSkills).map(idx => this.sharedState.extra.user_skills[idx].title),
                        skillsText = skills[0];

                    if (skills.length > 1) {
                        skillsText = `${skillsText}${skills.slice(1, skills.length - 1).map(skill => `, ${skill}`).join('')} and ${skills[skills.length - 1]}.`
                    }

                    this.text = `I endorse ${this.sharedState.extra.user.username} for ${skillsText}`;
                }
            }
        }
    });
}
