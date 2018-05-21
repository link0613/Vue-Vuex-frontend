import Vue from 'vue';

import './headerBar.scss';
import { mapGetters } from 'vuex'

export default {
  template: `
    <!-- <div class="menu-links">
    </div> -->
    <b-navbar toggleable="md">
      <b-navbar-brand href="#"></b-navbar-brand>
      <!-- <b-nav>
        <b-nav-item active><router-link to="/">Home</router-link></b-nav-item>
        <b-nav-item><router-link to="/cart">Cart ({{ cartCount }})</router-link></b-nav-item>
      </b-nav> -->
    </b-navbar>
  `,
  computed: {
    // mix the getters into the computed object
    ...mapGetters([
      'cartCount'

    ])
  }
}
