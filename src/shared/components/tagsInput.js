
  import Vue from 'vue';

  import './tagsInput.scss';
  export default {
    template: `
      <div>
        <div v-bind:class="hasFocus ? 'form-control tags-input has-focus' : 'form-control tags-input'">
          <span class="badge badge-pill badge-light"
            v-for="(badge, index) in tagBadges"
            :key="index"
          >
            <span v-html="badge"></span>

            <i href="#" class="tagsinput-remove" @click.prevent="removeTag(index)"></i>
          </span>

          <input type="text"
            :placeholder="placeholder"
            v-model="input"
            @focus="hasFocus=true"
            @blur="hasFocus=false"
            @keypress.enter.prevent="tagFromInput"
            @keypress.down="nextSearchResult"
            @keypress.up="prevSearchResult"
            @keypress.esc="ignoreSearchResults"
            @keyup="searchTag"
            @value="tags">

          <input type="hidden" v-if="elementId" 
            :name="elementId"
            :id="elementId"
            v-model="hiddenInput">
        </div>

        <ul v-show="searchResults.length" class="typeahead">
          <li class="badge-top">
            <div>My skills</div>
          </li>
          <li v-for="(tag, index) in searchResults"
            :key="index"
            v-text="tag.text"
            @click="tagFromSearch(tag)"
            class="badge"
            v-bind:class="{
                'badge-primary': index == searchSelection,
                'badge-dark': index != searchSelection
            }">
          </li>
        </ul>
      </div>
    `,

    props: {
      elementId: String,
      existingTags: {
        type: Object,
        default: () => {
          return {}
        }
      },
      oldTags: {
        type: [Array, String],
        default: () => {
          return []
        }
      },

      typeahead: {
        type: Boolean,
        default: false
      },
      placeholder: {
        type: String,
        default: 'Add a tag'
      },
      limit: {
        type: Number,
        default: 0
      }
    },
    data () {
      return {
        badgeId: 0,
        tagBadges: [],
        tags: [],
        input: '',
        oldInput: '',
        hiddenInput: '',
        searchResults: [],
        searchSelection: 0,
        hasFocus: false
      }
    },
    created () {
      if (this.oldTags && this.oldTags.length) {
        let oldTags = Array.isArray(this.oldTags) ? this.oldTags : this.oldTags.split(',')
        for (let slug of oldTags) {
          let existingTag = this.existingTags[slug]
          let text = existingTag || slug // existingTag ? existingTag : slug
          this.addTag(slug, text)
        }
      }
    },
    watch: {
      tags () {
        // Updating the hidden input
        this.hiddenInput = this.tags.join(',')
        // Update the bound v-model value
        this.$emit('input', this.tags)
      }
    },
    methods: {
      tagFromInput (e) {
        // If we're choosing a tag from the search results
        if (this.searchResults.length && this.searchSelection >= 0) {
          this.tagFromSearch(this.searchResults[this.searchSelection])
          this.input = ''
        } else {
          let text = this.input.trim()
          // If the new tag is not an empty string
          if (text.length) {
            this.input = ''
            // Determine the tag's slug and text depending on if the tag exists
            // on the site already or not
            let slug = this.makeSlug(text)
            let existingTag = this.existingTags[slug]
            slug = existingTag ? slug : text
            text = existingTag || text // existingTag ? existingTag : text
            this.addTag(slug, text)
          }
        }
      },
      tagFromSearch (tag) {
        this.searchResults = []
        this.input = ''

        this.addTag(tag.slug, tag.text)
      },
      makeSlug (value) {
        return value.toLowerCase().replace(/\s/g, '-')
      },
      addTag (slug, text) {
        // Check if the limit has been reached
        if (this.limit > 0 && this.tags.length >= this.limit) {
          return false
        }
        // Attach the tag if it hasn't been attached yet
        let searchSlug = this.makeSlug(slug)
        let found = this.tags.find((value) => {
          return searchSlug === this.makeSlug(value)
        })
        if (!found) {
          this.tagBadges.push(text.replace(/\s/g, '&nbsp;'))
          this.tags.push(slug)
        }
      },
      removeLastTag (e) {
        if (!e.target.value.length) {
          this.removeTag(this.tags.length - 1)
        }
      },
      removeTag (index) {
        this.tags.splice(index, 1)
        this.tagBadges.splice(index, 1)
      },
      searchTag (e) {
        if (this.typeahead === true) {
          if (this.oldInput !== this.input) {
            this.searchResults = []
            this.searchSelection = 0
            let input = this.input.trim()
            if (input.length) {
              for (let slug in this.existingTags) {
                let text = this.existingTags[slug].toLowerCase()
                if (text.search(input.toLowerCase()) > -1) {
                  this.searchResults.push({
                    slug,
                    text: this.existingTags[slug]
                  })
                }
              }
              // Sort the search results alphabetically
              this.searchResults.sort((a, b) => {
                if (a.text < b.text) return -1
                if (a.text > b.text) return 1
                return 0
              })
            }
            this.oldInput = this.input
          }
        }
      },
      nextSearchResult () {
        if (this.searchSelection + 1 <= this.searchResults.length - 1) {
          this.searchSelection++
        }
      },
      prevSearchResult () {
        if (this.searchSelection > 0) {
          this.searchSelection--
        }
      },
      ignoreSearchResults () {
        this.searchResults = []
        this.searchSelection = 0
      }
    }
  }
