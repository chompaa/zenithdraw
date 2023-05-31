import { useState, createElement } from "react";

function Tool({ icon, active, clickHandler }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="tool-container"
      style={{ background: active ? "#e3e2fe" : hover ? "#f2f2f2" : "white" }}
    >
      <div className="tool">
        {createElement(icon, {
          className: "tool-icon",
          fill: active ? "#5b57d1" : "black",
          transform: "scale(1.5)",
          onClick: async () => {
            await Promise.resolve();
            clickHandler();
          },
          onMouseOver: () => setHover(true),
          onMouseOut: () => setHover(false),
        })}
      </div>
    </div>
  );
}

export default Tool;
