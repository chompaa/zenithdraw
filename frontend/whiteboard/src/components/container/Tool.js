import { useState, createElement } from "react";

function Tool({ icon, active, clickHandler }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="tool-container"
      style={{ background: active ? "#e3e2fe" : hover ? "#f5f5f5" : "white" }}
      onClick={async () => {
        await Promise.resolve();
        clickHandler();
      }}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
    >
      <div className="tool">
        {createElement(icon, {
          className: "tool-icon",
          fill: active ? "#5b57d1" : "#3d3d3d",
        })}
      </div>
    </div>
  );
}

export default Tool;
