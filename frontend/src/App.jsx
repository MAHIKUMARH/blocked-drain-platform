import { useEffect, useState } from "react";
import axios from "axios";
import {
  Camera,
  MapPin,
  Upload,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";


import MapView from "./MapView";
import AdminDashboard from "./AdminDashboard";
import Auralis from "@/components/ui/auralis";
import { CinematicFooter } from "@/components/ui/motion-footer";
import { HoverHighlightText } from "@/components/ui/hover-highlight-text";
import "./App.css";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, 1050);

    const removeTimer = window.setTimeout(() => {
      setIsLoading(false);
    }, 1750);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  useEffect(() => {
    let frame = 0;

    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 28);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      {isLoading && (
      <main className={`entry-loader ${isExiting ? "is-exiting" : ""}`} aria-live="polite">
        <div className="entry-loader-orbit entry-loader-orbit-one" />
        <div className="entry-loader-orbit entry-loader-orbit-two" />
        <div className="entry-loader-content">
          <div className="entry-loader-mark">
            <MapPin size={24} />
          </div>
          <p className="entry-loader-kicker">Kochi civic action platform</p>
          <h1>DrainWatch</h1>
          <p className="entry-loader-status">Preparing your civic workspace</p>
          <div className="entry-loader-track">
            <span />
          </div>
        </div>
      </main>
      )}

    <Auralis
      className="auralis-background"
      colors={["#22d3ee", "#2dd4bf", "#0e7490"]}
      speed={0.32}
      grain={0.42}
      height="100vh"
    />

    <div className={`app-stage ${isExiting ? "is-entered" : ""}`}>
      <div className="site-aurora dark">
        <div className="site-shell">
          <header className={`site-header ${isScrolled ? "is-scrolled" : ""}`}>
            <div className="site-brand">
              <div className="logo-icon">
                <MapPin size={20} />
              </div>
              <div>
                <strong>DrainWatch</strong>
                <span>Civic reporting platform</span>
              </div>
            </div>

            <div className="site-status">
              <span className="status-dot"></span>
              System online
            </div>
          </header>

          <div id="dashboard">
            <AdminDashboard />
          </div>

          <ReportForm />
          <CinematicFooter />
        </div>
      </div>
    </div>
    </>
  );

}

