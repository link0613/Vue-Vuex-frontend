import Vue from 'vue';
import axios from 'axios';
import * as Clipboard from 'clipboard';

import storeInstance from '../frontend/store';
import spinner from '../shared/components/spinner';


const MAX_ALLOWED_INVITATIONS = 50;

const accountEndorseApp = new Vue({
    components: {
        spinner
    },
    data: {
        sharedState: storeInstance.state,

        text: 'My future is in your hands.\n\nCan you help me out?\n\nI’m trying to build my profile and win more work on jobdone.net, so every recommendation matters. Your endorsement would help me climb the ranks faster -- can you spare a minute?\n\nThanks in advance!',

        endorseEmail: '',
        endorseLoading: false,
        endorseError: null,
        endorseSuccess: null,

        tabDefault: 'email',
        tabSelected: '',

    },
    mounted() {
        new Clipboard.default('#copy-endorse-link');

        this.tabSelected = this.tabSelected ? this.tabSelected : this.tabDefault;
    },
    methods: {
        handleEndorseClick() {
            this.endorseLoading = true;
            this.endorseError = null;
            this.endorseSuccess = null;
            axios.post('/api/account/endorse', { email: this.endorseEmail, text: this.text }).then(resp => {
                this.endorseLoading = false;
                this.endorseSuccess = 'Request has been sent to ' + this.endorseEmail
                this.endorseEmail = '';
            }).catch(err => {
                if (err.response.data && err.response.data.error) {
                    this.endorseError = err.response.data.error.message;
                } else {
                    this.endorseError = 'Something wrong has just happened. We already notified about this issue, and kindly ask you try this operation again a little later';
                }

                this.endorseLoading = false;
            });
        },

        openSocialWindow(url) {
            window.open(url, 'modal', 'location=yes,width=600,height=600,modal=yes,resizable=yes');
        },
        tabClick(t) {
            this.tabSelected = t;
        }
    }
});


export default accountEndorseApp;
