
  import Vue from 'vue';

  import './jobItem.scss';
  

  export default {
    template: `
      <div class="job-item">
        <b-row>
          <b-col md="12" lg="5" xl="6">
            <b-row>
              <b-col cols="12" sm="12" md="1">
                <span>job item</span>
              </b-col>
              <b-col cols="12" sm="12" md="11" class="content-wrapper">
                <h4>{{jobData.title}}</h4>
                <h5>{{jobData.description}}</h5>
                <div class="">
                  <a v-for="(item, index) in jobData.tags" :key="index">{{item}},</a>
                </div>
              </b-col>
            </b-row>
          </b-col>
          <b-col md="12" lg="7" xl="6" class="responsive-row">
            <b-row class="center-row">
              <b-col cols="3" sm="3" md="4">
                <h3>{{jobData.bids}}</h3>
              </b-col>
              <b-col cols="3" sm="3" md="3">
                <div class="d-flex">
                  <span class="watch-image">watch</span>
                  <div>
                    <h5>Today</h5>
                    <div class="text-tiny">{{jobData.time}}</div>
                  </div>
                </div>            
              </b-col>
              <b-col cols="3" sm="3" md="3" class="third-col">
                <h3>{{jobData.price}}</h3>
                <b-button class="bid-btn bid-desktop" variant="primary">BID NOW</b-button>
              </b-col>
              <b-col cols="3" sm="3" md="2" class="fourth-col">
                <div class="star-desktop">
                  <span v-if="jobData.isLike" class="star-icon">star yellow</span>
                  <span v-if="!jobData.isLike" class="star-icon">star grey</span>
                </div>
                <b-button class="bid-btn bid-mobile" variant="primary">BID NOW</b-button>
              </b-col>
            </b-row>
          </b-col>
        </b-row>
        <div class="marker-container">
          <div class="marker-wrapper" v-for="(item, index) in jobData.markers" :key="index">
            <span v-if="item==='recruiter'">recruiter</span>
            <span v-if="item==='urgent'">urgent-marker </span>
            <span v-if="item==='featured'">featured</span>
          </div>
          <div class="star-mobile">
            <span v-if="jobData.isLike" class="star-icon">star yellow</span>
            <span v-if="!jobData.isLike" class="star-icon">star grey</span>
          </div>
        </div>
      </div>

    `,
    props: ['jobData'],
    components: {
 
    },
    data: () => ({
    }),
    computed: {
    }
  }
