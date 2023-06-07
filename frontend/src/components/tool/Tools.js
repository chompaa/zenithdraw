import { useEffect } from "react";

import Mode from "./Mode";
import Tool from "./Tool";

import { IconBallpen, IconEraser, IconArrowsMove } from "@tabler/icons-react";

import "./style.css";

function Tools({ mode, setMode }) {
  const OPTIONS = {
    move: {
      mode: Mode.Move,
      icon: IconArrowsMove,
    },
    draw: {
      mode: Mode.Draw,
      icon: IconBallpen,
    },
    erase: {
      mode: Mode.Erase,
      icon: IconEraser,
    },
  };

  useEffect(() => {
    // use drawing by default
    setMode(Mode.Draw);
  }, [setMode]);

  return (
    <div className="tools-container">
      {Object.entries(OPTIONS).map(([key, value]) => {
        return (
          <Tool
            key={key}
            name={key}
            icon={value.icon}
            type={value.mode}
            mode={mode}
            setMode={setMode}
          ></Tool>
        );
      })}
    </div>
  );
}

export default Tools;
