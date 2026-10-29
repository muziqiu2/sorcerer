/* 魔法师 · SORCERER.TOP
   三件事：一，把今天的日期写成汉字；二，旧浏览器里补上标题入场；三，年份。 */

(function () {
  "use strict";

  var CN_DIGIT = "〇一二三四五六七八九";

  function digits(n) {
    return String(n).replace(/\d/g, function (d) {
      return CN_DIGIT[+d];
    });
  }

  /* 1..31 的汉字写法：十、十一、二十、二十三、三十一 */
  function count(n) {
    if (n <= 10) return n === 10 ? "十" : CN_DIGIT[n];
    if (n < 20) return "十" + CN_DIGIT[n - 10];
    var tens = Math.floor(n / 10);
    var ones = n % 10;
    return CN_DIGIT[tens] + "十" + (ones ? CN_DIGIT[ones] : "");
  }

  /* 农历日：初一到三十 */
  function lunarDay(n) {
    if (n <= 10) return "初" + (n === 10 ? "十" : CN_DIGIT[n]);
    if (n < 20) return "十" + CN_DIGIT[n - 10];
    if (n === 20) return "二十";
    if (n < 30) return "廿" + CN_DIGIT[n - 20];
    return "三十";
  }

  function writeDate() {
    var now = new Date();
    var today = document.getElementById("today");
    var weekday = document.getElementById("weekday");
    var lunar = document.getElementById("lunar");
    var year = document.getElementById("year");

    if (year) year.textContent = String(now.getFullYear());

    if (today) {
      today.dateTime = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-");
      today.textContent =
        digits(now.getFullYear()) +
        "年" +
        count(now.getMonth() + 1) +
        "月" +
        count(now.getDate()) +
        "日";
    }

    if (weekday) {
      var names = ["日", "一", "二", "三", "四", "五", "六"];
      weekday.textContent = "星期" + names[now.getDay()];
    }

    if (lunar) {
      try {
        var parts = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
          month: "long",
          day: "numeric",
        }).formatToParts(now);
        var month = "";
        var day = 0;
        parts.forEach(function (part) {
          if (part.type === "month") month = part.value;
          if (part.type === "day") day = parseInt(part.value, 10);
        });
        lunar.textContent = month && day ? "农历" + month + lunarDay(day) : "";
        lunar.hidden = !(month && day);
      } catch (e) {
        lunar.hidden = true;
      }
    }
  }

  writeDate();

  /* 跨过午夜就换一天，不做轮询 */
  (function scheduleMidnight() {
    var now = new Date();
    var next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 20);
    window.setTimeout(function () {
      writeDate();
      scheduleMidnight();
    }, Math.max(1000, next - now));
  })();

  /* 只有不支持 scroll-driven 动画的浏览器才用观察器补入场 */
  var head = document.querySelector(".statement__head");
  var supportsTimeline =
    window.CSS &&
    CSS.supports &&
    CSS.supports("animation-timeline: view()");

  if (head && !supportsTimeline && "IntersectionObserver" in window) {
    head.classList.add("is-idle");
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove("is-idle");
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.25 }
    );
    io.observe(head);
  }
})();
