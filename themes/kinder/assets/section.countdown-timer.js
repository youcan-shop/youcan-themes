if (!customElements.get("ui-countdown")) {
  class Countdown extends HTMLElement {
    static observedAttributes = ["end-datetime", "hide-after-end"];

    static MS_PER_SECOND = 1000;
    static MS_PER_MINUTE = 60 * Countdown.MS_PER_SECOND;
    static MS_PER_HOUR = 60 * Countdown.MS_PER_MINUTE;
    static MS_PER_DAY = 24 * Countdown.MS_PER_HOUR;

    constructor() {
      super();

      const [segments, days, hours, minutes, message] = this.querySelectorAll(
        '[ui-countdown="segments"], [ui-countdown="days"], [ui-countdown="hours"], [ui-countdown="minutes"], [ui-countdown="message"]',
      );
      this.days = days;
      this.hours = hours;
      this.minutes = minutes;
      this.segments = segments;
      this.message = message;
    }

    disconnectedCallback() {
      clearTimeout(this.timeout);
      clearInterval(this.interval);
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      const endDateTime = new Date(this.getAttribute("end-datetime"));

      if (isNaN(endDateTime)) {
        this.stopCountdown();

        return;
      }

      this.countDownFrom(endDateTime);

      // Since our base is minutes and not seconds, it makes sense to only update the ui once every minute instead of once every second
      const msUntilNextMinute = Countdown.MS_PER_MINUTE - (new Date() % Countdown.MS_PER_MINUTE);

      this.timeout = setTimeout(() => {
        this.countDownFrom(endDateTime);

        this.interval = setInterval(() => {
          this.countDownFrom(endDateTime);
        }, Countdown.MS_PER_MINUTE);
      }, msUntilNextMinute);
    }

    countDownFrom(datetime) {
      const diff = datetime - new Date();

      if (diff <= 0) {
        clearInterval(this.interval);
        this.stopCountdown();

        return;
      }

      let remaining = diff;

      const days = Math.floor(remaining / Countdown.MS_PER_DAY);
      remaining %= Countdown.MS_PER_DAY;

      const hours = Math.floor(remaining / Countdown.MS_PER_HOUR);
      remaining %= Countdown.MS_PER_HOUR;

      const minutes = Math.floor(remaining / Countdown.MS_PER_MINUTE);
      remaining %= Countdown.MS_PER_MINUTE;

      this.updateSegments(days, hours, minutes);
    }

    stopCountdown() {
      this.updateSegments(0, 0, 0);
      this.updateSegmentsVisibility();
      this.showMessage();
    }

    updateSegmentsVisibility() {
      if (this.hasAttribute("hide-after-end")) {
        this.segments.toggleAttribute("hidden");
      }
    }

    showMessage() {
      this.message.removeAttribute("hidden");
    }

    updateSegments(days, hours, minutes) {
      this.days.textContent = this.toPaddedString(days);
      this.hours.textContent = this.toPaddedString(hours);
      this.minutes.textContent = this.toPaddedString(minutes);
    }

    toPaddedString(value) {
      return String(value).padStart(2, "0");
    }
  }

  customElements.define("ui-countdown", Countdown);
}
