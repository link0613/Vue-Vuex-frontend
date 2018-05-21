import Vue from 'vue';
import axios from 'axios';
import fecha from 'fecha';
import * as Clipboard from 'clipboard';

import spinner from '../shared/components/spinner';
import AffiliateDashboard from './components/affiliate-dashboard';
import { parseHashString } from '../shared/utils';
import { modal } from 'vue-strap';
import VueYouTubeEmbed from 'vue-youtube-embed';

Vue.use(VueYouTubeEmbed);

import storeInstance from '../frontend/store';


const ITEMS_ON_PAGE = 10;

const accountAffiliateApp = new Vue({
    components: {
        spinner,
        AffiliateDashboard,
        modal
    },
    data: {
        sharedState: storeInstance.state,

        mode: null,

        itemsLoading: false,
        items: [],

        totalResults: 0,
        currentPage: 1,
        gotoPage: 1,
        pages: [1],
        processingTab: true,
        minPreloaderDuration: 400,

        videoModal: {
            videoId: 'kITwq2TSMiM',
            player: null,
            show: false
        }
    },
    mounted: function() {
        window.addEventListener('hashchange', this.onHashChange.bind(this));
        this.onHashChange();

        setTimeout(() => {
            this.processingTab = false;
        }, this.minPreloaderDuration);
    },
    methods: {
        onHashChange: function() {
            let qs = parseHashString();
            this.setMode(qs.tab ? qs.tab : 'dashboard');
        },
        setMode(mode) {
            if (this.mode === mode) {
                return;
            }

            this.processingTab = true;
            this.mode = mode;

            this.items = [];
            this.totalResults = 0;
            this.currentPage = 1;
            this.gotoPage = 1;
            this.pages = [1];

            if (mode === 'referrals') {
                this.fetchAffiliates();
            } else if (mode === 'links') {
                this.fetchLinks();
            } else if (mode === 'share') {
                ['#copy-button-static-1', '#copy-button-static-2', '#copy-button-static-3'].forEach(el => new Clipboard.default(el));
                setTimeout(() => this.processingTab = false, 0);
            } else {
                setTimeout(() => {
                    this.processingTab = false;
                }, this.minPreloaderDuration);
            }
        },
        fetchAffiliates: function(page = 1) {
            let params = {
                limit: ITEMS_ON_PAGE,
                offset: (page - 1) * ITEMS_ON_PAGE
            };

            this.itemsLoading = true;
            const processStartAt = new Date();

            axios.get('/api/account/affiliates', { params: params }).then(resp => {
                this.itemsLoading = false;
                const processDuration = new Date() - processStartAt;
                const timeout = processDuration < this.minPreloaderDuration ? this.minPreloaderDuration - processDuration : 0;
                setTimeout(() => this.processingTab = false, timeout);

                this.items = resp.data.data.map(user => {
                    user._registered_on_date_display = user.registered_on ? fecha.format(new Date(user.registered_on), 'MMM D, YYYY') : '-';
                    return user;
                });

                this.totalResults = resp.data.meta.total;
                this.doBuildPagination();
            });
        },
        fetchLinks: function(page = 1) {
            let params = {
                limit: ITEMS_ON_PAGE,
                offset: (page - 1) * ITEMS_ON_PAGE
            };

            this.itemsLoading = true;
            const processStartAt = new Date();

            axios.get('/api/account/affiliates/links', { params: params }).then(resp => {
                this.itemsLoading = false;
                const processDuration = new Date() - processStartAt;
                const timeout = processDuration < this.minPreloaderDuration ? this.minPreloaderDuration - processDuration : 0;
                setTimeout(() => this.processingTab = false, timeout);

                this.items = resp.data.data.map(link => {
                    link._urls = {};

                    ['facebook', 'googleplus', 'linkedin', 'twitter'].forEach(platform => {
                        link._urls[platform] = storeInstance.urlFor('affiliate_link_share', [link.unique_url_id, platform]);
                    });

                    new Clipboard.default('#copy-button-' + link.id);

                    return link;
                });

                this.totalResults = resp.data.meta.total;
                this.doBuildPagination();
            });
        },
        doBuildPagination: function() {
            let totalPages = Math.ceil(this.totalResults / ITEMS_ON_PAGE),
                startingPage = this.currentPage < 3 ? 1 : this.currentPage - 2,
                newPages = [];

            for (let i = 0; i < 5; i++) {
                if (startingPage + i > totalPages) {
                    break;
                }

                newPages.push(startingPage + i);
            }

            this.pages = newPages;
        },
        handlePageSelect: function(page) {
            if (Math.ceil(this.totalResults / ITEMS_ON_PAGE) < page || page < 1) {
                this.gotoPage = this.currentPage;
                return;
            }

            this.currentPage = page;
            this.gotoPage = page;
            this.fetchAffiliates(page);
        },
        openSocialWindow: function(url) {
            window.open(url, 'modal', 'location=yes,width=600,height=600,modal=yes,resizable=yes');
        },
        playerReady(player) {
            this.videoModal.player = player;
            this.videoModal.player.a.height = "100%";
            this.videoModal.player.a.width = "100%";
        },
        playerStop () {
            this.videoModal.player.stopVideo()
        },
        videoModalOpen() {
            this.videoModal.show = true;
        },
        videoModalHide() {
            this.playerStop();
            this.videoModal.show = false;
        },
    }
});


export default accountAffiliateApp;
