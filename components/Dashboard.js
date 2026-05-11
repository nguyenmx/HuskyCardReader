// Dashboard Component
// Handles all visual rendering: summary cards, charts, and the swipe log table.
// Reads filter state from Filters and delegates table rendering to SwipeLog.
//
// Public API:
//   Dashboard.initCharts()         - Initialize ECharts instances. Call once after CSV loads.
//   Dashboard.render(allData, formatTimeFn) - Re-render cards, charts, and table using current filters.

var Dashboard = (function () {
  var dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var dayAbbrevs = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var hourChart, dateChart, weekdayChart, weekdayPieChart, heatmapChart, compareChart, monthCompareChart, dayCompareChart, hourCompareChart;
  var compareYearsPopulated = false;

  function initCharts() {
    hourChart = echarts.init(document.getElementById("chart-by-hour"));
    dateChart = echarts.init(document.getElementById("chart-by-date"));
    weekdayChart = echarts.init(document.getElementById("chart-by-weekday"));
    weekdayPieChart = echarts.init(document.getElementById("chart-weekday-pie"));
    heatmapChart = echarts.init(document.getElementById("chart-heatmap"));
    compareChart = echarts.init(document.getElementById("chart-compare"));
    monthCompareChart = echarts.init(document.getElementById("chart-month-compare"));
    dayCompareChart = echarts.init(document.getElementById("chart-day-compare"));
    hourCompareChart = echarts.init(document.getElementById("chart-hour-compare"));

    window.addEventListener("resize", function () {
      hourChart.resize();
      dateChart.resize();
      weekdayChart.resize();
      weekdayPieChart.resize();
      heatmapChart.resize();
      compareChart.resize();
      monthCompareChart.resize();
      dayCompareChart.resize();
      hourCompareChart.resize();
    });

    document.getElementById("tab-compare-link").addEventListener("shown.bs.tab", function () {
      var type = document.getElementById("compare-type").value;
      if (type === "month") monthCompareChart.resize();
      else if (type === "day") dayCompareChart.resize();
      else hourCompareChart.resize();
    });

    document.getElementById("compare-type").addEventListener("change", function () {
      var type = this.value;
      ["month", "day", "hour"].forEach(function (t) {
        var show = t === type;
        var ctrl = document.getElementById("compare-controls-" + t);
        var sect = document.getElementById("compare-section-" + t);
        ctrl.className = show ? "d-contents" : "d-contents-hidden";
        ctrl.style.display = show ? "" : "none";
        sect.style.display = show ? "" : "none";
      });
      if (type === "month") monthCompareChart.resize();
      else if (type === "day") dayCompareChart.resize();
      else hourCompareChart.resize();
    });

    ["mc1-month", "mc1-year", "mc2-month", "mc2-year"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", function () {
        renderMonthCompare(window._allData);
      });
    });
    ["day-compare-date-1", "day-compare-date-2"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", function () {
        renderDayCompare(window._allData);
      });
    });
    ["hour-compare-year-1", "hour-compare-year-2"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", function () {
        renderHourCompare(window._allData);
      });
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
      grid: { left: 75, right: 15, top: 40, bottom: 80 },
      xAxis: { type: "category", data: labels, axisLabel: { rotate: 45 } },
      yAxis: { type: "value", minInterval: 1, name: "Number of Swipes", nameLocation: "middle", nameGap: 45 },
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
      document.getElementById("sum-range-label").textContent = "Total Swipes by Date";
      document.getElementById("sum-range").textContent = "—";
    }

    // Swipes by Hour chart
    var hourCounts = {};
    data.forEach(function (row) {
      var hour = parseInt(row.time.split(":")[0], 10);
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    var hourDisplayLabels = [];
    var hourValues = [];
    for (var h = 0; h < 24; h++) {
      var ampm = h >= 12 ? "PM" : "AM";
      hourDisplayLabels.push((h % 12 || 12) + " " + ampm);
      hourValues.push(hourCounts[h] || 0);
    }

    hourChart.setOption({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 75, right: 15, top: 15, bottom: 40 },
      dataZoom: [
        {
          type: "slider",
          xAxisIndex: 0,
          bottom: 0,
          height: 7,
          start: 35,
          end: 65,
          zoomLock: true,
          showDetail: false,
          showDataShadow: false,
          borderColor: "transparent",
          backgroundColor: "#ebebeb",
          fillerColor: "#c8c8c8",
          handleSize: 0,
          moveHandleSize: 0,
          brushSelect: false
        },
        { type: "inside", xAxisIndex: 0, start: 35, end: 65, zoomLock: true }
      ],
      xAxis: {
        type: "category",
        data: hourDisplayLabels,
        axisLabel: { rotate: 45, interval: 0, fontSize: 10 },
        axisTick: { alignWithLabel: true }
      },
      yAxis: { type: "value", minInterval: 1, name: "Number of Swipes", nameLocation: "middle", nameGap: 45 },
      series: [{
        type: "bar",
        data: hourValues,
        color: "#4b2e83",
        barMaxWidth: 30,
        itemStyle: { borderRadius: [3, 3, 0, 0] }
      }]
    }, true);

    // Swipes by Month chart
    var monthAbbrevs = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var monthCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    data.forEach(function (row) {
      var m = parseInt(row.date.split("-")[1], 10) - 1;
      monthCounts[m] += 1;
    });

    dateChart.setOption({
      tooltip: {},
      grid: { left: 75, right: 15, top: 15, bottom: 35 },
      xAxis: { type: "category", data: monthAbbrevs, axisLabel: { interval: 0 } },
      yAxis: { type: "value", minInterval: 1, name: "Number of Swipes", nameLocation: "middle", nameGap: 45 },
      series: [{ type: "bar", data: monthCounts, color: "#b7a57a" }]
    }, true);

    // Traffic Trend by Day of Week chart
    var weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
    data.forEach(function (row) {
      var d = new Date(row.date + "T00:00:00");
      weekdayCounts[d.getDay()] += 1;
    });

    weekdayChart.setOption({
      tooltip: {},
      grid: { left: 75, right: 15, top: 15, bottom: 35 },
      xAxis: { type: "category", data: dayAbbrevs, boundaryGap: false, axisLabel: { interval: 0 }, axisTick: { alignWithLabel: true } },
      yAxis: { type: "value", minInterval: 1, name: "Number of Swipes", nameLocation: "middle", nameGap: 45 },
      series: [{
        type: "line",
        smooth: true,
        data: weekdayCounts,
        color: "#4b2e83",
        areaStyle: { color: "rgba(75, 46, 131, 0.15)" }
      }]
    }, true);

    var pieColors = ["#2d1a5e", "#4b2e83", "#7b5ea7", "#a98fd1", "#d4c5ed", "#b7a57a", "#e0cc8f"];
    weekdayPieChart.setOption({
      tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
      legend: {
        orient: "vertical",
        left: 0,
        top: "middle",
        data: dayNames
      },
      series: [{
        type: "pie",
        radius: ["28%", "85%"],
        center: ["60%", "50%"],
        data: dayNames.map(function (name, i) {
          return { name: name, value: weekdayCounts[i], itemStyle: { color: pieColors[i] } };
        }),
        label: { show: true, position: "inside", formatter: "{d}%", color: "#ffffff", fontSize: 12 },
        labelLine: { length: 10, length2: 10 }
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

    // Populate comparison selectors once
    if (!compareYearsPopulated) {
      var years = [];
      allData.forEach(function (row) {
        var y = row.date.split("-")[0];
        if (years.indexOf(y) === -1) years.push(y);
      });
      years.sort();

      // Month compare: populate year selects and set defaults
      ["mc1-year", "mc2-year"].forEach(function (id, i) {
        var sel = document.getElementById(id);
        years.forEach(function (y) {
          var o = document.createElement("option"); o.value = y; o.textContent = y; sel.appendChild(o);
        });
        sel.value = years[Math.min(i, years.length - 1)];
      });

      // Hour compare: populate year selects
      var hs1 = document.getElementById("hour-compare-year-1");
      var hs2 = document.getElementById("hour-compare-year-2");
      years.forEach(function (y) {
        var o1 = document.createElement("option"); o1.value = y; o1.textContent = y; hs1.appendChild(o1);
        var o2 = document.createElement("option"); o2.value = y; o2.textContent = y; hs2.appendChild(o2);
      });
      if (years.length >= 1) hs1.value = years[0];
      if (years.length >= 2) hs2.value = years[1];

      compareYearsPopulated = true;
    }
    renderMonthCompare(allData);
    renderDayCompare(allData);
    renderHourCompare(allData);

    SwipeLog.render(data, formatTimeFn);
  }

  function renderMonthCompare(allData) {
    var year1 = document.getElementById("mc1-year").value;
    var year2 = document.getElementById("mc2-year").value;
    if (!year1 || !year2) return;

    var monthAbbrevs = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var counts1 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var counts2 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    allData.forEach(function (row) {
      var parts = row.date.split("-");
      var m = parseInt(parts[1], 10) - 1;
      if (parts[0] === year1) counts1[m]++;
      if (parts[0] === year2) counts2[m]++;
    });

    document.getElementById("month-compare-title").textContent = "Monthly Comparison — " + year1 + " vs " + year2;
    monthCompareChart.setOption({
      tooltip: { trigger: "axis" },
      legend: { data: [year1, year2], top: 5 },
      grid: { left: 75, right: 15, top: 40, bottom: 35 },
      xAxis: { type: "category", data: monthAbbrevs, axisLabel: { interval: 0 } },
      yAxis: { type: "value", minInterval: 1, name: "Number of Swipes", nameLocation: "middle", nameGap: 45 },
      series: [
        { name: year1, type: "bar", data: counts1, color: "#4b2e83" },
        { name: year2, type: "bar", data: counts2, color: "#b7a57a" }
      ]
    }, true);
  }

  function renderDayCompare(allData) {
    var d1 = document.getElementById("day-compare-date-1").value;
    var d2 = document.getElementById("day-compare-date-2").value;
    if (!d1 || !d2) return;

    var hourLabels = [];
    for (var h = 0; h < 24; h++) {
      hourLabels.push((h % 12 || 12) + " " + (h >= 12 ? "PM" : "AM"));
    }
    var c1 = hourCountsForDate(allData, d1);
    var c2 = hourCountsForDate(allData, d2);
    var vals1 = [], vals2 = [];
    for (var i = 0; i < 24; i++) { vals1.push(c1[i] || 0); vals2.push(c2[i] || 0); }

    document.getElementById("day-compare-title").textContent = "Day Comparison — " + d1 + " vs " + d2;
    dayCompareChart.setOption({
      tooltip: { trigger: "axis" },
      legend: { data: [d1, d2], top: 5 },
      grid: { left: 75, right: 15, top: 40, bottom: 50 },
      xAxis: { type: "category", data: hourLabels, axisLabel: { interval: 0, fontSize: 10, rotate: 45 } },
      yAxis: { type: "value", minInterval: 1, name: "Number of Swipes", nameLocation: "middle", nameGap: 45 },
      series: [
        { name: d1, type: "bar", data: vals1, color: "#4b2e83" },
        { name: d2, type: "bar", data: vals2, color: "#b7a57a" }
      ]
    }, true);
  }

  function renderHourCompare(allData) {
    var year1 = document.getElementById("hour-compare-year-1").value;
    var year2 = document.getElementById("hour-compare-year-2").value;
    if (!year1 || !year2) return;

    var counts1 = new Array(24).fill(0);
    var counts2 = new Array(24).fill(0);
    var hourLabels = [];
    for (var h = 0; h < 24; h++) {
      hourLabels.push((h % 12 || 12) + " " + (h >= 12 ? "PM" : "AM"));
    }
    allData.forEach(function (row) {
      var y = row.date.split("-")[0];
      if (y !== year1 && y !== year2) return;
      var hr = parseInt(row.time.split(":")[0], 10);
      if (y === year1) counts1[hr]++;
      if (y === year2) counts2[hr]++;
    });

    document.getElementById("hour-compare-title").textContent = "Hour Comparison — " + year1 + " vs " + year2;
    hourCompareChart.setOption({
      tooltip: { trigger: "axis" },
      legend: { data: [year1, year2], top: 5 },
      grid: { left: 75, right: 15, top: 40, bottom: 35 },
      xAxis: { type: "category", data: hourLabels, axisLabel: { interval: 0, fontSize: 10, rotate: 45 } },
      yAxis: { type: "value", minInterval: 1, name: "Number of Swipes", nameLocation: "middle", nameGap: 45 },
      series: [
        { name: year1, type: "bar", data: counts1, color: "#4b2e83" },
        { name: year2, type: "bar", data: counts2, color: "#b7a57a" }
      ]
    }, true);
  }

  return { initCharts: initCharts, render: render };
})();
