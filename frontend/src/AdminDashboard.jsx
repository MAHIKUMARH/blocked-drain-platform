import API_URL from "./api";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Clock3,
} from "lucide-react";
import { HoverHighlightText } from "@/components/ui/hover-highlight-text";
import MapView from "./MapView";


function AdminDashboard() {

  // ==========================================
  // STATE
  // ==========================================

  const [stats, setStats] = useState(null);

  const [wardStats, setWardStats] = useState([]);

  const [reports, setReports] = useState([]);

  const [loading, setLoading] = useState(true);

  const [reportsLoading, setReportsLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedReport, setSelectedReport] =
    useState(null);

  const [updatingStatus, setUpdatingStatus] =
    useState(false);

  const [deletingReport, setDeletingReport] =
    useState(false);

  const [error, setError] = useState(null);


  // ==========================================
  // LOAD DASHBOARD DATA
  // ==========================================

  const loadDashboardData = async () => {

    try {

      const [
        statsResponse,
        wardResponse,
        reportsResponse
      ] = await Promise.all([

        fetch(
          `${API_URL}/api/reports/stats`
        ),

        fetch(
          `${API_URL}/api/reports/ward-stats`
        ),

        fetch(
          `${API_URL}/api/reports/`
        )

      ]);


      if (!statsResponse.ok) {
        throw new Error(
          "Failed to load report statistics"
        );
      }


      if (!wardResponse.ok) {
        throw new Error(
          "Failed to load ward statistics"
        );
      }


      if (!reportsResponse.ok) {
        throw new Error(
          "Failed to load reports"
        );
      }


      const statsData =
        await statsResponse.json();

      const wardData =
        await wardResponse.json();

      const reportsData =
        await reportsResponse.json();


      setStats(statsData && typeof statsData === "object" ? statsData : null);

      setWardStats(Array.isArray(wardData) ? wardData : []);

      setReports(Array.isArray(reportsData) ? reportsData : []);

      setError(null);

    } catch (error) {

      console.error(
        "Dashboard loading error:",
        error
      );

      setError(
        "Unable to load dashboard data."
      );

    } finally {

      setLoading(false);

      setReportsLoading(false);

    }

  };


  // ==========================================
  // INITIAL LOAD & REAL-TIME EVENT SYNC
  // ==========================================

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect -- async data fetch, setState is never called synchronously
    void loadDashboardData();

    const handleReportsChanged = () => {
      void loadDashboardData();
    };

    window.addEventListener("reports-changed", handleReportsChanged);

    return () => {
      window.removeEventListener("reports-changed", handleReportsChanged);
    };
  }, []);


  // ==========================================
  // UPDATE REPORT STATUS
  // ==========================================

  const updateStatus = async (newStatus) => {

    if (!selectedReport) {
      return;
    }


    setUpdatingStatus(true);


    try {

      const response = await fetch(

        `${API_URL}/api/reports/${selectedReport.id}/status`,

        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            status: newStatus
          })
        }

      );


      const data = await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ||
          data.error ||
          "Failed to update status"
        );

      }


      // Update selected report

      setSelectedReport((previous) => ({

        ...previous,

        status: data.status

      }));


      // Notify map and other listeners of the status change
      window.dispatchEvent(new Event("reports-changed"));

      // Refresh everything

      await loadDashboardData();

    } catch (error) {

      console.error(
        "Status update error:",
        error
      );

      setError(
        "Unable to update report status."
      );

    } finally {

      setUpdatingStatus(false);

    }

  };

  const deleteReport = async () => {
    if (!selectedReport || deletingReport) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete report ${selectedReport.ticket_id}? This cannot be undone.`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingReport(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/reports/${selectedReport.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to delete report");
      }

      setSelectedReport(null);
      window.dispatchEvent(new Event("reports-changed"));
      await loadDashboardData();
    } catch (error) {
      console.error("Delete report error:", error);
      setError("Unable to delete the report. Please try again.");
    } finally {
      setDeletingReport(false);
    }
  };


  // ==========================================
  // STATUS BADGE
  // ==========================================

  const getStatusClass = (status) => {

    switch (status) {

      case "OPEN":
        return "status-open";

      case "IN_PROGRESS":
        return "status-progress";

      case "RESOLVED":
        return "status-resolved";

      case "CRITICAL":
        return "status-critical";

      default:
        return "status-open";

    }

  };


  // ==========================================
  // FILTER REPORTS
  // ==========================================

  const filteredReports =
    reports.filter((report) => {

      const searchText =
        search.toLowerCase().trim();


      const matchesSearch =
        !searchText ||

        report.ticket_id
          ?.toLowerCase()
          .includes(searchText) ||

        String(report.ward_number || "")
          .includes(searchText) ||

        report.ward_name
          ?.toLowerCase()
          .includes(searchText) ||

        report.description
          ?.toLowerCase()
          .includes(searchText);


      const matchesStatus =
        statusFilter === "ALL" ||
        report.status === statusFilter;


      return (
        matchesSearch &&
        matchesStatus
      );

    });


  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading) {

    return (

      <div className="dashboard-loading">

        Loading Civic Dashboard...

      </div>

    );

  }


  // ==========================================
  // DASHBOARD
  // ==========================================

  return (

    <div className="admin-dashboard">


      {/* ======================================
          HEADER
      ====================================== */}

      <header className="dashboard-header">

        <div className="dashboard-header-copy">

          <div className="dashboard-eyebrow">
            CIVIC ACTION PLATFORM
          </div>

          <HoverHighlightText
            as="h1"
            text="Civic Drain Dashboard"
            baseClassName="dashboard-highlight-heading"
            highlightClassName="dashboard-highlight-heading"
            enableGlow
          />

          <p>
            A live view of drainage reports, ward activity, and response progress.
          </p>

        </div>


        <div className="dashboard-live">

          <span className="dashboard-live-dot"></span>

          System Online

        </div>

      </header>


      {/* ======================================
          ERROR
      ====================================== */}

      {error && (

        <div className="dashboard-error">

          {error}

        </div>

      )}


      {/* ======================================
          STATISTICS
      ====================================== */}

      {stats && (

        <section className="stats-grid">


          <div className="stat-card stat-card-total">

            <div className="stat-card-top">
              <div className="stat-card-icon">
                <BarChart3 size={18} />
              </div>
              <span className="stat-card-label">All activity</span>
            </div>

            <span>
              Total Reports
            </span>

            <strong>
              {stats.total_reports}
            </strong>

          </div>


          <div className="stat-card stat-card-open">

            <div className="stat-card-top">
              <div className="stat-card-icon">
                <CircleAlert size={18} />
              </div>
              <span className="stat-card-label">Needs action</span>
            </div>

            <span>
              Open
            </span>

            <strong>
              {stats.open_reports}
            </strong>

          </div>


          <div className="stat-card stat-card-progress">

            <div className="stat-card-top">
              <div className="stat-card-icon">
                <Clock3 size={18} />
              </div>
              <span className="stat-card-label">In motion</span>
            </div>

            <span>
              In Progress
            </span>

            <strong>
              {stats.in_progress_reports}
            </strong>

          </div>


          <div className="stat-card stat-card-resolved">

            <div className="stat-card-top">
              <div className="stat-card-icon">
                <CheckCircle2 size={18} />
              </div>
              <span className="stat-card-label">Closed well</span>
            </div>

            <span>
              Resolved
            </span>

            <strong>
              {stats.resolved_reports}
            </strong>

          </div>


          <div className="stat-card critical-card">

            <div className="stat-card-top">
              <div className="stat-card-icon">
                <Activity size={18} />
              </div>
              <span className="stat-card-label">Priority watch</span>
            </div>

            <span>
              Critical
            </span>

            <strong>
              {stats.critical_reports}
            </strong>

          </div>


        </section>

      )}


      {/* ======================================
          MAP
      ====================================== */}

      <section className="dashboard-map">


        <div className="section-title">

          <HoverHighlightText
            as="h2"
            text="Kochi Ward Map"
            baseClassName="dashboard-section-highlight-heading"
            highlightClassName="dashboard-section-highlight-heading"
          />

          <span>
            {reports.length} Live Reports
          </span>

        </div>


        <MapView />


      </section>


      {/* ======================================
          REPORT MANAGEMENT
      ====================================== */}

      <section className="report-management">


        <div className="management-header">

          <div>

            <div className="dashboard-eyebrow">
              OPERATIONS
            </div>

            <HoverHighlightText
              as="h2"
              text="Report Management"
              baseClassName="dashboard-section-highlight-heading"
              highlightClassName="dashboard-section-highlight-heading"
            />

            <p>
              Review and manage citizen drainage reports.
            </p>

          </div>


          <div className="report-count">

            {filteredReports.length}

            <span>
              reports
            </span>

          </div>

        </div>


        {/* SEARCH + FILTER */}

        <div className="report-controls">


          <div className="search-box">

            <span>
              🔎
            </span>

            <input

              type="text"

              placeholder="Search ticket, ward or description..."

              value={search}

              onChange={(event) =>
                setSearch(event.target.value)
              }

            />

          </div>


          <select

            value={statusFilter}

            onChange={(event) =>
              setStatusFilter(event.target.value)
            }

            className="status-filter"

          >

            <option value="ALL">
              All Status
            </option>

            <option value="OPEN">
              Open
            </option>

            <option value="IN_PROGRESS">
              In Progress
            </option>

            <option value="RESOLVED">
              Resolved
            </option>

            <option value="CRITICAL">
              Critical
            </option>

          </select>


        </div>


        {/* REPORT TABLE */}

        <div className="reports-table-container">


          {reportsLoading ? (

            <div className="reports-loading">

              Loading reports...

            </div>

          ) : filteredReports.length === 0 ? (

            <div className="no-reports">

              <div>
                📭
              </div>

              <strong>
                No reports found
              </strong>

              <span>
                Try changing your search or filter.
              </span>

            </div>

          ) : (

            <table className="reports-table">


              <thead>

                <tr>

                  <th>
                    Ticket
                  </th>

                  <th>
                    Ward
                  </th>

                  <th>
                    Issue
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Date
                  </th>

                  <th>
                    Action
                  </th>

                </tr>

              </thead>


              <tbody>


                {filteredReports.map(
                  (report) => (

                    <tr key={report.id}>


                      {/* TICKET */}

                      <td>

                        <span className="table-ticket">

                          {report.ticket_id}

                        </span>

                      </td>


                      {/* WARD */}

                      <td>

                        <strong>
                          {report.ward_number
                            ? `Ward ${report.ward_number}`
                            : "Unassigned"}
                        </strong>

                        <small className="table-subtext">

                          {report.ward_name ||
                            "Outside mapped wards"}

                        </small>

                      </td>


                      {/* ISSUE */}

                      <td>

                        <div className="issue-cell">

                          <strong>
                            {report.category ||
                              "Drain Blockage"}
                          </strong>

                          <span>
                            {report.description ||
                              "No description"}
                          </span>

                        </div>

                      </td>


                      {/* STATUS */}

                      <td>

                        <span
                          className={`status-badge ${getStatusClass(
                            report.status
                          )}`}
                        >

                          <span className="status-badge-dot"></span>

                          {report.status}

                        </span>

                      </td>


                      {/* DATE */}

                      <td>

                        <span className="table-date">

                          {report.created_at
                            ? new Date(
                                report.created_at
                              ).toLocaleDateString()
                            : "—"}

                        </span>

                      </td>


                      {/* ACTION */}

                      <td>

                        <button

                          className="manage-button"

                          onClick={() =>
                            setSelectedReport(
                              report
                            )
                          }

                        >

                          Manage

                        </button>

                      </td>


                    </tr>

                  )
                )}


              </tbody>

            </table>

          )}


        </div>


      </section>


      {/* ======================================
          WARD STATISTICS
      ====================================== */}

      <section className="ward-section">


        <div className="section-title">

          <HoverHighlightText
            as="h2"
            text="Reports by Ward"
            baseClassName="dashboard-section-highlight-heading"
            highlightClassName="dashboard-section-highlight-heading"
          />

        </div>


        <div className="ward-table-container">

          <table className="ward-table">


            <thead>

              <tr>

                <th>
                  Ward
                </th>

                <th>
                  Area
                </th>

                <th>
                  Total
                </th>

                <th>
                  Open
                </th>

                <th>
                  In Progress
                </th>

                <th>
                  Resolved
                </th>

              </tr>

            </thead>


            <tbody>


              {wardStats.map((ward, index) => (

                <tr
                  key={`${ward.ward_number ?? "unassigned"}-${ward.ward_name ?? ""}-${index}`}
                >

                  <td>
                    Ward {ward.ward_number}
                  </td>

                  <td>
                    {ward.ward_name}
                  </td>

                  <td>
                    {ward.total_reports}
                  </td>

                  <td>
                    {ward.open_reports}
                  </td>

                  <td>
                    {ward.in_progress_reports}
                  </td>

                  <td>
                    {ward.resolved_reports}
                  </td>

                </tr>

              ))}


            </tbody>


          </table>

        </div>


      </section>


      {/* ======================================
          REPORT MANAGEMENT MODAL
      ====================================== */}

      {selectedReport && (

        <div
          className="report-modal-overlay"

          onClick={() =>
            setSelectedReport(null)
          }

        >

          <div

            className="report-modal"

            onClick={(event) =>
              event.stopPropagation()
            }

          >


            {/* MODAL HEADER */}

            <div className="modal-header">

              <div>

                <span className="modal-label">
                  REPORT
                </span>

                <HoverHighlightText
                  as="h2"
                  text={selectedReport.ticket_id}
                  baseClassName="modal-highlight-heading"
                  highlightClassName="modal-highlight-heading"
                />

              </div>


              <button

                className="modal-close"

                onClick={() =>
                  setSelectedReport(null)
                }

              >

                ×

              </button>

            </div>


            {/* REPORT DETAILS */}

            <div className="modal-details">


              <div className="modal-detail">

                <span>
                  Ward
                </span>

                <strong>

                  {selectedReport.ward_number
                    ? `Ward ${selectedReport.ward_number}`
                    : "Not identified"}

                </strong>

              </div>


              <div className="modal-detail">

                <span>
                  Area
                </span>

                <strong>

                  {selectedReport.ward_name ||
                    "Not available"}

                </strong>

              </div>


              <div className="modal-detail">

                <span>
                  Category
                </span>

                <strong>

                  {selectedReport.category ||
                    "Drain Blockage"}

                </strong>

              </div>


              <div className="modal-detail">

                <span>
                  Coordinates
                </span>

                <strong>

                  {selectedReport.latitude},
                  {" "}
                  {selectedReport.longitude}

                </strong>

              </div>


            </div>


            {/* REPORT EVIDENCE */}

            {selectedReport.image_path && (
              <div className="modal-evidence">

                <div className="modal-evidence-header">
                  <span>REPORT EVIDENCE</span>
                </div>

                <div className="modal-image-container">
                  <img
                    src={`${API_URL}/${selectedReport.image_path.replace(/\\/g, "/").replace(/^\/+/, "")}`}
                    alt={`Evidence for ${selectedReport.ticket_id}`}
                    className="report-evidence-image"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>

              </div>
            )}


            {/* DESCRIPTION */}

            <div className="modal-description">

              <span>
                DESCRIPTION
              </span>

              <p>

                {selectedReport.description ||
                  "No description provided."}

              </p>

            </div>


            {/* CURRENT STATUS */}

            <div className="modal-status">

              <span>
                CURRENT STATUS
              </span>

              <div>

                <span
                  className={`status-badge ${getStatusClass(
                    selectedReport.status
                  )}`}
                >

                  <span className="status-badge-dot"></span>

                  {selectedReport.status}

                </span>

              </div>

            </div>


            {/* STATUS CONTROLS */}

            <div className="status-actions">

              <span>
                UPDATE STATUS
              </span>


              <div className="status-buttons">


                <button

                  className="status-action open-action"

                  disabled={
                    updatingStatus ||
                    selectedReport.status === "OPEN"
                  }

                  onClick={() =>
                    updateStatus("OPEN")
                  }

                >

                  Open

                </button>


                <button

                  className="status-action progress-action"

                  disabled={
                    updatingStatus ||
                    selectedReport.status ===
                      "IN_PROGRESS"
                  }

                  onClick={() =>
                    updateStatus(
                      "IN_PROGRESS"
                    )
                  }

                >

                  In Progress

                </button>


                <button

                  className="status-action resolved-action"

                  disabled={
                    updatingStatus ||
                    selectedReport.status ===
                      "RESOLVED"
                  }

                  onClick={() =>
                    updateStatus(
                      "RESOLVED"
                    )
                  }

                >

                  Resolved

                </button>


                <button

                  className="status-action critical-action"

                  disabled={
                    updatingStatus ||
                    selectedReport.status ===
                      "CRITICAL"
                  }

                  onClick={() =>
                    updateStatus(
                      "CRITICAL"
                    )
                  }

                >

                  Critical

                </button>


              </div>


              {updatingStatus && (

                <div className="status-updating">

                  Updating report status...

                </div>

              )}


            </div>

            <div className="modal-danger-zone">
              <div>
                <strong>Remove this report</strong>
                <span>Delete the report and its uploaded evidence permanently.</span>
              </div>
              <button
                type="button"
                className="delete-report-button"
                disabled={deletingReport || updatingStatus}
                onClick={deleteReport}
              >
                {deletingReport ? "Deleting..." : "Delete report"}
              </button>
            </div>


          </div>

        </div>

      )}


    </div>

  );

}


export default AdminDashboard;