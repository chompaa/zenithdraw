import { useState, createElement } from "react";

function Tool({ icon, type, mode, setMode }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="tool-container"
      style={{
        background: type === mode ? "#e3e2fe" : hover ? "#f5f5f5" : "white",
      }}
      onClick={() => setMode(type)}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
    >
      <div className="tool">
        {createElement(icon, {
          className: "tool-icon",
          size: 14,
          stroke: type === mode ? "#5b57d1" : "#3d3d3d",
        })}
      </div>
    </div>
  );
}

export default Tool;
