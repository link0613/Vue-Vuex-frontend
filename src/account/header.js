import Vue from 'vue';

import storeInstance from '../frontend/store';
import messagingInstance from '../shared/messaging';
import { formatTimespanFromNow, prepareNotification } from '../shared/utils';
import axios from 'axios';
import { directive as onClickOutside } from 'vue-on-click-outside';


const accountHeaderApp = new Vue({
    directives: {
        onClickOutside
    },
    data: {
        sharedState: storeInstance.state,
        
        isMenuOpened: false,
        expandedMenuItem: -1,

        accountMenuDropdown: null,

        messagesLoading: true,
        messages: [],
        messagesUnread: 0,
        messagesPeersStatus: {},

        // notificationsImages: {
        //   configMessages: require("./assets/images/icons/config-icon-84x84.png"),
        // },

        notificationsLoading: true,
        notifications: [],
        notificationsUnread: 0,
        notificationTab: 0,

        notificationSound: require("./assets/sounds/beep.wav"),

        query: null,
        searchIsOpen: true,
        suggestions: [],
        searchTimeout: null
    },
    mounted: function() {
        this.initMessaging();
    },
    methods: {
        imgError(e) {
            e.target.className += " avatar-hide";
            var newNode = document.createElement('div');
            newNode.setAttribute("class", "avatar-dummy")
            newNode.innerHTML = e.target.getAttribute("username").slice(0, 1);
            // newNode.innerHTML = this.sharedState.user.username.slice(0, 1);
            e.target.parentNode.insertBefore(newNode, e.target.nextSibling);
        },
        selectTab(index) {
            this.notificationTab = index;
        },
        initMessaging: function() {
            function getMessaging(play) {
                Promise.all([
                    messagingInstance.loadRooms('enquiry', { limit: 5, folder: 'inbox' }),
                    messagingInstance.loadHistory('notification:' + this.sharedState.user.id, { limit: 5 })
                ])
                    .then(allData => {
                        // messages

                        let body = allData[0];

                        this.messagesLoading = false;

                        // this.items = body.data.map(this.prepareRoom, this);
                        this.messages = body.data.map(room => {
                            room._username = room.meta.buyer.id === this.sharedState.user.id ? room.meta.seller.username : room.meta.buyer.username;
                            room._user_id = room.meta.buyer.id === this.sharedState.user.id ? room.meta.seller.id : room.meta.buyer.id;

                            if (room.meta.service) {
                                room._text = `Enquiry on service — ${room.meta.service.title}`;
                            } else {
                                room._text = room.message;
                            }

                            room._url = storeInstance.urlFor('inbox', [room.type, room.entity_id]);
                            room._image_url = '/account/user/photo/' + room._username;

                            this.messagesPeersStatus[room._user_id] = 0;

                            return room;
                        });

                        this.loadPeersStatus();

                        this.messagesUnread = body.meta.unread;

                        messagingInstance.subscribeToRead(this.handleRoomRead.bind(this), true);

                        try {
                            let stats_messages;
                            if (localStorage['stats_messages']) {
                                stats_messages = JSON.parse(localStorage['stats_messages']);
                                if((stats_messages.total != body.meta.total) && (body.meta.unread > 0) || (stats_messages.total == body.meta.total) && (stats_messages.unread < body.meta.unread)) {
                                    this.playNotificationSound = true;
                                    localStorage.setItem('stats_messages', JSON.stringify(body.meta));
                                }
                            } else {
                                localStorage.setItem('stats_messages', JSON.stringify(body.meta));
                            }
                        } catch (e) {}

                        return allData[1];
                    })
                    .then(body => {
                        // notifications

                        this.notificationsLoading = false;

                        this.notifications = body.data.map(prepareNotification, this);
                        this.notificationsUnread = body.meta.unread;

                        messagingInstance.subscribeToNotifications(msg => {
                            let idxToRemove = -1;

                            if (msg.type === 'new_message') {
                                for (let idx = 0; idx < this.notifications.length; idx++) {
                                    let item = this.notifications[idx];
                                    if (item.type === msg.type && item.meta.type === msg.meta.type && item.meta.entityId === msg.meta.entityId) {
                                        idxToRemove = idx;
                                        break;
                                    }
                                };
                            }

                            if (idxToRemove === -1 && this.notifications.length === 5) {
                                idxToRemove = 4;
                            }

                            if (idxToRemove !== -1) {
                                this.notifications.splice(idxToRemove, 1);
                            }

                            this.notifications.unshift(prepareNotification.call(this, msg));
                            this.notificationsUnread += 1;
                        });

                        try {
                            let stats_notifications;
                            if (localStorage['stats_notifications']) {
                                stats_notifications = JSON.parse(localStorage['stats_notifications']);
                                if((stats_notifications.total != body.meta.total) && (body.meta.unread > 0)) {
                                    this.playNotificationSound = true;
                                    localStorage.setItem('stats_notifications', JSON.stringify(body.meta));
                                }
                            } else {
                                localStorage.setItem('stats_notifications', JSON.stringify(body.meta));
                            }
                        } catch (e) {}
                    })
                    .then(() => {
                        if (this.playNotificationSound && play) {
                            this.playSound();
                            this.playNotificationSound = false;
                        }
                    });
            }

            let messagingReadyInterval = setInterval(() => {
                if (messagingInstance.isAuthenticated) {
                    clearInterval(messagingReadyInterval);
                    getMessaging.call(this);
                }
            }, 100);

            let messagingUpdateInterval,
                updateTime = 60 * 1000;


            messagingUpdateInterval = setInterval(() => {
                if (messagingInstance.isAuthenticated) {
                    //clearInterval(messagingUpdateInterval);
                    getMessaging.call(this, true);
                }
            }, updateTime);
        },

        loadPeersStatus() {
            let ids = Object.keys(this.messagesPeersStatus).join(',');
            if (!ids.length) {
                return;
            }

            axios.get('/api/user/status', { params: { ids: ids } }).then(resp => {
                for (let userId in resp.data) {
                    this.$set(this.messagesPeersStatus, userId, resp.data[userId]);
                }
            });
        },

        handleRoomRead: function(body) {
            let [ type, entityId ] = body.room.split(':');

            for (let message of this.messages) {
                if (message.type === type && message.entity_id === entityId) {
                    message.unread = false;
                    break;
                }
            }

            if (type === 'enquiry') {
                this.messagesUnread = Math.max(0, this.messagesUnread - 1);
            }

            if (type === 'notification') {
                this.notificationsUnread = 0;
            }
        },

        setQuery() {
            let params = parseQueryString();
            this.query = params.query ? decodeURIComponent(params.query.replace(/\+/g, '%20')) : '';
        },

        clearSearch() {
            this.searchIsOpen = false;
            this.setQuery();
            this.suggestions = [];
        },

        goTo(query) {
            window.location.href = `${window.location.origin}?query=${query}`;
            this.clearSearch();
        },

        onSearch() {
            if (this.searchTimeout) clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.suggestions = [];
                axios.get('/api/search/suggest', {
                    params: {
                        query: this.query
                    }
                }).then(res => {
                    this.suggestions = res.data;
                    if (this.suggestions.length) {
                        this.searchIsOpen = true;
                    }
                });
            }, 750);
        },
        clearRecentSearches() {
            this.clearSearch();
        },
        playSound() {
            let sound = document.createElement('audio');
            sound.style.display = "none";
            sound.src = this.notificationSound;
            sound.autoplay = true;
            sound.onended = function(){
                sound.remove();
            };
            document.body.appendChild(sound);
        }
    }
});


export default accountHeaderApp;
