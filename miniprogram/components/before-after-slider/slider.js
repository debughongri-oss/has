Component({
  properties: {
    beforeSrc: {
      type: String,
      value: ''
    },
    afterSrc: {
      type: String,
      value: ''
    },
    height: {
      type: String,
      value: '900rpx'
    }
  },

  data: {
    clipPercent: 50
  },

  lifetimes: {
    attached: function () {
      this._touchStartX = 0
      this._startPercent = 50
      this._containerWidth = 0
      this._lastPercent = 50
    }
  },

  methods: {
    onHandleTouchStart: function (e) {
      this._touchStartX = e.touches[0].clientX
      this._startPercent = this.data.clipPercent

      // Cache container width for duration of this touch sequence
      if (!this._containerWidth) {
        this.createSelectorQuery()
          .select('.ba-container')
          .boundingClientRect(function (rect) {
            if (rect) {
              this._containerWidth = rect.width
            }
          }.bind(this))
          .exec()
      }
    },

    onHandleTouchMove: function (e) {
      if (!this._containerWidth) return

      var deltaX = e.touches[0].clientX - this._touchStartX
      var newPercent = this._startPercent + (deltaX / this._containerWidth * 100)

      // Clamp to [0, 100]
      if (newPercent < 0) newPercent = 0
      if (newPercent > 100) newPercent = 100

      // Throttle: only setData when percent actually changed
      var rounded = Math.round(newPercent)
      if (rounded !== this._lastPercent) {
        this._lastPercent = rounded
        this.setData({ clipPercent: rounded })
      }
    },

    onHandleTouchEnd: function () {
      // No-op, cleanup if needed
    },

    onFullscreenTap: function () {
      this.triggerEvent('fullscreen')
    }
  }
})
