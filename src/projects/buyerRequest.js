import Vue from 'vue';
import axios from 'axios';
import { parseQueryString } from '../shared/utils';
import { tooltip } from 'vue-strap';
import spinner from '../shared/components/spinner';
import rating from 'vue-rate-it';
import storeInstance from '../frontend/store';

const SERVICES_ON_PAGE = 15;
const SITE_FEE = 0.2;
const MIN_PRICE_BID = 30;
const MAX_PRICE_BID = 1000000;
const MIN_DAYS_DELIVERY = 1;
const MAX_DAYS_DELIVERY= 365;
const INPUT_PRICE_GET_ID = "input_price_get";
const INPUT_PRICE_BID_ID = "input_price_bid";
const INPUT_DAY_DELIVERY_ID = "input_day_delivery";


const buyerRequestApp = new Vue({
    components: {
        spinner,
        tooltip,
        'start-rating':rating.FaRating,
    },
    data: {
        /* COMMON VARIABLES */
        sharedState: storeInstance.state,
        
        isLoading: true,
        isisLoadingBids: false,
        disabledKeys: ['ArrowLeft', 'Home'],
        rectanbleIcon: "M1400 0 L1400 2000 L0 2000 L0 0Z",
        circleIcon: "M1664 896q0 209-103 385.5t-279.5 279.5-385.5 103-385.5-103-279.5-279.5-103-385.5 103-385.5 279.5-279.5 385.5-103 385.5 103 279.5 279.5 103 385.5z",
        starIcon: "M1728 647q0 22-26 48l-363 354 86 500q1 7 1 20 0 21-10.5 35.5t-30.5 14.5q-19 0-40-12l-449-236-449 236q-22 12-40 12-21 0-31.5-14.5t-10.5-35.5q0-6 2-20l86-500-364-354q-25-27-25-48 0-37 56-46l502-73 225-455q19-41 49-41t49 41l225 455 502 73q56 9 56 46z",
        minPreloaderDuration: 400,
        pricingError: false,
        deliveryError: false,
        isFavorite: false,
        placeBidBlock: false,
        
        /* BASIC BID VARIABLE */
        buyerID: null,
        priceBid: null,
        priceGet: null,
        priceFee: null,
        deliveryDays: null,
        skillSet: [],

        /* HTML ELEMENTS FOR BIDDING */
        inputPriceGetId: INPUT_PRICE_GET_ID,
        inputPriceBidId: INPUT_PRICE_BID_ID,
        inputDayDeliveryId: INPUT_DAY_DELIVERY_ID,

        /* STATUS OF YOUR BIDDING */
        placedBid: false,
        isPlacingBid: false,

        /* BIDS */
        bidList: [],
        bidPerPage: null,
        sortASC: true,
        bidListSort: [],
        isLoadingBids: false,
        loadMoreShow: null,

    },
    mounted: function() {
        const vm = this;
        vm.buyerID = document.getElementById('buyer_id').value;
        vm.isFavorite = document.getElementById('is_favorite').value;
        vm.bidPerPage = document.getElementById('bid_per_page').value;
        vm.skillSet = document.getElementById('buyer_skillset').value.split(",");
        vm.feeJobDone = SITE_FEE;
        vm.isLoading = false;
        vm.loadBids(this.buyerID)

        document.addEventListener ("click", function(e) {
            if (e.target.className !== "fa fa-close close") {
                vm.hideAllReports();
            }
        })
         
    },
    methods: {
        imgError(e) {
            e.target.className += " avatar-hide";
            var newNode = document.createElement('div');
            newNode.setAttribute("class", "avatar-dummy")
            newNode.innerHTML = e.target.getAttribute("username").slice(0, 1);
            e.target.parentNode.insertBefore(newNode, e.target.nextSibling);
        },

        keyMonitor: function (event) {
            if (this.disabledKeys.indexOf(event.key) >= 0) {
                event.preventDefault()
            }

            switch (event.target.id) {
                case INPUT_PRICE_GET_ID:
                    this.getPriceBid()
                    break;
                case INPUT_PRICE_BID_ID:
                    this.getPriceGet()
                    break;
                case INPUT_DAY_DELIVERY_ID:
                    // vailidation.
                    if (this.deliveryDays < MIN_DAYS_DELIVERY) {
                        this.deliveryError = true;
                    } else {
                        this.deliveryError = false;
                    }
                    break;
            }

        },

        toggleFavorite: function(buyerID) {
          const rm = this
          axios.post(`/api/favorite_buyer_request/${buyerID}/toggle`, {}).then(resp => {
            rm.isFavorite = !rm.isFavorite;
          });
        },

        getPriceBid: function () {
            this.pricingError = false;
            if (this.priceGet < MIN_PRICE_BID) {
                this.pricingError = true;
                return;
            }
            this.priceBid = this.round(this.priceGet * 1.0 / (1.0 - SITE_FEE), 1);
            this.priceFee = this.round(this.priceGet * SITE_FEE / (1.0 - SITE_FEE), 1);
        },

        getPriceGet: function () {
            this.pricingError = false;
            if (this.priceBid < MIN_PRICE_BID ) {
                this.pricingError = true;
                return;
            }
            this.priceGet = this.round(this.priceBid * (1.0 - SITE_FEE));
            this.priceFee = this.round(this.priceBid * SITE_FEE);
        },

        showPlaceBidBlock: function () {
            this.placeBidBlock = true;
        },
        
        placeBid: function (buyerID) {
           
            let validated = true;
            // validation for pricing
            console.log (this.placeBid)
            if (this.priceBid === null || this.placeBid < MIN_PRICE_BID || this.placeBid > MAX_PRICE_BID) {
                this.pricingError = true;
                validated = false;
            }
            // validation for delivery day input
            if (this.deliveryDays < MIN_DAYS_DELIVERY || this.deliveryDays > MAX_DAYS_DELIVERY) {
                this.deliveryError = true;
                validated = false;
            }             
            if (!validated) return;

            let params = {
                bidPrice: this.priceBid,
                feePrice: this.priceFee,
                getPrice: this.priceGet,
                deliveryDays: this.deliveryDays
            };
            
            this.isPlacingBid = true;
            axios.get(`/api/buyer_request/${buyerID}/bids.json`, { params: params }).then(resp => {
                this.placedBid = true;
                this.isPlacingBid = false;
            }).catch(err => {
                this.isPlacingBid = false;
            });
        },

        loadBids: function (buyerID) {
            const nextPage = Math.ceil(this.bidList.length / this.bidPerPage) + 1

            let params = {
                page: nextPage,
            };
            
            this.isLoadingBids = true;
            
            axios.get(`/api/buyer_request/${buyerID}/bids.json`, { params: params }).then(resp => {
                this.isLoadingBids = false;
                const vm = this;
                const bidsPage = Object.keys(resp.data.data).length;
                vm.loadMoreShow = bidsPage == parseInt(vm.bidPerPage)?true:false;
                Object.keys(resp.data.data).forEach(function (key) {
                    vm.bidList.push(resp.data.data[key])
                });
                this.updateBidListSort();
            }).catch(err => {
                console.log(err)
                this.isLoadingBids = false
            });
        },

        invertSort: function () {
            this.sortASC = !this.sortASC;
            this.updateBidListSort();
        },

        updateBidListSort: function () {
            this.bidListSort = this.bidList.slice();
            if (!this.sortASC) {
                this.bidListSort = this.bidListSort.reverse();
            }
        },
        /* we should implement it */
        reportAsAbuse: function (buyerID, freelancerID) {
            this.hideAllReports();
            console.log(freelancerID);
        },

        toggleReport: function (index) {
            const reportElement = document.getElementById('report_' + index);
            const reportElementStatus = reportElement.style.display;
            this.hideAllReports();
            document.getElementById('report_' + index).style.display = reportElementStatus=='none'?'block':'none';
        },
        
        hideAllReports: function () {
            const reportElements = document.getElementsByClassName('popover-report');
            for (let i = 0; i < reportElements.length; i++) {
                reportElements[i].style.display = 'none'
            }
        },

        round: function(number, precision) {
            return Math.round(number * 10.0) / 10.0
        },


     }
});





export default buyerRequestApp;
