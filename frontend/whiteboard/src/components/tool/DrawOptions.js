import { useState } from "react";

import "./style.css";

function DrawSettings({ STROKE_OPTIONS, stroke, setStroke, color, setColor }) {
  const [hover, setHover] = useState(null);

  return (
    <div className="draw-settings-container">
      Stroke
      {STROKE_OPTIONS.map((_, index) => {
        return (
          <div
            key={index}
            className="stroke-container"
            style={{
              background:
                stroke === index
                  ? "#e3e2fe"
                  : hover === index
                  ? "#f5f5f5"
                  : "white",
            }}
            onClick={() => setStroke(index)}
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
          >
            <div
              className="stroke"
              style={{
                borderWidth: `${(STROKE_OPTIONS.length - index) * 3.5}px`,
                borderColor: stroke === index ? "#5b57d1" : "#121212",
              }}
            ></div>
          </div>
        );
      })}
      Color
      <input
        className="color-picker"
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
      />
    </div>
  );
}

export default DrawSettings;
