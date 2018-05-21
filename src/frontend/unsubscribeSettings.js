import Vue from 'vue';
import fecha from 'fecha';
import axios from 'axios';

import storeInstance from './store';


const SUBSCRIPTIONS = [
    'new_users'
];


const accountUnsubscribeSettingsApp = new Vue({
    data: {
        sharedState: storeInstance.state,

        isLoading: false,
        error: false,
        success: false,

        subscriptions: {}
    },
    mounted() {
        let subscriptions = {};
        
        SUBSCRIPTIONS.forEach(id => {
            subscriptions[id] = !(id in this.sharedState.extra.disabled_subscriptions);
        });

        this.subscriptions = subscriptions;
    },
    methods: {
        handleSaveSettings() {
            let data = this.subscriptions;

            this.isLoading = true;
            this.error = this.success = null;
            axios.post(`/api/unsubscribe?uuid=${this.sharedState.extra.uuid}`, data).then(res => {
                this.isLoading = false;
                this.success = true;
            }).catch(res => {
                this.isLoading = false;
                this.error = 'We are unable to fulfill your request at the moment, please try again later';
            });
        }
    }
});


export default accountUnsubscribeSettingsApp;