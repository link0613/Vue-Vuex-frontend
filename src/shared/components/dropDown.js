 
import Vue from 'vue';

import './dropDown.scss';

// import TagsInput from '@voerro/vue-tagsinput'
import BootstrapVue from 'bootstrap-vue'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

// Vue.component('tags-input', TagsInput)
Vue.use(BootstrapVue)

export default {
  template: `
    <b-dropdown id="ddown1" :class="'m-md-2' + (isSort ? ' sort-dorpdown' : '')" no-caret>
      <template slot="button-content">
        <button id="ddown1__BV_toggle_" aria-haspopup="true" aria-expanded="false" type="button" class="btn dropdown-toggle">{{data.title}}</button>
        <span class="down-icon"></span>
        <span class="up-icon"></span>
      </template>
      <input v-if="inputElement && inputElement!==''" class="dropdown-input" type="text" :placeholder="inputElement" />
      <b-dropdown-item v-for="(item, index) in dataList" :key="index" @click="onSelected(item)">
        <b-form-checkbox v-model="item.status" value="checked" unchecked-value="unchecked" >
          {{item.name}}
        </b-form-checkbox>
      </b-dropdown-item>
    </b-dropdown>
  `,
  props: [
    'data', 'isSort', 'inputElement'
  ],
  components: {

  },
  mounted () {
    this.initDataList()
  },
  methods: {
    onSelected (item) {
      item.status = (item.status === 'unchecked') ? 'checked' : 'unchecked'
    },
    initDataList () {
      for (let item of this.data.list) {
        const newItem = {name: item, status: 'unchecked'}
        this.dataList.push(newItem)
      }
    }
  },
  data: () => ({
    dataList: []
  }),
  computed: {
  }
}
