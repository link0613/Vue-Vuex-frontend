import Vue from 'vue';
import fecha from 'fecha';
import axios from 'axios';

import storeInstance from './store';


const accountUnsubscribeApp = new Vue({
    data: {
        sharedState: storeInstance.state,

    },
    methods: {
        HandleResubscribe() {

        }
    }
});


export default accountUnsubscribeApp;