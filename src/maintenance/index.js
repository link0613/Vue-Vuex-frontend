import Vue from 'vue';
import axios from 'axios';

import spinner from '../shared/components/spinner';

import './index.scss';


// Add custom header to every XHR request
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';


new Vue({
    el: '#app',
    data: {
        isLoading: false,

        emailToday: {
            loading: false,
            error: null,
            data: []
        },

        emailFailed: {
            loading: false,
            error: null,
            data: []
        }
    },
    mounted() {
        this.emailFailedLoad();
    },
    methods: {
        emailTodayLoad() {
            this.emailToday.loading = true;
            this.emailToday.error = null;
            axios.get('/admin/maintenance/api/email_today').then(resp => {
                this.emailToday.loading = false;
                this.emailToday.data = resp.data.data;
            }).catch(err => {
                this.emailToday.loading = false;
                this.emailToday.error = 'Error loading data';
            });
        },
        emailFailedLoad() {
            this.emailFailed.loading = true;
            this.emailFailed.error = null;
            axios.get('/admin/maintenance/api/email_failed').then(resp => {
                this.emailFailed.loading = false;
                this.emailFailed.data = resp.data.data;
            }).catch(err => {
                this.emailFailed.loading = false;
                this.emailFailed.error = 'Error loading data';
            });
        }
    }
});
