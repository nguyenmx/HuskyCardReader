function formatTime(timeStr) {
  var parts = timeStr.split(":");
  var hours = parseInt(parts[0], 10);
  var minutes = parts[1];
  var period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return hours + ":" + minutes + " " + period;
}

var monthNames = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

var allData = [];
var hourChart, dateChart, weekdayChart;

function populateFilters(data) {
  var years = {}, months = {}, days = {};
  data.forEach(function (row) {
    var parts = row.date.split("-");
    years[parts[0]] = true;
    months[parseInt(parts[1], 10)] = true;
    days[parseInt(parts[2], 10)] = true;
  });

  var yearSelect = document.getElementById("filter-year");
  Object.keys(years).sort().reverse().forEach(function (y) {
    var opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });

  var monthSelect = document.getElementById("filter-month");
  for (var m = 1; m <= 12; m++) {
    var opt = document.createElement("option");
    opt.value = m;
    opt.textContent = monthNames[m];
    monthSelect.appendChild(opt);
  }

  var daySelect = document.getElementById("filter-day");
  for (var d = 1; d <= 31; d++) {
    var opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    daySelect.appendChild(opt);
  }
}

function getFilteredData() {
  var year = document.getElementById("filter-year").value;
  var month = document.getElementById("filter-month").value;
  var day = document.getElementById("filter-day").value;
  var startDate = document.getElementById("filter-start-date").value;
  var endDate = document.getElementById("filter-end-date").value;

  return allData.filter(function (row) {
    var parts = row.date.split("-");
    if (year !== "all" && parts[0] !== year) return false;
    if (month !== "all" && parseInt(parts[1], 10) !== parseInt(month, 10)) return false;
    if (day !== "all" && parseInt(parts[2], 10) !== parseInt(day, 10)) return false;
    if (startDate && row.date < startDate) return false;
    if (endDate && row.date > endDate) return false;
    return true;
  });
}

function renderDashboard() {
  var data = getFilteredData();

  // Summary cards
  if (data.length > 0) {
    var times = data.map(function (row) { return row.time; }).sort();
    document.getElementById("earliest-time").textContent = formatTime(times[0]);
    document.getElementById("latest-time").textContent = formatTime(times[times.length - 1]);

    // Sum by selected year (always count from allData, not filtered data)
    var yearFilter = document.getElementById("filter-year").value;
    if (yearFilter !== "all") {
      var yearSum = allData.filter(function (row) { return row.date.split("-")[0] === yearFilter; }).length;
      document.getElementById("sum-year-label").textContent = yearFilter + " Total";
      document.getElementById("sum-year").textContent = yearSum;
    } else {
      document.getElementById("sum-year-label").textContent = "Year Total";
      document.getElementById("sum-year").textContent = allData.length;
    }

    // Sum by selected month
    var monthFilter = document.getElementById("filter-month").value;
    if (monthFilter !== "all") {
      var monthSum = data.filter(function (row) { return parseInt(row.date.split("-")[1], 10) === parseInt(monthFilter, 10); }).length;
      document.getElementById("sum-month-label").textContent = monthNames[parseInt(monthFilter, 10)] + " Total";
      document.getElementById("sum-month").textContent = monthSum;
    } else {
      document.getElementById("sum-month-label").textContent = "Month Total";
      document.getElementById("sum-month").textContent = data.length;
    }

  } else {
    document.getElementById("earliest-time").textContent = "—";
    document.getElementById("latest-time").textContent = "—";
    document.getElementById("sum-year").textContent = "—";
    document.getElementById("sum-year-label").textContent = "Year Total";
    document.getElementById("sum-month").textContent = "—";
    document.getElementById("sum-month-label").textContent = "Month Total";
  }

  // Swipes by Hour chart
  var hourCounts = {};
  data.forEach(function (row) {
    var hour = parseInt(row.time.split(":")[0], 10);
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  var hourLabels = Object.keys(hourCounts).sort(function (a, b) { return a - b; });
  var hourValues = hourLabels.map(function (h) { return hourCounts[h]; });
  var hourDisplayLabels = hourLabels.map(function (h) { return formatTime(h + ":00:00"); });

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

  // Table rows
  var tbody = document.getElementById("table-body");
  tbody.innerHTML = "";
  data.forEach(function (row) {
    var tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + row.id + "</td>" +
      "<td>" + row.name + "</td>" +
      "<td>" + formatTime(row.time) + "</td>" +
      "<td>" + row.date + "</td>";
    tbody.appendChild(tr);
  });
}

Papa.parse("output.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function (results) {
    allData = results.data;

    hourChart = echarts.init(document.getElementById("chart-by-hour"));
    dateChart = echarts.init(document.getElementById("chart-by-date"));
    weekdayChart = echarts.init(document.getElementById("chart-by-weekday"));

    window.addEventListener("resize", function () {
      hourChart.resize();
      dateChart.resize();
      weekdayChart.resize();
    });

    populateFilters(allData);

    // Default year to the most recent year in the data
    var yearSelect = document.getElementById("filter-year");
    if (yearSelect.options.length > 1) {
      yearSelect.value = yearSelect.options[1].value;
    }

    renderDashboard();

    document.getElementById("filter-year").addEventListener("change", renderDashboard);
    document.getElementById("filter-month").addEventListener("change", renderDashboard);
    document.getElementById("filter-day").addEventListener("change", renderDashboard);
    document.getElementById("filter-start-date").addEventListener("change", renderDashboard);
    document.getElementById("filter-end-date").addEventListener("change", renderDashboard);
    document.getElementById("clear-date-range").addEventListener("click", function () {
      document.getElementById("filter-start-date").value = "";
      document.getElementById("filter-end-date").value = "";
      document.getElementById("filter-month").value = "all";
      document.getElementById("filter-day").value = "all";
      renderDashboard();
    });
  }
});
