import Vue from 'vue';
import axios from 'axios';
import noUiSlider from 'nouislider';
import { parseQueryString } from '../shared/utils';
import { tooltip } from 'vue-strap';
import spinner from '../shared/components/spinner';
import SortSelector from '../account/components/sort-selector';

import storeInstance from './store';

import FilterBar from '../shared/components/filterBar'
import JobItem from '../shared/components/jobItem'
import TagsInput from '../shared/components/tagsInput'

import SearchIcon from '../shared/assets/icon-search.svg'
import SearchIconBlue from '../shared/assets/icon-search-blue.svg'
import StarYellowIcon from '../shared/assets/icon-star-yellow.svg'

// import TagsInput from '@voerro/vue-tagsinput'
import BootstrapVue from 'bootstrap-vue'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

// Vue.component('tags-input', TagsInput)
Vue.use(BootstrapVue)

const SERVICES_ON_PAGE = 15;

const jobsApp = new Vue({
    components: {
        spinner,
        tooltip,
        SortSelector,
        'job-item': JobItem,
        'tags-input': TagsInput,
        'filter-bar': FilterBar,
        'search-icon': SearchIcon,
        'search-icon-blue': SearchIconBlue,
        'star-yellow-icon': StarYellowIcon
    },
    data: {
        sharedState: storeInstance.state,

        topCategory: null,
        topCategoryId: null,
        isFiltersModified: false,

        isFilterOpened: false,

        query: '',
        lastQuery: '',
        lastQueryFavorite: false,
        selectedCategories: [],
        selectedTagsObject: {},
        selectedRating: 1,
        possibleSortingOptions: [],
        selectedSorting: 'recommended',
        selectedPrices: null,
        selectedIsOnline: false,

        isLoading: true,
        results: [],
        totalResults: 0,
        skipResults: 0,
        currentPage: 1,
        pages: [1],
        tags: [],

        imagesLinks: {
            ratingIcon: require('./assets/img/star-48x48.png'),
            hearthIcon: require('./assets/img/hearth-grey-32x32.png'),
            markNewIcon: require('./assets/img/icon-star13-white-42x42.png'),
            markFeaturedIcon: require('./assets/img/icon-star5-white-42x42.png'),
            tagIcon: require('./assets/img/tag-mark-32x32.png'),

        },


        tagWindowOpened: false,
        tagWindowOffset: 0,

        searchId: Date.now(),
        minPreloaderDuration: 400,

        /* comes from spa */
        mySkills: {
            'pdf': 'PDF',
            'jdf': 'JDF',
            'graphic-design': 'Graphic Design',
            'logo-design': 'Logo Design'
          },
          filterList: {
            experience: {
              list: ['Entry', 'Intermediate', 'Expert'],
              title: 'Experience'
            },
            location: {
              list: ['Unite State', 'Italy', 'Russia'],
              title: 'Location'
            },
            type: {
              list: ['Web Development', 'Mobile Development', 'Translation'],
              title: 'Job Type'
            },
            price: {
              list: ['High', 'Medium', 'Low'],
              title: 'Price'
            },
            language: {
              list: ['Spanish', 'English', 'Turkey', 'German', 'Italian'],
              title: 'Language'
            },
            sortBy: {
              list: ['Newest', 'Relevance', 'Latest'],
              title: 'Latest'
            }
          },
          jobDataList: [
            {
              title: 'Create A Website Like Craigslist/Kijiji',
              description: 'In simple words, I need a website that works like Craigslist. If you don\'t know what the website is please go to craigslist.org or kijiji.com and do some research on weather or not i...',
              tags: ['Website Design', 'Graphic Design', 'Design', 'Photoshop', 'HTML', 'Web Development'],
              time: '2d 23h',
              bids: 3,
              price: 739,
              isLike: false,
              bidAvailable: false,
              markers: []
            },
            {
              title: 'Create A Website Like Craigslist/Kijiji',
              description: 'In simple words, I need a website that works like Craigslist. If you don\'t know what the website is please go to craigslist.org or kijiji.com and do some research on weather or not i...',
              tags: ['Website Design', 'Graphic Design', 'Design', 'Photoshop', 'HTML', 'Web Development'],
              time: '2d 23h',
              bids: 3,
              price: 739,
              isLike: true,
              bidAvailable: false,
              markers: ['recruiter']
            },
            {
              title: 'Create A Website Like Craigslist/Kijiji',
              description: 'In simple words, I need a website that works like Craigslist. If you don\'t know what the website is please go to craigslist.org or kijiji.com and do some research on weather or not i...',
              tags: ['Website Design', 'Graphic Design', 'Design', 'Photoshop', 'HTML', 'Web Development'],
              time: '2d 23h',
              bids: 3,
              price: 739,
              isLike: false,
              bidAvailable: true,
              markers: ['urgent', 'featured']
            },
            {
              title: 'Create A Website Like Craigslist/Kijiji',
              description: 'In simple words, I need a website that works like Craigslist. If you don\'t know what the website is please go to craigslist.org or kijiji.com and do some research on weather or not i...',
              tags: ['Website Design', 'Graphic Design', 'Design', 'Photoshop', 'HTML', 'Web Development'],
              time: '2d 23h',
              bids: 3,
              price: 739,
              isLike: true,
              bidAvailable: false,
              markers: ['urgent']
            }
          ],
          selectedTags: '',
          currentPage: 1,
          isSearchBarActive: false
    
    },
    mounted: function() {
        console.log("ldjlskjflsjlfksdjf")


        this.doSearch();
        this.setPossibleSortingOptions();
    },
    methods: {

        addToFavorite(id) {
            // add to favorite
        },
        toggleFavorite(product) {

        },
        setPossibleSortingOptions() {
            this.possibleSortingOptions = [
                {
                    value: 'recommended',
                    label: 'Recommended',
                    icon: 'icon icon-sandwich'
                },
                {
                    value: '-date',
                    label: 'Date Added',
                    icon: 'icon icon-sandwich'
                },
                {
                    value: 'price',
                    label: 'Lower Price',
                    icon: 'icon icon-sandwich'
                },
                {
                    value: '-price',
                    label: 'Higher Price',
                    icon: 'icon icon-sandwich'
                },
                {
                    value: '-orders',
                    label: 'Best Sellers',
                    icon: 'icon icon-sandwich'
                }
            ];
        },
        doSearch: function(page = 1) {
            let params = {};
            if (this.query) {
                params.query = this.query;
            }

            if (this.topCategoryId) {
                if (this.selectedCategories.length) {
                    params.categories = this.selectedCategories.join(',');
                } else {
                    this.sharedState.categories.forEach(category => {
                        if (category.id === this.topCategoryId) {
                            params.categories = category.subcategories.map(subcategory => subcategory.id).join(',');
                            return;
                        }
                    });

                    if (!params.categories) {
                        // Top category is empty for some reason
                        params.categories = '-1';
                    }
                }
            }

            let selectedTags = Object.keys(this.selectedTagsObject);
            if (selectedTags.length) {
                params.tags = selectedTags.join(',');
            }

            params.offset = (page - 1) * SERVICES_ON_PAGE;
            params.limit = SERVICES_ON_PAGE;

            params.sort = this.selectedSorting;

            if (this.selectedPrices) {
                params.price_from = this.selectedPrices[0];
                params.price_to = this.selectedPrices[1];
            }

            if (this.selectedIsOnline) {
                params.online = true;
            }

            if (this.selectedRating > 1) {
                params.min_rating = this.selectedRating;
            }

            params.search_id = this.searchId;

            this.isLoading = true;
            const processStartAt = new Date();
            axios.get('/api/search', { params: params }).then(resp => {
                const processDuration = new Date() - processStartAt;
                const timeout = processDuration < this.minPreloaderDuration ? this.minPreloaderDuration - processDuration : 0;
                setTimeout(() => {
                    this.isLoading = false;
                }, timeout);
                if (params.query) {
                    this.lastQuery = params.query;
                    this.lastQueryFavorite = false;
                }

                this.results = (resp.data ? resp.data.data : []).map(result => {
                    if (result._primary_video_key) {
                        return Object.assign(result, { _playing: false })
                    } else {
                        return result;
                    }
                });
                this.totalResults = resp.data && resp.data.meta ? resp.data.meta.total : 0;
                this.tags = resp.data && resp.data.meta && resp.data.meta.tags ? resp.data.meta.tags : [];

                if (resp.data.meta.favorite) {
                    this.lastQueryFavorite = true;
                }

                this.doBuildPagination();

                window.history.pushState({}, window.document.title, '?' + createQueryString(params));
            });
        },
        doBuildPagination: function() {
            let totalPages = Math.ceil(this.totalResults / SERVICES_ON_PAGE),
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
            if (Math.ceil(this.totalResults / SERVICES_ON_PAGE) < page || page < 1) {
                return;
            }

            this.currentPage = page;
            this.doSearch(page);
            window.scrollTo(0, 0);
        },
        handleQuerySubmit: function() {
            this.doSearch();
        },
        handleResetFilters: function() {

            this.doSearch();
        },
        handleTagWindowOpen: function() {
            let elemRect = this.$refs.tagsFilter.getBoundingClientRect(),
                bodyRect = document.body.getBoundingClientRect();

            this.tagWindowOpened = true;

            // TODO: fix glitch
            setTimeout(() => {
                let filterWindowHeight = this.$refs.filterWindow.offsetHeight;
                this.tagWindowOffset = elemRect.top - bodyRect.top - this.$refs.tagsFilter.offsetHeight - filterWindowHeight / 2;
            }, 50);
        },
        handleSortingChange: function() {
            this.doSearch();
        },
        handleFavoriteSearchToggleClick: function() {
        }
    }
});


function createQueryString(params) {
    // return Object.keys(params).map(key => `${key}=${window.encodeURIComponent(params[key])}`).join('&');
    let paramsArray = [];
    if (params.query) {
        paramsArray.push('query=' + encodeURIComponent(params.query));
    }

    return paramsArray.join('&');
}


export default jobsApp;
