import Vue from 'vue';
import axios from 'axios';
import * as Clipboard from 'clipboard';
import { modal } from 'vue-strap';

import storeInstance from '../frontend/store';
import spinner from '../shared/components/spinner';


const MAX_ALLOWED_INVITATIONS = 50;

const accountInviteApp = new Vue({
    components: {
        spinner,
        modal
    },
    data: {
        sharedState: storeInstance.state,

        inviteEmail: '',
        inviteLoading: false,
        inviteError: null,

        contacts: [],
        contactsLoading: false,

        inviteModal: {
            show: false,
            loading: false,
            error: null,
            contacts: [],
            checkedContacts: []
        }
    },
    mounted() {
        this.loadContacts();

        this.$watch('inviteModal.checkedContacts', (newContacts, oldContacts) => {
            if (newContacts.length > MAX_ALLOWED_INVITATIONS) {
                this.inviteModal.checkedContacts = oldContacts;
            }
        });

        new Clipboard.default('#copy-invite-link');
    },
    methods: {
        imgError(e) {
            e.target.className += " avatar-hide";
            var newNode = document.createElement('div');
            newNode.setAttribute("class", "avatar-dummy")
            newNode.innerHTML = e.target.getAttribute("username").slice(0, 1);
            e.target.parentNode.insertBefore(newNode, e.target.nextSibling);
        },
        handleInviteClick() {
            this.inviteLoading = true;
            this.inviteError = null;
            axios.post('/api/account/invite', { email: this.inviteEmail }).then(resp => {
                this.inviteLoading = false;
                this.inviteEmail = '';

                this.loadContacts();
            }).catch(err => {
                if (err.response.data && err.response.data.error) {
                    this.inviteError = err.response.data.error.message;
                }

                this.inviteLoading = false;
            });
        },

        handleInviteResend(id) {
            axios.post('/api/account/invite/' + id + '/resend').then(resp => {
                this.loadContacts();
            });
        },

        loadContacts() {
            this.contactsLoading = true;
            axios.get('/api/account/invite/contacts').then(resp => {
                this.contactsLoading = false;
                this.contacts = resp.data.data;
            });
        },

        openInviteModal(service) {
            let wnd = window.open('_blank', 'modal', 'location=yes,width=600,height=600,modal=yes,resizable=yes'),
                contactsURL;

            window.SM_OAUTH_CALLBACK = () => {
                this.inviteModal = {
                    show: true,
                    loading: true,
                    error: null,
                    contacts: [],
                    checkedContacts: []
                };

                axios.get(contactsURL).then(resp => {
                    this.inviteModal.loading = false;
                    this.inviteModal.contacts = resp.data;
                }).catch(err => {
                    this.inviteModal.loading = false;
                    this.inviteModal.error = 'Unable to import contacts';
                });
            };

            axios.get('/api/account/invite/import/' + service + '/urls').then(resp => {
                contactsURL = resp.data.contacts_url;
                wnd.location.href = resp.data.url;
            });
        },

        handleInviteModalSelectClick() {
            if (!this.inviteModal.checkedContacts.length) {
                this.inviteModal.checkedContacts = this.inviteModal.contacts.slice(0, MAX_ALLOWED_INVITATIONS).map((_, idx) => idx);
            } else {
                this.inviteModal.checkedContacts = [];
            }
        },

        handleInviteMultipleClick() {
            let data = {
                emails: this.inviteModal.checkedContacts.map(idx => this.inviteModal.contacts[idx].email)
            };

            this.inviteLoading = true;
            this.inviteError = null;
            axios.post('/api/account/invite/import', data).then(resp => {
                this.inviteLoading = false;
                this.inviteModal.show = false;

                this.loadContacts();
            }).catch(err => {
                if (err.response.data && err.response.data.error) {
                    this.inviteError = err.response.data.error.message;
                }

                this.inviteModal.show = false;
                this.inviteLoading = false;
            });
        },

        openSocialWindow(url) {
            window.open(url, 'modal', 'location=yes,width=600,height=600,modal=yes,resizable=yes');
        }
    }
});


export default accountInviteApp;
