import Vue from 'vue';
import axios from 'axios';
import fecha from 'fecha';

import storeInstance from '../frontend/store';

window.getCookie = function(name) {
    var match = document.cookie.match(new RegExp(name + '=([^;]+)'));
    if (match) return match[1];
};
window.setCookie = function(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

const noticeApp = new Vue({
    data: {
        hide: false
    },
    computed: {
        hideNotice() {
            return !!window.getCookie('hide-invite-noticer');
        }
    },
    methods: {
        closeNotice() {
            setCookie('hide-invite-noticer', true, 365*1000 );
            this.hide = true;
        },
        openInvitePage() {
            location.href = location.protocol + "//" + location.host + "/invite";
        }
    }
});

export default noticeApp;