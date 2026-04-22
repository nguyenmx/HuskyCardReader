function formatTime(timeStr) {
  var parts = timeStr.split(":");
  var hours = parseInt(parts[0], 10);
  var minutes = parts[1];
  var period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return hours + ":" + minutes + " " + period;
}

var allData = [];

function renderDashboard() {
  Dashboard.render(allData, formatTime);
}

// Renders initial test data onto the dashboard for testing.
Papa.parse("excel-test-data/output.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function (results) {
    allData = results.data;

    Dashboard.initCharts();
    Filters.populate(allData);

    var yearSelect = document.getElementById("filter-year");
    if (yearSelect.options.length > 1) {
      yearSelect.value = yearSelect.options[1].value;
    }

    SwipeLog.init(renderDashboard);
    Filters.init(renderDashboard);

    renderDashboard();

    if (typeof EventSource !== "undefined") {
      var evtSource = new EventSource("/stream");

      evtSource.onmessage = function (event) {
        var swipe = JSON.parse(event.data);
        allData.push(swipe);
        Filters.addNewYear(swipe.date.split("-")[0]);
        renderDashboard();
        SwipeLog.highlightLatest();
      };

      evtSource.onerror = function () {
        console.warn("SSE connection lost — live updates paused.");
      };
    }
  }
});
