import { useState } from "react";

import Board from "../board/Board";
import Menu from "./Menu";
import Tool from "./Tool";
import Mode from "./Mode";

import { IconBallpen, IconEraser, IconArrowsMove } from "@tabler/icons-react";

import "./style.css";
import DrawSettings from "./DrawSettings";

function Container() {
  const CANVAS_WIDTH = 2000;
  const CANVAS_HEIGHT = 2000;
  const STROKE_OPTIONS = [12, 6, 3];

  const [mode, setMode] = useState(Mode.Draw);
  const [color, setColor] = useState("#000000");
  const [stroke, setStroke] = useState(STROKE_OPTIONS.length - 1);
  const [backgroundColor, setBackgroundColor] = useState("#fcfcfc");
  const [elements, setElements] = useState([]);
  const [sendElements, setSendElements] = useState([]);

  const CAMERA_OFFSET_START = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
  const CAMERA_OFFSET_MAX = {
    x: CANVAS_WIDTH * window.devicePixelRatio,
    y: CANVAS_HEIGHT * window.devicePixelRatio,
  };
  const [cameraOffset, setCameraOffset] = useState(CAMERA_OFFSET_START);

  const Tools = {
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

  const changeColor = (e) => {
    setColor(e.target.value);
  };

  const resetCameraOffset = () => {
    setCameraOffset(CAMERA_OFFSET_START);
  };

  return (
    <div className="container">
      <Menu
        elements={elements}
        setElements={setElements}
        sendElements={sendElements}
        setSendElements={setSendElements}
        backgroundColor={backgroundColor}
        setBackgroundColor={setBackgroundColor}
      ></Menu>
      <div className="tools-container">
        {Object.entries(Tools).map(([key, value]) => {
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
      {cameraOffset.x !== CAMERA_OFFSET_START.x ||
      cameraOffset.y !== CAMERA_OFFSET_START.y ? (
        <button className="center-button" onClick={() => resetCameraOffset()}>
          Reset camera
        </button>
      ) : null}
      <div className="board-container">
        <Board
          size={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          stroke={STROKE_OPTIONS[stroke]}
          color={color}
          backgroundColor={backgroundColor}
          mode={mode}
          elements={elements}
          setElements={setElements}
          sendElements={sendElements}
          setSendElements={setSendElements}
          cameraOffset={cameraOffset}
          setCameraOffset={setCameraOffset}
          CAMERA_OFFSET_MAX={CAMERA_OFFSET_MAX}
        ></Board>
      </div>
      <DrawSettings
        STROKE_OPTIONS={STROKE_OPTIONS}
        stroke={stroke}
        setStroke={setStroke}
        setColor={setColor}
      ></DrawSettings>
    </div>
  );
}

export default Container;
