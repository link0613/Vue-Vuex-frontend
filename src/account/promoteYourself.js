import Vue from 'vue';
import * as Clipboard from 'clipboard';
import axios from 'axios';
import fecha from 'fecha';
import { modal } from 'vue-strap';
import VueYouTubeEmbed from 'vue-youtube-embed';

import storeInstance from '../frontend/store';

Vue.use(VueYouTubeEmbed);

const accountPromoteYourselfApp = new Vue({
    components: {
        modal
    },
    data: {
        sharedState: storeInstance.state,

        mode: 'webget_badge',
        // mode: 'email_signature',
        linkTab: 'linkedin',

        widgetEmail: {
            name: '',
            title: '',
            phone: '',
            mobile: '',
            mobileTemp: '',
            address: '',
            email: '',
            html: '',
            avatarType: 3,
            avatarStyles: '',
            avatarDummyStyles: '',
            widgetType: 1,
            showAvatar: true,
            codeShow: false,
        },

        widgetBadge: {
            html: ''
        },

        username: '',

        videoModal: {
            videoId: 'kITwq2TSMiM',
            player: null,
            show: false
        }
    },
    computed: {
        avatarType() {
            return "avatar-type-" + this.widgetEmail.avatarType;
        },
        profileLink() {
            return "https://jobdone.net/freelancer/" + this.sharedState.user.username + ".html";
        }
    },
    mounted() {
        this.widgetBadge.html = "<div id=\"jobdone-widget\"></div>\n" +
            "<script src=\"https://jobdone.net/freelancer/" + this.sharedState.user.username + "/widget.js\"></script>";

        this.widgetEmail.name = this.sharedState.user.username;
        this.widgetEmail.email = this.$refs.userEmail.value;
        this.widgetEmail.title = this.$refs.userHeadline.value;

        new Clipboard.default('#copy-badge-code');
        new Clipboard.default('#copy-affiliate-link');
        new Clipboard.default('#copy-profile-link');
        new Clipboard.default('#copy-email-html');
    },
    updated() {
        this.updateWidgetEmailCode();
    },
    methods: {
        setMode(mode) {
            if (this.mode === mode) return;
            this.mode = mode;
        },
        setLinkTab(tab) {
            if (this.linkTab === tab) return;
            this.linkTab = tab;
        },
        phoneKeyUp() {
            if (!this.widgetEmail.mobile) {
                this.widgetEmail.mobileTemp = this.widgetEmail.phone;
            }
        },
        mobileKeyUp() {
            this.widgetEmail.mobile = this.widgetEmail.mobileTemp;
        },
        setAvatarType(type) {
            var widgetEmailAvatar_addedStyle = "",
                widgetEmailAvatarDummy_addedStyle = "";

            this.widgetEmail.showAvatar = true;

            switch (type) {
                case 0: {
                    widgetEmailAvatar_addedStyle = "display:none;";
                    this.widgetEmail.showAvatar = false;
                    break;
                }
                case 1: {
                    widgetEmailAvatar_addedStyle = "border-radius: 50%;";
                    widgetEmailAvatarDummy_addedStyle = "border-radius: 50%;";
                    break;
                }
                case 2: {
                    widgetEmailAvatar_addedStyle = "border-radius:5px;";
                    widgetEmailAvatarDummy_addedStyle = "border-radius:5px;";
                    break;
                }
                case 3: {
                    widgetEmailAvatar_addedStyle = "border-radius:0;";
                    widgetEmailAvatarDummy_addedStyle = "border-radius:0;";
                    break;
                }
            }

            // add this hack because styles bugged when change border-radius from % to px and back
            this.widgetEmail.avatarStyles = "border-radius:0;";
            this.widgetEmail.avatarDummyStyles = "border-radius:0;";
            setTimeout(() => {
                this.widgetEmail.avatarStyles = widgetEmailAvatar_addedStyle;
                this.widgetEmail.avatarDummyStyles = widgetEmailAvatarDummy_addedStyle;
            }, 10);

            this.updateWidgetEmailCode();
            this.widgetEmail.avatarType = type;
        },
        videoModalOpen() {
            this.videoModal.show = true;
        },
        videoModalHide() {
            this.playerStop();
            this.videoModal.show = false;
        },
        updateWidgetEmailCode() {
            if(this.$refs.widgetEmailPreview) {
                this.widgetEmail.html = this.$refs.widgetEmailPreview.innerHTML;
            }
        },
        playerReady(player) {
            this.videoModal.player = player;
            this.videoModal.player.a.height = "100%";
            this.videoModal.player.a.width = "100%";
        },
        playerStop () {
            this.videoModal.player.stopVideo()
        },
        widgetEmailCodeShow() {
            this.widgetEmail.codeShow = !this.widgetEmail.codeShow;
        },
    }
});


export default accountPromoteYourselfApp;