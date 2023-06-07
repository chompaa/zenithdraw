import "./style.css";

function ResetCamera({ CAMERA_OFFSET_START, setCameraOffset }) {
  return (
    <button
      className="center-button"
      onClick={() => setCameraOffset(CAMERA_OFFSET_START)}
    >
      Reset camera
    </button>
  );
}

export default ResetCamera;
