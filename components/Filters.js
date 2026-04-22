// Filters Component
// Manages the filter dropdowns (Year, Month, Day, Start/End Date) and data filtering.
//
// Public API:
//   Filters.populate(data)        - Build year/month/day dropdown options from loaded data.
//   Filters.getFiltered(allData)  - Return rows matching the current filter selections.
//   Filters.getValues()           - Return current filter values { year, month, startDate, endDate }.
//   Filters.addNewYear(year)      - Add a new year option to the dropdown (used on live swipe).
//   Filters.init(onChange)        - Attach change/clear event listeners to all filter controls.
//   Filters.monthNames            - Array of month name strings (index 1–12).

var Filters = (function () {
  var monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  function populate(data) {
    var years = {};
    data.forEach(function (row) {
      years[row.date.split("-")[0]] = true;
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

  function getFiltered(allData) {
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

  function getValues() {
    return {
      year: document.getElementById("filter-year").value,
      month: document.getElementById("filter-month").value,
      startDate: document.getElementById("filter-start-date").value,
      endDate: document.getElementById("filter-end-date").value,
    };
  }

  function addNewYear(year) {
    var yearSelect = document.getElementById("filter-year");
    var exists = Array.from(yearSelect.options).some(function (o) { return o.value === year; });
    if (!exists) {
      var opt = document.createElement("option");
      opt.value = year;
      opt.textContent = year;
      yearSelect.insertBefore(opt, yearSelect.options[1]);
    }
  }

  function init(onChange) {
    ["filter-year", "filter-month", "filter-day",
     "filter-start-date", "filter-end-date"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", onChange);
    });

    document.getElementById("clear-date-range").addEventListener("click", function () {
      document.getElementById("filter-start-date").value = "";
      document.getElementById("filter-end-date").value = "";
      document.getElementById("filter-month").value = "all";
      document.getElementById("filter-day").value = "all";
      onChange();
    });
  }

  return { populate: populate, getFiltered: getFiltered, getValues: getValues, addNewYear: addNewYear, init: init, monthNames: monthNames };
})();
