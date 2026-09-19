import { useEffect, useState } from "react";

import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup
} from "react-leaflet";

import MarkerClusterGroup from "react-leaflet-cluster";
import { divIcon } from "leaflet";
import API_URL from "./api";

import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";

function MapView() {

  const [wards, setWards] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);


  // ==========================================
  // LOAD WARDS + REPORTS
  // ==========================================

  useEffect(() => {
    let isMounted = true;

    const loadJson = async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${url} returned ${response.status}`);
      }
      return response.json();
    };

    const loadReports = () =>
      loadJson(`${API_URL}/api/map/reports`)
        .then((reportData) => {
          if (!isMounted) return;
          const validReports = (reportData.reports || []).filter(
            (report) =>
              Number.isFinite(Number(report.latitude)) &&
              Number.isFinite(Number(report.longitude))
          );
          setReports(validReports);
        })
        .catch((error) => {
          console.error("Unable to refresh map reports:", error);
        });

    const handleReportsChanged = () => {
      loadReports();
    };

    window.addEventListener("reports-changed", handleReportsChanged);

    Promise.allSettled([
      loadJson(`${API_URL}/api/map/wards`),
      loadReports()
    ])
      .then(([wardResult]) => {
        if (!isMounted) return;

        // ------------------------------------------
        // WARDS
        // ------------------------------------------
        if (wardResult.status === "fulfilled") {
          const wardData = wardResult.value;

          setWards({
            ...wardData,
            features: (wardData.features || []).map((feature) => {
              let geometry = feature.geometry;
              if (typeof geometry === "string") {
                try {
                  geometry = JSON.parse(geometry);
                } catch {
                  geometry = null;
                }
              }
              return {
                ...feature,
                geometry
              };
            }).filter((f) => f.geometry)
          });
        } else {
          console.error(
            "Unable to load ward boundaries:",
            wardResult.reason
          );
        }

        setLoading(false);
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error("Map loading error:", error);
        setLoading(false);
      });

    return () => {
      isMounted = false;
      window.removeEventListener("reports-changed", handleReportsChanged);
    };
  }, []);


  // ==========================================
  // WARD STYLE
  // ==========================================

  const wardStyle = () => ({
    color: "#6bd6c2",
    weight: 1,
    fillColor: "#173136",
    fillOpacity: 0.25
  });


  // ==========================================
  // WARD POPUP
  // ==========================================

  const onEachWard = (feature, layer) => {
    const properties = feature.properties || {};

    layer.bindPopup(`
      <div style="
        min-width: 180px;
        line-height: 1.6;
      ">
        <strong>
          Ward ${properties.ward_number ?? "N/A"}
        </strong>
        <br />
        <span>
          ${properties.ward_name ?? "Unnamed Ward"}
        </span>
        <br />
        <small>
          ${properties.local_body ?? "Local body unavailable"}
        </small>
      </div>
    `);
  };


  // ==========================================
  // REPORT MARKER COLOR
  // ==========================================

  const getMarkerColor = (status) => {
    switch (status) {
      case "CRITICAL":
        return "#ff1744"; // Bright red emergency
      case "IN_PROGRESS":
        return "#ff9800"; // Orange
      case "RESOLVED":
        return "#00c853"; // Green
      case "OPEN":
      default:
        return "#ff7e5f"; // Coral / brand primary
    }
  };


  // ==========================================
  // REPORT MARKER SIZE
  // ==========================================

  const getMarkerSize = (status) => {
    switch (status) {
      case "CRITICAL":
        return 22;
      case "IN_PROGRESS":
        return 20;
      case "RESOLVED":
        return 16;
      case "OPEN":
      default:
        return 18;
    }
  };


  // ==========================================
  // CREATE CUSTOM STATUS MARKER
  // ==========================================

  const createReportIcon = (status) => {
    const color = getMarkerColor(status);
    const size = getMarkerSize(status);

    return divIcon({
      className: "report-marker-wrapper",
      html: `
        <div
          class="report-marker"
          style="
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border: 3px solid rgba(255,255,255,0.95);
            box-shadow:
              0 0 12px ${color},
              0 3px 10px rgba(0,0,0,0.45);
          "
        ></div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2]
    });
  };


  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="map-loading">
        Loading Kochi ward boundaries...
      </div>
    );
  }


  // ==========================================
  // MAP
  // ==========================================

  return (
    <div className="map-wrapper">
      <MapContainer
        center={[9.9674, 76.2673]}
        zoom={13}
        className="civic-map"
      >
        {/* OPENSTREETMAP */}
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* WARD BOUNDARIES */}
        {wards && (
          <GeoJSON
            data={wards}
            style={wardStyle}
            onEachFeature={onEachWard}
          />
        )}

        {/* REPORT MARKERS + CLUSTERING */}
        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom={true}
          zoomToBoundsOnClick={true}
          maxClusterRadius={50}
        >
          {reports.map((report) => (
            <Marker
              key={report.id}
              position={[
                Number(report.latitude),
                Number(report.longitude)
              ]}
              icon={createReportIcon(report.status)}
            >
              <Popup>
                <div
                  style={{
                    minWidth: "230px",
                    lineHeight: "1.6"
                  }}
                >
                  {/* TICKET */}
                  <strong style={{ fontSize: "15px" }}>
                    {report.ticket_id}
                  </strong>

                  <hr />

                  {/* EVIDENCE IMAGE */}
                  {report.image_path && (
                    <div style={{ marginTop: "6px", marginBottom: "8px" }}>
                      <img
                        src={`${API_URL}/${report.image_path.replace(/\\/g, "/").replace(/^\/+/, "")}`}
                        alt={`Evidence for ${report.ticket_id}`}
                        style={{
                          width: "100%",
                          maxHeight: "130px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: "1px solid rgba(255,255,255,0.15)"
                        }}
                      />
                    </div>
                  )}

                  {/* STATUS */}
                  <div>
                    <strong>Status:</strong>{" "}
                    <span
                      style={{
                        fontWeight: "700",
                        color: getMarkerColor(report.status)
                      }}
                    >
                      {report.status}
                    </span>
                  </div>

                  {/* WARD */}
                  <div>
                    <strong>Ward:</strong>{" "}
                    {report.ward_number
                      ? `Ward ${report.ward_number}`
                      : "Not identified"}
                  </div>

                  {/* AREA */}
                  <div>
                    <strong>Area:</strong>{" "}
                    {report.ward_name || "Not available"}
                  </div>

                  {/* LOCALITY */}
                  {report.local_body && (
                    <div>
                      <strong>Locality:</strong>{" "}
                      {report.local_body}
                    </div>
                  )}

                  {/* DESCRIPTION */}
                  <p
                    style={{
                      marginTop: "10px",
                      marginBottom: "8px"
                    }}
                  >
                    {report.description || "No description provided."}
                  </p>

                  {/* CATEGORY */}
                  <small>
                    {report.category || "Drain Blockage"}
                  </small>

                  {/* DATE */}
                  {report.created_at && (
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "11px",
                        color: "#777"
                      }}
                    >
                      Reported:{" "}
                      {new Date(report.created_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* MAP LEGEND */}
      <div className="map-legend">
        <div className="legend-title">Report Status</div>

        <div className="legend-item">
          <span className="legend-dot open"></span>
          Open
        </div>

        <div className="legend-item">
          <span className="legend-dot progress"></span>
          In Progress
        </div>

        <div className="legend-item">
          <span className="legend-dot resolved"></span>
          Resolved
        </div>

        <div className="legend-item">
          <span className="legend-dot critical"></span>
          Critical
        </div>
      </div>
    </div>
  );
}

export default MapView;