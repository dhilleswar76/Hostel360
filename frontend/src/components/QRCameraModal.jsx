import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Icon } from "./Icon.jsx";

export function QRCameraModal({ isOpen, onClose, onScanSuccess }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [successCode, setSuccessCode] = useState("");
  const scannerRef = useRef(null);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setError("");
    setSuccessCode("");
    isStoppingRef.current = false;

    // Discover available video inputs (front & back cameras)
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!mounted) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back/environment camera if available
          const backCam = devices.find((d) => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("environment"));
          setSelectedCamera(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.warn("Camera discovery notice:", err);
      });

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    startScanner();

    return () => {
      stopScanner();
    };
  }, [isOpen, selectedCamera]);

  async function startScanner() {
    try {
      await stopScanner();
      setError("");

      const element = document.getElementById("qr-camera-element");
      if (!element) return;

      const html5QrCode = new Html5Qrcode("qr-camera-element");
      scannerRef.current = html5QrCode;

      const cameraConfig = selectedCamera
        ? { deviceId: { exact: selectedCamera } }
        : { facingMode: "environment" };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleDetected(decodedText);
        },
        () => {
          // Frame parse misses are normal, ignore
        }
      );
      setScanning(true);
    } catch (err) {
      setScanning(false);
      const msg = String(err?.message || err);
      if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
        setError("Camera permission denied. Please allow camera access in your browser settings to scan passes.");
      } else if (msg.includes("NotFoundError") || msg.includes("device")) {
        setError("No camera device detected. You can upload a photo of the QR code below or enter the pass token manually.");
      } else {
        setError("Could not start camera video stream. Please ensure camera is not in use by another application.");
      }
    }
  }

  async function stopScanner() {
    if (scannerRef.current && !isStoppingRef.current) {
      isStoppingRef.current = true;
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // Ignored
      } finally {
        scannerRef.current = null;
        setScanning(false);
        isStoppingRef.current = false;
      }
    }
  }

  function handleDetected(token) {
    if (!token) return;
    setSuccessCode(token);
    try {
      if (navigator.vibrate) navigator.vibrate(100);
    } catch {
      // Ignored
    }
    stopScanner();
    setTimeout(() => {
      onScanSuccess(token);
      onClose();
    }, 600);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    try {
      await stopScanner();
      const html5QrCode = new Html5Qrcode("qr-camera-element");
      scannerRef.current = html5QrCode;
      const decoded = await html5QrCode.scanFile(file, true);
      handleDetected(decoded);
    } catch (err) {
      setError("Could not read a valid QR code from the selected image. Please try another photo.");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card wide" style={{ maxWidth: "560px" }}>
        <div className="modal-heading">
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "18px" }}>
              <Icon name="Camera" size={20} className="text-blue-600" />
              Live Gate Camera Scanner
            </h2>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>
              Point the student's digital QR pass directly at the camera lens for instant verification.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ border: 0, background: "transparent", cursor: "pointer", color: "#64748b", padding: "4px" }}
            aria-label="Close scanner"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
              <Icon name="CircleAlert" size={16} /> Notice
            </div>
            <p style={{ margin: "4px 0 0" }}>{error}</p>
          </div>
        )}

        {successCode && (
          <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857", padding: "12px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "14px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "15px" }}>
              <Icon name="CheckCircle2" size={18} /> Pass Scanned Successfully!
            </div>
            <div style={{ fontFamily: "monospace", marginTop: "4px", fontSize: "12px" }}>{successCode}</div>
          </div>
        )}

        {/* Camera Selector */}
        {cameras.length > 1 && (
          <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
            <label htmlFor="camera-select" style={{ fontWeight: 600, color: "#475569" }}>
              Switch Camera:
            </label>
            <select
              id="camera-select"
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              style={{ flex: 1, padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", background: "#fff" }}
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Camera ${c.id.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Viewfinder Window */}
        <div
          style={{
            position: "relative",
            width: "100%",
            minHeight: "320px",
            background: "#0f172a",
            borderRadius: "14px",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
          }}
        >
          <div id="qr-camera-element" style={{ width: "100%", height: "100%" }} />

          {scanning && !successCode && (
            <div
              style={{
                position: "absolute",
                pointerEvents: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "240px",
                  height: "240px",
                  border: "2px solid rgba(59, 130, 246, 0.8)",
                  borderRadius: "16px",
                  boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.45), 0 0 15px rgba(59, 130, 246, 0.5)",
                  position: "relative",
                }}
              >
                {/* Target Corners */}
                <div style={{ position: "absolute", top: -2, left: -2, width: 24, height: 24, borderTop: "4px solid #3b82f6", borderLeft: "4px solid #3b82f6", borderTopLeftRadius: "8px" }} />
                <div style={{ position: "absolute", top: -2, right: -2, width: 24, height: 24, borderTop: "4px solid #3b82f6", borderRight: "4px solid #3b82f6", borderTopRightRadius: "8px" }} />
                <div style={{ position: "absolute", bottom: -2, left: -2, width: 24, height: 24, borderBottom: "4px solid #3b82f6", borderLeft: "4px solid #3b82f6", borderBottomLeftRadius: "8px" }} />
                <div style={{ position: "absolute", bottom: -2, right: -2, width: 24, height: 24, borderBottom: "4px solid #3b82f6", borderRight: "4px solid #3b82f6", borderBottomRightRadius: "8px" }} />
              </div>
              <span style={{ color: "#ffffff", fontSize: "12px", marginTop: "12px", background: "rgba(0,0,0,0.6)", padding: "4px 10px", borderRadius: "20px", fontWeight: 500 }}>
                Align QR Code inside box
              </span>
            </div>
          )}
        </div>

        {/* Alternative: Image Upload Scan */}
        <div style={{ marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
          <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#475569", fontWeight: 500 }}>
            <Icon name="Upload" size={15} />
            <span>Upload Pass Image file instead</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
          </label>

          <button
            type="button"
            className="outline-button"
            onClick={onClose}
            style={{ marginLeft: "auto" }}
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
}

