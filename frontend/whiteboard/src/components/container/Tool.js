import { useState, useEffect } from "react";

function Tool({ name, images, active, clickHandler }) {
  const [textOpacity, setTextOpacity] = useState("");
  const [hover, setHover] = useState(false);

  const SCALE_FACTOR = 1.2;

  useEffect(() => {
    setTextOpacity(active || hover ? 1 : 0.5);
  }, [active, hover]);

  return (
    <div className="tool">
      <h1 className="tool-text" style={{ opacity: textOpacity }}>
        {name}
      </h1>
      <img
        className="tool-image"
        src={active || hover ? images.active : images.inactive}
        style={{
          transform: active
            ? `scale(${SCALE_FACTOR})`
            : hover
            ? `scale(${SCALE_FACTOR})`
            : `scale(1)`,
        }}
        alt="move"
        onClick={async () => {
          await Promise.resolve();
          clickHandler();
        }}
        onMouseOver={() => setHover(true)}
        onMouseOut={() => setHover(false)}
      ></img>
    </div>
  );
}

export default Tool;
