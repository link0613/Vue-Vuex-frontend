import linkify from 'linkifyjs/string'

export default {
  computed: {
    linkifiedText() {
      return linkify(this.text)
    },
  },
  template: `
    <component :is="as" v-html="linkifiedText" />
  `,
  props: {
    text: {
      type: String,
      default: '',
    },
    as: {
      type: String,
      default: 'p',
    },
  },
}