var SwipeLog = (function () {
  var sortCol = null;
  var sortDir = "asc";

  function init(onSortChange) {
    document.getElementById("reset-sort").addEventListener("click", function () {
      sortCol = null;
      sortDir = "asc";
      onSortChange();
    });

    ["time", "date", "name"].forEach(function (col) {
      document.getElementById("sort-" + col).addEventListener("click", function () {
        if (sortCol === col) {
          sortDir = sortDir === "asc" ? "desc" : "asc";
        } else {
          sortCol = col;
          sortDir = "asc";
        }
        onSortChange();
      });
    });
  }

  function render(data, formatTimeFn) {
    var tbody = document.getElementById("table-body");
    tbody.innerHTML = "";

    var rows = data.slice();
    if (sortCol) {
      rows.sort(function (a, b) {
        var valA = (a[sortCol] || "").toLowerCase();
        var valB = (b[sortCol] || "").toLowerCase();
        return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    } else {
      rows.reverse();
    }

    ["time", "date", "name"].forEach(function (col) {
      var arrowEl = document.getElementById("sort-arrow-" + col);
      if (sortCol === col) {
        arrowEl.textContent = sortDir === "asc" ? "↑" : "↓";
        arrowEl.style.color = "#4b2e83";
      } else {
        arrowEl.textContent = "⇅";
        arrowEl.style.color = "#6c757d";
      }
    });

    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + row.id + "</td>" +
        "<td>" + (row.name || "NULL") + "</td>" +
        "<td>" + formatTimeFn(row.time) + "</td>" +
        "<td>" + row.date + "</td>";
      tbody.appendChild(tr);
    });
  }

  function highlightLatest() {
    var firstRow = document.querySelector("#table-body tr");
    if (firstRow) {
      firstRow.style.backgroundColor = "#e8e0f5";
      setTimeout(function () { firstRow.style.backgroundColor = ""; }, 2000);
    }
  }

  return { init: init, render: render, highlightLatest: highlightLatest };
})();
