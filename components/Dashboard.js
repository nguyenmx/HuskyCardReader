var Dashboard = (function () {
  var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var hourChart, dateChart, weekdayChart;

  function initCharts() {
    hourChart = echarts.init(document.getElementById("chart-by-hour"));
    dateChart = echarts.init(document.getElementById("chart-by-date"));
    weekdayChart = echarts.init(document.getElementById("chart-by-weekday"));

    window.addEventListener("resize", function () {
      hourChart.resize();
      dateChart.resize();
      weekdayChart.resize();
    });
  }

  function render(allData, formatTimeFn) {
    var data = Filters.getFiltered(allData);

    // Summary cards
    if (data.length > 0) {
      var filterVals = Filters.getValues();

      var yearFilter = filterVals.year;
      if (yearFilter !== "all") {
        var yearSum = allData.filter(function (row) { return row.date.split("-")[0] === yearFilter; }).length;
        document.getElementById("sum-year-label").textContent = yearFilter + " Total";
        document.getElementById("sum-year").textContent = yearSum;
      } else {
        document.getElementById("sum-year-label").textContent = "Year Total";
        document.getElementById("sum-year").textContent = allData.length;
      }

      var monthFilter = filterVals.month;
      if (monthFilter !== "all") {
        var monthSum = data.filter(function (row) { return parseInt(row.date.split("-")[1], 10) === parseInt(monthFilter, 10); }).length;
        document.getElementById("sum-month-label").textContent = Filters.monthNames[parseInt(monthFilter, 10)] + " Total";
        document.getElementById("sum-month").textContent = monthSum;
      } else {
        document.getElementById("sum-month-label").textContent = "Month Total";
        document.getElementById("sum-month").textContent = data.length;
      }

      var startDate = filterVals.startDate;
      var endDate = filterVals.endDate;
      if (startDate && endDate) {
        var rangeSum = allData.filter(function (row) { return row.date >= startDate && row.date <= endDate; }).length;
        document.getElementById("sum-range-label").textContent = startDate + " → " + endDate;
        document.getElementById("sum-range").textContent = rangeSum;
      } else if (startDate) {
        var daySum = allData.filter(function (row) { return row.date === startDate; }).length;
        document.getElementById("sum-range-label").textContent = startDate;
        document.getElementById("sum-range").textContent = daySum;
      } else {
        document.getElementById("sum-range-label").textContent = "Total Swipes by Date";
        document.getElementById("sum-range").textContent = "—";
      }

    } else {
      document.getElementById("sum-year").textContent = "—";
      document.getElementById("sum-year-label").textContent = "Year Total";
      document.getElementById("sum-month").textContent = "—";
      document.getElementById("sum-month-label").textContent = "Month Total";
      document.getElementById("sum-range-label").textContent = "Total Swipes by Date";
      document.getElementById("sum-range").textContent = "—";
    }

    // Swipes by Hour chart
    var hourCounts = {};
    data.forEach(function (row) {
      var hour = parseInt(row.time.split(":")[0], 10);
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    var hourLabels = Object.keys(hourCounts).sort(function (a, b) { return a - b; });
    var hourValues = hourLabels.map(function (h) { return hourCounts[h]; });
    var hourDisplayLabels = hourLabels.map(function (h) { return formatTimeFn(h + ":00:00"); });

    hourChart.setOption({
      tooltip: {},
      xAxis: { type: "category", data: hourDisplayLabels, axisLabel: { rotate: 45 } },
      yAxis: { type: "value", minInterval: 1, name: "Number of Swipes", nameLocation: "middle", nameGap: 35 },
      series: [{ type: "bar", data: hourValues, color: "#4b2e83" }]
    }, true);

    // Swipes by Day of Month chart
    var dayOfMonthCounts = {};
    data.forEach(function (row) {
      var day = parseInt(row.date.split("-")[2], 10);
      dayOfMonthCounts[day] = (dayOfMonthCounts[day] || 0) + 1;
    });
    var dayLabels = [];
    var dayValues = [];
    for (var i = 1; i <= 31; i++) {
      dayLabels.push(i);
      dayValues.push(dayOfMonthCounts[i] || 0);
    }

    dateChart.setOption({
      tooltip: {},
      xAxis: { type: "category", data: dayLabels, name: "Day of the Month", nameLocation: "middle", nameGap: 25 },
      yAxis: { type: "value", minInterval: 1, name: "Number of Swipes", nameLocation: "middle", nameGap: 35 },
      series: [{ type: "bar", data: dayValues, color: "#b7a57a" }]
    }, true);

    // Traffic Trend by Day of Week chart
    var weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
    data.forEach(function (row) {
      var d = new Date(row.date + "T00:00:00");
      weekdayCounts[d.getDay()] += 1;
    });

    weekdayChart.setOption({
      tooltip: {},
      xAxis: { type: "category", data: dayNames },
      yAxis: { type: "value", minInterval: 1, name: "Number of Swipes", nameLocation: "middle", nameGap: 35 },
      series: [{
        type: "line",
        smooth: true,
        data: weekdayCounts,
        color: "#4b2e83",
        areaStyle: { color: "rgba(75, 46, 131, 0.15)" }
      }]
    }, true);

    SwipeLog.render(data, formatTimeFn);
  }

  return { initCharts: initCharts, render: render };
})();
