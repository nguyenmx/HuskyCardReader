// Dashboard Component
// Handles all visual rendering: summary cards, charts, and the swipe log table.
// Reads filter state from Filters and delegates table rendering to SwipeLog.
//
// Public API:
//   Dashboard.initCharts()         - Initialize ECharts instances. Call once after CSV loads.
//   Dashboard.render(allData, formatTimeFn) - Re-render cards, charts, and table using current filters.

var Dashboard = (function () {
  var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var hourChart, dateChart, weekdayChart, heatmapChart, compareChart;

  function initCharts() {
    hourChart = echarts.init(document.getElementById("chart-by-hour"));
    dateChart = echarts.init(document.getElementById("chart-by-date"));
    weekdayChart = echarts.init(document.getElementById("chart-by-weekday"));
    heatmapChart = echarts.init(document.getElementById("chart-heatmap"));
    compareChart = echarts.init(document.getElementById("chart-compare"));

    window.addEventListener("resize", function () {
      hourChart.resize();
      dateChart.resize();
      weekdayChart.resize();
      heatmapChart.resize();
      compareChart.resize();
    });

    ["compare-date-1", "compare-date-2"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", function () {
        renderCompare(window._allData, window._formatTimeFn);
      });
    });

    document.getElementById("clear-compare").addEventListener("click", function () {
      document.getElementById("compare-date-1").value = "";
      document.getElementById("compare-date-2").value = "";
      document.getElementById("compare-chart-row").style.display = "none";
    });
  }

  function hourCountsForDate(allData, date) {
    var counts = {};
    allData.forEach(function (row) {
      if (row.date === date) {
        var h = parseInt(row.time.split(":")[0], 10);
        counts[h] = (counts[h] || 0) + 1;
      }
    });
    return counts;
  }

  function renderCompare(allData, formatTimeFn) {
    var d1 = document.getElementById("compare-date-1").value;
    var d2 = document.getElementById("compare-date-2").value;
    var row = document.getElementById("compare-chart-row");

    if (!d1 || !d2) { row.style.display = "none"; return; }

    row.style.display = "";
    compareChart.resize();
    document.getElementById("compare-chart-title").textContent = "Hourly Comparison — " + d1 + " vs " + d2;

    var counts1 = hourCountsForDate(allData, d1);
    var counts2 = hourCountsForDate(allData, d2);
    var labels = [], vals1 = [], vals2 = [];
    for (var h = 0; h < 24; h++) {
      labels.push(formatTimeFn(h + ":00:00"));
      vals1.push(counts1[h] || 0);
      vals2.push(counts2[h] || 0);
    }

    compareChart.setOption({
      tooltip: { trigger: "axis" },
      legend: { data: [d1, d2] },
      xAxis: { type: "category", data: labels, axisLabel: { rotate: 45 } },
      yAxis: { type: "value", minInterval: 1, name: "Number of Swipes", nameLocation: "middle", nameGap: 35 },
      series: [
        { name: d1, type: "bar", data: vals1, color: "#4b2e83" },
        { name: d2, type: "bar", data: vals2, color: "#b7a57a" }
      ]
    }, true);
  }

  function render(allData, formatTimeFn) {
    window._allData = allData;
    window._formatTimeFn = formatTimeFn;
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

    // Heatmap: day-of-week (y) vs hour (x)
    var heatCounts = {};
    data.forEach(function (row) {
      var hour = parseInt(row.time.split(":")[0], 10);
      var day = new Date(row.date + "T00:00:00").getDay();
      var key = hour + "," + day;
      heatCounts[key] = (heatCounts[key] || 0) + 1;
    });

    var heatData = [];
    var heatMax = 0;
    for (var hd = 0; hd < 7; hd++) {
      for (var hh = 0; hh < 24; hh++) {
        var val = heatCounts[hh + "," + hd] || 0;
        heatData.push([hh, hd, val]);
        if (val > heatMax) heatMax = val;
      }
    }

    var heatHourLabels = [];
    for (var lh = 0; lh < 24; lh++) {
      heatHourLabels.push(formatTimeFn(lh + ":00:00"));
    }

    heatmapChart.setOption({
      tooltip: {
        formatter: function (p) {
          return dayNames[p.data[1]] + " " + heatHourLabels[p.data[0]] + ": " + p.data[2] + " swipe(s)";
        }
      },
      grid: { top: 10, bottom: 60, left: 70, right: 60 },
      xAxis: { type: "category", data: heatHourLabels, axisLabel: { rotate: 45, fontSize: 10 } },
      yAxis: { type: "category", data: dayNames },
      visualMap: {
        min: 0, max: heatMax || 1,
        calculable: false,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        itemHeight: 100,
        inRange: { color: ["#f0ebfa", "#4b2e83"] }
      },
      series: [{ type: "heatmap", data: heatData, emphasis: { itemStyle: { shadowBlur: 6, shadowColor: "rgba(0,0,0,0.3)" } } }]
    }, true);

    renderCompare(allData, formatTimeFn);
    SwipeLog.render(data, formatTimeFn);
  }

  return { initCharts: initCharts, render: render };
})();
