import Vue from 'vue';
import fecha from 'fecha';
import axios from 'axios';
import { modal } from 'vue-strap';
import VueFileUpload from 'vue-upload-component';
import spinner from '../shared/components/spinner';
import linkify from 'linkifyjs/string'

import storeInstance from '../frontend/store';
import messagingInstance from '../shared/messaging';
import { formatTimespanFromNow, formatDate, parseHashString, checkPatterns } from '../shared/utils';


const ITEMS_ON_PAGE = 5;

const subscribeCallbacks = {
    roomIncomingCallback: null
};

const accountInboxApp = new Vue({
    components: {
        modal,
        spinner,
        FileUpload: VueFileUpload
    },
    data: {
        sharedState: storeInstance.state,

        // inbox, unread, sent, archive
        folder: 'inbox',

        tabCounts: {
            unread: 0
        },

        currentRoom: null,
        currentRoomPeer: null,
        currentRoomOrder: null,
        currentRoomService: null,
        currentRoomMessages: [],
        currentRoomMessagesLoading: false,
        currentRoomNewMessage: '',
        currentRoomNewMessageLoading: false,
        currentRoomEnquiryRecorded: false,

        messageIncludedBlockWord: {
            pay: false,
            skype: false,
            phone: false,
            email: false
        },

        itemsLoading: false,
        items: [],
        itemsUnread: [],

        totalResults: 0,
        currentPage: 1,
        gotoPage: 1,
        pages: [1],

        selectedItems: {},

        attachError: null,
        attachUploading: false,
        attachUploads: [],
        attachUploadEvents: {},
        processingTab: true,
        minPreloaderDuration: 400,

        serviceOfferModal: initServiceOfferModal(),
        serviceOfferLoading: {},
        serviceOfferDisabled: {}
    },
    watch: {
        currentRoomNewMessage: function(str) {
            this.messageIncludedBlockWord = checkPatterns(str);
        }
    },
    mounted: function() {
        let messagingReadyInterval = setInterval(() => {
            if (messagingInstance.isAuthenticated) {
                clearInterval(messagingReadyInterval);

                this.fetchMeta();
                this.fetchItems();

                messagingInstance.subscribeToEnquryMessages(body => {
                    // if (body.user === this.sharedState.user.id) {
                    //     // Ignore messages sent by us
                    //     return;
                    // }

                    if (!this.currentRoom) {
                        this.fetchItems();
                    }
                });

                window.addEventListener('hashchange', this.onHashChange.bind(this));
                this.onHashChange();

                let qs = parseHashString();

                this.$watch('currentRoom', (newCurrentRoom, oldCurrentRoom) => {
                    //TODO: please review this block code.
                    if (oldCurrentRoom) {
                        messagingInstance.unsubscribeFromRoom(
                            oldCurrentRoom.type + ':' + oldCurrentRoom.entity_id,
                            subscribeCallbacks.roomIncomingCallback
                        );
                     }

                    if (!newCurrentRoom) {
                        window.location.hash = '';

                        this.currentRoomPeer = null;
                        this.currentRoomOrder = this.currentRoomService = null;
                        this.currentRoomMessages = [];
                        this.currentRoomNewMessage = '';
                        this.currentRoomEnquiryRecorded = false;
                        this.selectedItems = {};

                        // Stop receiving messages for closed room
                        messagingInstance.unsubscribeFromRoom(
                            oldCurrentRoom.type + ':' + oldCurrentRoom.entity_id,
                            subscribeCallbacks.roomIncomingCallback
                        );

                        this.initTab();
                        return;
                    }

                    this.initCurrentRoom(newCurrentRoom);
                });
            }
        }, 100);
    },
    computed: {
        isSelectedExist() {
            let keys = Object.keys(this.selectedItems);
            for(let i = 0; i < keys.length; i++) {
                if(this.selectedItems[keys[i]]) {
                    return true;
                }
            }
            return false;
        }
    },
    methods: {
        onHashChange: function() {
            let qs = parseHashString();

            if (qs.type === 'enquiry') {
                if (!isNaN(qs.id)) {
                    // Also set room ID
                    this.loadCurrentRoom(+qs.id);
                }

                if (qs.seller) {
                    // Search and create enquiry room if it doesn't exist
                    // (after the first message)
                    this.searchEnquiryRoom(qs.seller);
                }
            }
        },
        imgError(e) {
            e.target.className += " avatar-hide";
            var newNode = document.createElement('div');
            newNode.setAttribute("class", "avatar-dummy")
            newNode.innerHTML = e.target.getAttribute("username").slice(0, 1);
            e.target.parentNode.insertBefore(newNode, e.target.nextSibling);
        },
        setFolder(folder) {
            if (this.folder === folder) {
                return;
            }

            this.processingTab = true;
            this.currentRoom = null;
            this.folder = folder;

            this.initTab();
        },
        fetchMeta: function() {
            messagingInstance.loadCounts(['enquiry'], (err, body) => {
                this.tabCounts.unread = body.data[0].unread;
            });
        },
        initTab: function() {
            this.currentPage = this.gotoPage = 1;
            this.totalResults = 0;
            this.items = [];
            this.selectedItems = {};

            this.fetchItems();
        },
        fetchItems: function(page = 1) {
            let params = {
                limit: ITEMS_ON_PAGE,
                offset: (page - 1) * ITEMS_ON_PAGE,
                folder: this.folder
            };

            this.itemsLoading = true;
            const processStartAt = new Date();
            messagingInstance.loadRooms('enquiry', params).then(body => {
                console.log("params")
                console.log(params)
                console.log("body")
                console.log(body)
                this.itemsLoading = false;
                const processDuration = new Date() - processStartAt;
                const timeout = processDuration < this.minPreloaderDuration ? this.minPreloaderDuration - processDuration : 0;
                setTimeout(() => {
                    this.processingTab = false;
                }, timeout);

                this.items = body.data.map(this.prepareRoom);

                this.totalResults = body.meta.total;

                if (['unread', 'inbox'].indexOf(this.folder) !== -1) {
                    this.tabCounts.unread = body.meta.unread;
                }

                this.doBuildPagination();
            });
        },

        initCurrentRoom: function(newCurrentRoom) {
            this.currentRoomService = newCurrentRoom.meta.service;

            if (newCurrentRoom.is_new || newCurrentRoom.meta.buyer.id === this.sharedState.user.id) {
                this.currentRoomPeer = newCurrentRoom.meta.seller;
            } else {
                this.currentRoomPeer = newCurrentRoom.meta.buyer;
            }

            this.initAttachments();
            this.fetchCurrentRoomPeerInfo();

            if (newCurrentRoom.is_new) {
                // All is done for new room
                return;
            }

            this.fetchCurrentRoomMessages();

            if (newCurrentRoom.unread) {
                this.tabCounts.unread = Math.max(0, this.tabCounts.unread - 1);
                newCurrentRoom.unread = false;

                try {
                    let stats_messages;
                    if (localStorage['stats_messages']) {
                        stats_messages = JSON.parse(localStorage['stats_messages']);
                        stats_messages.unread = this.tabCounts.unread;
                        localStorage.setItem('stats_messages', JSON.stringify(stats_messages));
                    }
                } catch (e) {}
            }

            window.location.hash = `#?type=enquiry&id=${newCurrentRoom.entity_id}`;
        },

        loadCurrentRoom: function(id) {
            messagingInstance.loadRoom('enquiry:' + id, {}, (err, data) => {
                if (err) {
                    // TODO
                    return;
                }

                this.currentRoom = data;
            });
        },
        searchEnquiryRoom: function(seller) {
            axios.post('/api/account/messaging/enquiry/search', { seller: seller }).then(resp => {
                if (!resp.data.id) {
                    // No such enquiry. Open a new room page
                    this.currentRoom = {
                        is_new: true,
                        meta: resp.data.meta
                    };

                    return;
                }

                this.loadCurrentRoom(+resp.data.id);
            }).catch(e => {
                window.location.hash = '';
                this.initTab();
            });
        },

        prepareRoom: function(room) {
            if (room.type === 'order') {
                room._display_name = `Order #${room.meta.order.id} — ${room.meta.service.title}`;
                room._last_action_date_display = formatTimespanFromNow(room.last_action_date);
            } else if (room.type === 'enquiry') {
                if (room.meta.service) {
                    room._display_name = `Enquiry on service — I will ${room.meta.service.title}`;
                } else {
                    room._display_name = 'Direct message';
                }
                room._last_action_date_display = formatTimespanFromNow(room.last_action_date);
            }

            room._username = (room.meta.buyer.id === this.sharedState.user.id) ? room.meta.seller.username : room.meta.buyer.username;
            room._photo_url = '/account/user/photo/' + room._username;

            return room;
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

            this.selectedItems = {};
            this.fetchItems(page);
        },

        fetchCurrentRoomPeerInfo: function() {
            if (!this.currentRoomPeer) {
                return;
            }

            let roomStringID = this.currentRoom.type + ':' + this.currentRoom.entity_id;

            axios.get('/api/user/' + this.currentRoomPeer.id, { params: { room: roomStringID } }).then(resp => {
                this.currentRoomPeer = resp.data;
                this.currentRoomPeer._last_seen = formatTimespanFromNow(resp.data.last_logged_on);
                this.currentRoomPeer._member_since = formatDate(this.currentRoomPeer.registered_on);
            }).catch(err => {
                // TODO:
            });
        },

        fetchCurrentRoomMessages: function() {
            if (!this.currentRoom) {
                return;
            }

            let roomStringID = this.currentRoom.type + ':' + this.currentRoom.entity_id;

            this.currentRoomMessagesLoading = true;
            messagingInstance.loadHistory(roomStringID, { markAsRead: true })
                .then(body => {
                    this.currentRoomMessagesLoading = false;

                    // if (err) {
                    //     // TODO
                    //     return;
                    // }

                    this.currentRoomMessages = body.data.map(this.prepareMessage, this).reverse();
                    this.scrollToBottom();

                    subscribeCallbacks.roomIncomingCallback = this.handleIncomingMessage.bind(this);
                    messagingInstance.subscribeToRoom(roomStringID, subscribeCallbacks.roomIncomingCallback, true);
                });
        },

        prepareMessage: function(message) {
            message._date_display = formatTimespanFromNow(message.date);

            if (this.sharedState.user.id === message.user) {
                message._outgoing = true;
                message._sender = this.sharedState.user.username;
                message._sender_url = '/freelancer/' + message._sender + '.html';
            } else {
                message._incoming = true;
                message._sender = this.currentRoomPeer.username;
                message._sender_url = '/freelancer/' + message._sender + '.html';
            }

            if (message.type === 'enquiry_offer') {
                message._service_title = message.meta.enquiry_offer._service_title;
                message._service_thumb_url = '/account/service/photo/' + message.meta.enquiry_offer._service_id;
                message._offer_price = message.meta.enquiry_offer.price;
                message._offer_delivery_time = message.meta.enquiry_offer.delivery_time;
                message._offer_revision_count = message.meta.enquiry_offer.revision_count === -1 ? 'Unlimited' : message.meta.enquiry_offer.revision_count;
            }

            return message;
        },

        handleIncomingMessage: function(body) {
            this.currentRoomMessages.push(this.prepareMessage(body));
            this.scrollToBottom();
        },

        scrollToBottom: function() {
            Vue.nextTick(() => {
                if (!this.$refs.currentRoomMessagesBody) {
                    return setTimeout(() => {
                        // TODO: investigate this
                        this.$refs.currentRoomMessagesBody.scrollTop = this.$refs.currentRoomMessagesBody.scrollHeight;
                    }, 1000);
                }

                this.$refs.currentRoomMessagesBody.scrollTop = this.$refs.currentRoomMessagesBody.scrollHeight;
            });
        },

        handleMessageSend: function() {
            if (this.currentRoomMessagesLoading || this.currentRoomNewMessageLoading || this.attachUploading) {
                return;
            }

            if (!this.currentRoomNewMessage.length && !this.attachUploads.length) {
                return;
            }

            if (this.currentRoom.is_new) {
                return this.handleNewEnquirySend();
            }

            let roomStringID = this.currentRoom.type + ':' + this.currentRoom.entity_id,
                meta;

            if (this.attachUploads.length) {
                meta = {
                    attachments: this.attachUploads.map(file => Object.assign({ size: file.size }, file.response ))
                };
            }

            try {
                messagingInstance.sendMessage(roomStringID, this.currentRoomNewMessage, meta);
                this.currentRoomNewMessage = '';
                this.attachError = null;
                this.attachUploads = [];

                if (this.currentRoom.type === 'enquiry' && !this.currentRoomEnquiryRecorded) {
                    this.recordEnquiryTime(this.currentRoom.entity_id); // TODO: optimize this
                    this.currentRoomEnquiryRecorded = true;
                }
            } catch (e) {
                // TODO
            }
        },

        handleNewEnquirySend: function() {
            let data = {
                text: this.currentRoomNewMessage,
                seller_id: this.currentRoom.meta.seller.id
            };

            if (this.attachUploads.length) {
                data.meta = {
                    attachments: []
                };
                this.attachUploads.forEach(v => {
                    data.meta.attachments.push(
                      Object.assign({ size: v.size }, v.response)
                    )
                });
            }

            this.currentRoomMessagesLoading = true;
            axios.post('/api/enquiry', data).then(res => {
                this.currentRoomMessagesLoading = false;
                this.loadCurrentRoom(res.data.id);
            }).catch(err => {
                this.currentRoomMessagesLoading = false;
                // TODO
            });
        },

        handleArchiveRoom: function() {
            let roomStringID = this.currentRoom.type + ':' + this.currentRoom.entity_id;

            try {
                messagingInstance.archiveRooms([roomStringID], err => {
                    if (err) {
                        // TODO
                        return;
                    }

                    this.currentRoom = null;
                    this.fetchItems();
                });
            } catch (e) {
                // TODO
            }

            this.setFolder('archive');
        },

        handleArchiveRooms: function() {
            let roomStringIDs = [];
            for (let roomStringID in this.selectedItems) {
                if (this.selectedItems[roomStringID]) {
                    roomStringIDs.push(roomStringID);
                }
            }

            if (!roomStringIDs.length) {
                return;
            }

            try {
                messagingInstance.archiveRooms(roomStringIDs, err => {
                    if (err) {
                        // TODO
                        return;
                    }

                    this.items = [];
                    this.selectedItems = {};
                    this.fetchItems(this.currentPage);
                });

                this.items = [];
                this.selectedItems = {};
                this.fetchItems(this.currentPage);
            } catch (e) {
                // TODO
            }
        },

        initAttachments: function() {
            this.attachUploadEvents = {
                add: this.handleAttachUploadAdd.bind(this),
                after: this.handleAttachUploadAfter.bind(this)
            };
        },
        handleAttachUploadAdd: function(file, component) {
            this.attachError = null;
            this.attachUploading = true;
            component.active = true;
        },
        handleAttachUploadAfter: function(file, component) {
            this.attachUploading = false;

            if (file.error || !file.response || !file.response.attachmentId) {
                component.remove(file.id);

                if (file.response && file.response.error) {
                    this.attachError = file.response.error;
                }

                return;
            }
        },
        handleAttachDelete: function(file) {
            if (this.attachUploading) {
                return;
            }

            let data = {
                attachmentId: file.response.attachmentId,
                filename: file.response.filename
            };

            this.attachUploading = true;
            axios.post('/api/account/messaging/upload/delete', data).then(resp => {
                this.attachUploading = false;
                this.$refs.uploader.remove(file.id);
            }).catch(err => {
                this.attachUploading = false;
                // TODO
            });
        },

        recordEnquiryTime: function(enquiryId) {
            axios.post('/api/account/messaging/enquiry/record_time', { id: enquiryId }).then(resp => {});
        },

        handleCreateOffer: function() {
            this.serviceOfferModal = initServiceOfferModal(true);

            axios.get('/api/account/seller/search/services?include_thumbnail=true').then(resp => {
                this.serviceOfferModal.services = resp.data;
                this.serviceOfferModal.loading = false;
            }).catch(err => {
                // TODO
            });
        },

        handleSubmitOffer: function() {
            if (this.serviceOfferModal.step === 0) {
                for (let i = 0; i < this.serviceOfferModal.services.length; i++) {
                    if (this.serviceOfferModal.serviceId === this.serviceOfferModal.services[i].id) {
                        this.serviceOfferModal.service = this.serviceOfferModal.services[i];
                        break;
                    }
                }

                this.serviceOfferModal.offer = initServiceOfferModal().offer;
                this.serviceOfferModal.step = 1;
                this.serviceOfferModal.error = null;
            } else {
                let data = {
                    message: this.serviceOfferModal.offer.text,
                    delivery_time: this.serviceOfferModal.offer.deliveryTime,
                    revision_count: +this.serviceOfferModal.offer.revisionCount,
                    price: Math.round(this.serviceOfferModal.offer.price * 100),
                    enquiry_id: this.currentRoom.entity_id,
                    service_id: this.serviceOfferModal.serviceId
                };

                if (this.serviceOfferModal.offer.expirationTime !== -1) {
                    data.expiration_time = this.serviceOfferModal.offer.expirationTime;
                }

                this.serviceOfferModal.loading = true;
                this.serviceOfferModal.error = null;
                axios.post('/api/account/seller/services/' + this.serviceOfferModal.serviceId + '/offer', data).then(resp => {
                    this.serviceOfferModal.show = false;
                }).catch(err => {
                    this.serviceOfferModal.loading = false;

                    if (err.response.data.error && err.response.data.error.message) {
                        this.serviceOfferModal.error = err.response.data.error.message;
                    } else {
                        this.serviceOfferModal.error = 'We are unable to complete your request at the moment, please try again later';
                    }
                });
            }
        },

        handleBuyerOfferAccept: function(id) {
            this.$set(this.serviceOfferLoading, id, true);
            axios.post('/api/account/buyer/offers/' + id + '/accept').then(resp => {
                location.href = resp.data._url;
            });
        },

        handleSellerOfferCancel: function(id) {
            this.$set(this.serviceOfferLoading, id, true);
            axios.post('/api/account/seller/offers/' + id + '/cancel').then(resp => {
                this.$set(this.serviceOfferLoading, id);
                this.$set(this.serviceOfferDisabled, id, { is_closed: true });
            }).catch(err => {
                this.$set(this.serviceOfferLoading, id);
            });
        },

        linkifyText: function( text ) {
            return linkify(text);
        },
    }
});

function initServiceOfferModal(show) {
    return {
        show: !!show,
        step: 0,

        services: [],

        loading: true,
        error: null,

        serviceId: null,
        service: {},

        offer: {
            text: '',
            deliveryTime: 1,
            price: '',
            revisionCount: '3',
            expirationTime: -1
        }
    };
}


export default accountInboxApp;
