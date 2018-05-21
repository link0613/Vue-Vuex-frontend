  import Vue from 'vue';

  import './filterBar.scss';
  import DropDown from './dropDown'

  export default {
    template: `
      <div class="d-flex flex-row filter-bar">
        <div class="d-flex">
          <div class="category d-flex">
            <span class="filter-by-icon"></span>
            <h6 class="icon-filter-by">Filter by:</h6>
          </div>
          <div class="category"><drop-down :data="filterList.experience"></drop-down></div>
          <div class="category"><drop-down :data="filterList.location"></drop-down></div>
          <div class="category"><drop-down :data="filterList.type"></drop-down></div>
          <div class="category"><drop-down :data="filterList.price"></drop-down></div>
          <div class="category"><drop-down :data="filterList.language" inputElement="Search for a language"></drop-down></div>
        </div>
        <div class="ml-auto d-flex">
          <div class="category d-flex">
            <span class="sort-by-icon"></span>
            <h6 class="">Sort By</h6>
          </div>
          <div class="category"><drop-down :data="filterList.sortBy" isSort="true"></drop-down></div>
        </div>
      </div>
    `,
    props: [
      'filterList'
    ],
    components: {
      'drop-down': DropDown,
    },
    data: () => ({
    }),
    computed: {
    }
  }