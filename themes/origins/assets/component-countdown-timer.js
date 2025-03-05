if (!customElements.get("yc-countdown-timer")) {
  class CountdownTimer extends HTMLElement {
    static observedAttributes = ["date", "time"];
    static MS_PER_SECOND = 1000;
    static MS_PER_MINUTE = 60 * CountdownTimer.MS_PER_SECOND;
    static MS_PER_HOUR = 60 * CountdownTimer.MS_PER_MINUTE;
    static MS_PER_DAY = 24 * CountdownTimer.MS_PER_HOUR;

    constructor() {
      super();
      const [days, hours, minutes, seconds] = this.querySelectorAll(
        "[data-days], [data-hours], [data-minutes], [data-seconds]",
      );
      this.days = days;
      this.hours = hours;
      this.minutes = minutes;
      this.seconds = seconds;
    }

    disconnectedCallback() {
      if (this.interval) {
        clearInterval(this.interval);
      }
    }

    connectedCallback() {
      this._render();
    }

    _render() {
      const date = this.getAttribute("date");
      const time = this.getAttribute("time");
      const { paddedDate, paddedTime } = this.getPaddedDateTimeString(
        date,
        time,
      );

      const endDateTime = new Date(`${paddedDate}T${paddedTime}`);

      if ((!endDateTime) instanceof Date || isNaN(endDateTime)) {
        this.updateUI(0, 0, 0, 0);

        return;
      }

      this.interval = setInterval(() => {
        this.countDownFrom(endDateTime);
      }, 1000);
    }

    getPaddedDateTimeString(date, time) {
      const [year, month, day] = date.split("-");
      const paddedDate = `${year}-${this.numberToPaddedString(month)}-${this.numberToPaddedString(day)}`;

      const [hours, minutes, seconds] = time.split(":");
      const paddedTime = `${this.numberToPaddedString(hours)}:${this.numberToPaddedString(minutes)}:${this.numberToPaddedString(seconds)}`;

      return { paddedDate, paddedTime };
    }

    countDownFrom(datetime) {
      const difference = datetime - new Date();

      if (difference <= 0) {
        clearInterval(this.interval);
        this.updateUI(0, 0, 0, 0);

        return;
      }

      let remaining = difference;

      const days = Math.floor(remaining / CountdownTimer.MS_PER_DAY);
      remaining %= CountdownTimer.MS_PER_DAY;

      const hours = Math.floor(remaining / CountdownTimer.MS_PER_HOUR);
      remaining %= CountdownTimer.MS_PER_HOUR;

      const minutes = Math.floor(remaining / CountdownTimer.MS_PER_MINUTE);
      remaining %= CountdownTimer.MS_PER_MINUTE;

      const seconds = Math.floor(remaining / CountdownTimer.MS_PER_SECOND);

      this.updateUI(days, hours, minutes, seconds);
    }

    updateUI(days, hours, minutes, seconds) {
      this.days.textContent = this.numberToPaddedString(days);
      this.hours.textContent = this.numberToPaddedString(hours);
      this.minutes.textContent = this.numberToPaddedString(minutes);
      this.seconds.textContent = this.numberToPaddedString(seconds);
    }

    numberToPaddedString(value) {
      return String(value).padStart(2, "0");
    }
  }

  customElements.define("yc-countdown-timer", CountdownTimer);
}