function ReportForm() {

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const [location, setLocation] = useState({
    latitude: "",
    longitude: "",
    wardNumber: "",
    area: "",
    locality: "",
  });

  const [locationMode, setLocationMode] = useState("manual");

  const [description, setDescription] = useState("");

  const [loadingLocation, setLoadingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  // Duplicate detection
  const [duplicateReports, setDuplicateReports] = useState([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateChecked, setDuplicateChecked] = useState(false);
  const [submitAnyway, setSubmitAnyway] = useState(false);


  // --------------------------------
  // IMAGE SELECTION
  // --------------------------------

  const handleImageChange = (event) => {

    const file = event.target.files[0];

    if (!file) return;

    setImage(file);

    setPreview(URL.createObjectURL(file));

    setError(null);
  };


  // --------------------------------
  // GET CURRENT LOCATION
  // --------------------------------

  const getLocation = () => {

    if (!navigator.geolocation) {

      setError(
        "Geolocation is not supported by your browser."
      );

      return;
    }

    setLoadingLocation(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {

        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          wardNumber: "",
          area: "",
          locality: "",
        });

        setLoadingLocation(false);
      },

      () => {

        setError(
          "Unable to access your location. Please allow location permission."
        );

        setLoadingLocation(false);
      }
    );
  };


  // --------------------------------
  // SUBMIT REPORT
  // --------------------------------

  const checkForDuplicates = async () => {
    if (!location.latitude || !location.longitude) {
      setError("Please provide your location before checking for duplicates.");
      return false;
    }

    try {
      setCheckingDuplicates(true);
      setError(null);

      const response = await axios.get(
        "http://127.0.0.1:8000/api/reports/nearby",
        {
          params: {
            latitude: location.latitude,
            longitude: location.longitude,
            radius: 100
          }
        }
      );

      const reports = response.data?.reports || [];

      setDuplicateReports(reports);
      setDuplicateChecked(true);

      return reports.length > 0;
    } catch (err) {
      console.error("Duplicate detection error:", err);
      setError(
        "Unable to check for existing reports. You can still submit your report."
      );
      return false;
    } finally {
      setCheckingDuplicates(false);
    }
  };


  // --------------------------------
  // SUBMIT REPORT
  // --------------------------------

  const handleSubmit = async (event) => {

    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (!image) {
      setError("Please upload a photo of the blockage.");
      return;
    }

    if (!location.latitude || !location.longitude) {
      setError("Please provide latitude and longitude for the selected location.");
      return;
    }

    if (locationMode === "manual" && (!location.wardNumber || !location.area.trim() || !location.locality.trim())) {
      setError("Please provide the ward number, area, and locality.");
      return;
    }

    if (!description.trim()) {
      setError("Please describe the blockage.");
      return;
    }

    // Check nearby reports before creating a new ticket.
    // The user can explicitly choose to submit anyway.
    if (!duplicateChecked && !submitAnyway) {
      const foundDuplicate = await checkForDuplicates();

      if (foundDuplicate) {
        return;
      }
    }

    const formData = new FormData();

    formData.append("image", image);
    formData.append("latitude", location.latitude);
    formData.append("longitude", location.longitude);
    formData.append("description", description);
    if (locationMode === "manual") {
      formData.append("ward_number", location.wardNumber);
      formData.append("ward_name", location.area.trim());
      formData.append("local_body", location.locality.trim());
    }

    try {

      setSubmitting(true);

      const response = await axios.post(
        "http://127.0.0.1:8000/api/reports/",
        formData
      );

      setSuccess(response.data);

      // Reset form
      setImage(null);
      setPreview(null);
      setDescription("");

      setLocation({
        latitude: "",
        longitude: "",
        wardNumber: "",
        area: "",
        locality: "",
      });

      window.dispatchEvent(new Event("reports-changed"));

      setDuplicateReports([]);
      setDuplicateChecked(false);
      setSubmitAnyway(false);

    } catch (err) {

      console.error(err);

      setError(
        "Unable to submit the report. Please try again."
      );

    } finally {

      setSubmitting(false);

    }

  };


  return (

    <div className="app">

      {/* MAIN */}

      <main className="container">

        <section className="hero">

          <span className="badge">
            CIVIC ACTION PLATFORM
          </span>

          <HoverHighlightText
            as="h1"
            text="Report a blockage. Start the action."
            baseClassName="hero-highlight-heading"
            highlightClassName="hero-highlight-heading"
            enableGlow
          />

          <p>

            Capture the problem, share its location,
            and create a trackable civic report.

          </p>

        </section>


        {/* REPORT CARD */}

        <section id="report-form" className="report-card">

          <form onSubmit={handleSubmit}>

          <section className="map-section">

  <div className="map-heading">

    <span className="badge">
      CIVIC MAP
    </span>

    <HoverHighlightText
      as="h2"
      text="Kochi Ward Map"
      baseClassName="map-highlight-heading"
      highlightClassName="map-highlight-heading"
      enableGlow
    />

    <p>
      Explore municipal ward boundaries and civic reports.
    </p>

  </div>

  <MapView />

</section>
            {/* PHOTO */}

            <div className="form-section">

              <div className="section-title">

                <div className="step-number">
                  01
                </div>

                <div>

                  <HoverHighlightText
                    as="h2"
                    text="Capture the blockage"
                    baseClassName="form-highlight-heading"
                    highlightClassName="form-highlight-heading"
                  />

                  <p>
                    Upload a clear photograph of the drain or canal.
                  </p>

                </div>

              </div>


              <label className="upload-area">

                {preview ? (

                  <div className="preview-container">

                    <img
                      src={preview}
                      alt="Blockage preview"
                    />

                    <div className="change-image">
                      <Camera size={18} />
                      Change photo
                    </div>

                  </div>

                ) : (

                  <div className="upload-content">

                    <div className="upload-icon">
                      <Upload size={28} />
                    </div>

                    <HoverHighlightText
                      as="h3"
                      text="Upload a photo"
                      baseClassName="form-highlight-heading upload-highlight-heading"
                      highlightClassName="form-highlight-heading upload-highlight-heading"
                    />

                    <p>
                      JPG, PNG or WEBP
                    </p>

                  </div>

                )}

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  hidden
                />

              </label>

            </div>


            {/* LOCATION */}

            <div className="form-section">

              <div className="section-title">

                <div className="step-number">
                  02
                </div>

                <div>

                  <HoverHighlightText
                    as="h2"
                    text="Locate the problem"
                    baseClassName="form-highlight-heading"
                    highlightClassName="form-highlight-heading"
                  />

                  <p>
                    We need your location to identify the responsible ward.
                  </p>

                </div>

              </div>


              <div className="location-box">

                <div className="location-mode-toggle" role="group" aria-label="Location source">
                  <button
                    type="button"
                    className={locationMode === "manual" ? "active" : ""}
                    onClick={() => setLocationMode("manual")}
                  >
                    Enter another location
                  </button>
                  <button
                    type="button"
                    className={locationMode === "current" ? "active" : ""}
                    onClick={() => setLocationMode("current")}
                  >
                    Use my location
                  </button>
                </div>

                {locationMode === "manual" ? (
                  <div className="manual-location-fields">
                    <label>
                      Ward number
                      <input
                        type="number"
                        min="1"
                        value={location.wardNumber}
                        onChange={(event) => setLocation({ ...location, wardNumber: event.target.value })}
                        placeholder="e.g. 12"
                        required
                      />
                    </label>
                    <label>
                      Area
                      <input
                        value={location.area}
                        onChange={(event) => setLocation({ ...location, area: event.target.value })}
                        placeholder="e.g. Fort Kochi"
                        required
                      />
                    </label>
                    <label>
                      Locality
                      <input
                        value={location.locality}
                        onChange={(event) => setLocation({ ...location, locality: event.target.value })}
                        placeholder="e.g. Mattancherry"
                        required
                      />
                    </label>
                    <label>
                      Latitude
                      <input
                        type="number"
                        step="any"
                        value={location.latitude}
                        onChange={(event) => setLocation({ ...location, latitude: event.target.value })}
                        placeholder="e.g. 9.9674"
                        required
                      />
                    </label>
                    <label>
                      Longitude
                      <input
                        type="number"
                        step="any"
                        value={location.longitude}
                        onChange={(event) => setLocation({ ...location, longitude: event.target.value })}
                        placeholder="e.g. 76.2673"
                        required
                      />
                    </label>
                  </div>
                ) : (
                <>
                <div className="location-info">

                  <div className="location-icon">
                    <MapPin size={22} />
                  </div>

                  <div>

                    <strong>
                      {location.latitude
                        ? "Location captured"
                        : "Location not provided"}
                    </strong>

                    {location.latitude && (

                      <small>

                        {Number(location.latitude).toFixed(6)}
                        {" , "}
                        {Number(location.longitude).toFixed(6)}

                      </small>

                    )}

                  </div>

                </div>


                <button
                  type="button"
                  className="location-button"
                  onClick={getLocation}
                  disabled={loadingLocation}
                >

                  {loadingLocation ? (

                    <>
                      <Loader2
                        size={17}
                        className="spin"
                      />

                      Getting location...

                    </>

                  ) : (

                    <>
                      <MapPin size={17} />

                      Use my location

                    </>

                  )}

                </button>
                </>
                )}

              </div>

            </div>


            {/* DESCRIPTION */}

            <div className="form-section">

              <div className="section-title">

                <div className="step-number">
                  03
                </div>

                <div>

                  <HoverHighlightText
                    as="h2"
                    text="Describe the issue"
                    baseClassName="form-highlight-heading"
                    highlightClassName="form-highlight-heading"
                  />

                  <p>
                    Tell us what you observed.
                  </p>

                </div>

              </div>


              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="Example: Storm drain is blocked with plastic waste and water is unable to flow..."
                rows="5"
              />

            </div>


            {/* DUPLICATE WARNING */}

            {duplicateReports.length > 0 && !submitAnyway && (
              <div className="duplicate-warning">

                <div className="duplicate-warning-header">
                  <AlertCircle size={22} />

                  <div>
                    <strong>
                      Possible duplicate report
                    </strong>

                    <p>
                      A similar civic report already exists within 100 meters
                      of this location.
                    </p>
                  </div>
                </div>

                <div className="duplicate-list">

                  {duplicateReports.map((report) => (
                    <div
                      className="duplicate-report-card"
                      key={report.id}
                    >

                      <div className="duplicate-report-main">

                        <strong>
                          {report.ticket_id}
                        </strong>

                        <span>
                          {report.distance_meters} m away
                        </span>

                      </div>

                      <div className="duplicate-report-meta">

                        <span>
                          Status: {report.status}
                        </span>

                        <span>
                          {report.ward_number
                            ? `Ward ${report.ward_number}`
                            : "Ward not identified"}
                        </span>

                        {report.ward_name && (
                          <span>
                            {report.ward_name}
                          </span>
                        )}

                      </div>

                      {report.description && (
                        <p className="duplicate-report-description">
                          "{report.description}"
                        </p>
                      )}

                    </div>
                  ))}

                </div>

                <div className="duplicate-warning-actions">

                  <button
                    type="button"
                    className="duplicate-cancel-button"
                    onClick={() => {
                      setDuplicateReports([]);
                      setDuplicateChecked(false);
                    }}
                  >
                    Review details
                  </button>

                  <button
                    type="button"
                    className="duplicate-submit-button"
                    onClick={() => {
                      setSubmitAnyway(true);
                      setDuplicateChecked(true);
                    }}
                  >
                    Submit as new report
                  </button>

                </div>

              </div>
            )}


            {checkingDuplicates && (
              <div className="duplicate-checking">
                <Loader2 size={18} className="spin" />
                Checking for nearby reports...
              </div>
            )}


            {/* ERROR */}

            {error && (

              <div className="message error">

                <AlertCircle size={20} />

                {error}

              </div>

            )}


            {/* SUCCESS */}

{success && (

  <div className="message success">

    <CheckCircle size={22} />

    <div className="success-content">

      <strong>
        Report submitted successfully!
      </strong>

      <p>
        Your civic report has been created and assigned to the responsible ward.
      </p>

      <div className="ticket-section">

        <span className="result-label">
          Ticket ID
        </span>

        <span className="ticket-id">
          {success.ticket_id}
        </span>

      </div>


      <div className="report-details">

        <div className="detail-row">

          <span className="result-label">
            📍 Location
          </span>

          <span>
            {Number(success.latitude).toFixed(6)}
            {" , "}
            {Number(success.longitude).toFixed(6)}
          </span>

        </div>


        <div className="detail-row">

          <span className="result-label">
            🏛️ Responsible Ward
          </span>

          <span>
            {success.ward_number
              ? `Ward ${success.ward_number}`
              : "Ward not identified"}
          </span>

        </div>


        <div className="detail-row">

          <span className="result-label">
            📌 Ward Name
          </span>

          <span>
            {success.ward_name || "Not available"}
          </span>

        </div>


        <div className="detail-row">

          <span className="result-label">
            🏢 Local Body
          </span>

          <span>
            {success.local_body || "Not available"}
          </span>

        </div>


        <div className="detail-row">

          <span className="result-label">
            🟢 Status
          </span>

          <span>
            {success.status}
          </span>

        </div>

      </div>

    </div>

  </div>

)}


            {/* SUBMIT */}

            <button
              className="submit-button"
              type="submit"
              disabled={submitting}
            >

              {submitting ? (

                <>
                  <Loader2
                    size={20}
                    className="spin"
                  />

                  Creating ticket...

                </>

              ) : (

                <>
                  <Send size={20} />

                  Report Blockage

                </>

              )}

            </button>


          </form>

        </section>

      </main>


      <footer>

        <p>
          From Blocked Drain to Resolved Action — Automatically.
        </p>

      </footer>

    </div>

  );
}


export default App;