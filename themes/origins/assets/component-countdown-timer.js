if (!customElements.get("yc-countdown-timer")) {
  class CountdownTimer extends HTMLElement {
    static MS_PER_SECOND = 1000;
    static MS_PER_MINUTE = 60 * CountdownTimer.MS_PER_SECOND;
    static MS_PER_HOUR = 60 * CountdownTimer.MS_PER_MINUTE;
    static MS_PER_DAY = 24 * CountdownTimer.MS_PER_HOUR;

    constructor() {
      super();
      const [days, hours, minutes, seconds] = this.querySelectorAll(
        "#days, #hours, #minutes, #seconds",
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
      const { date, time } = this.dataset;
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
      const paddedDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const [hours, minutes, seconds] = time.split(":");
      const paddedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

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
      this.days.textContent = String(days).padStart(2, "0");
      this.hours.textContent = String(hours).padStart(2, "0");
      this.minutes.textContent = String(minutes).padStart(2, "0");
      this.seconds.textContent = String(seconds).padStart(2, "0");
    }
  }

  customElements.define("yc-countdown-timer", CountdownTimer);
}
