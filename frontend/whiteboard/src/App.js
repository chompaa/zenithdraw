import { useState } from "react";

import Canvas from "./components/canvas/Canvas";
import Menu from "./components/menu/Menu";
import Tools from "./components/tool/Tools";
import Mode from "./components/tool/Mode";
import ResetCamera from "./components/control/ResetCamera";
import DrawOptions from "./components/tool/DrawOptions";

import "./App.css";

function App() {
  const CANVAS_WIDTH = 2000;
  const CANVAS_HEIGHT = 1000;
  const STROKE_OPTIONS = [12, 6, 3];

  const [mode, setMode] = useState(null);
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
      <Tools mode={mode} setMode={setMode}></Tools>
      {cameraOffset.x !== CAMERA_OFFSET_START.x ||
      cameraOffset.y !== CAMERA_OFFSET_START.y ? (
        <ResetCamera
          CAMERA_OFFSET_START={CAMERA_OFFSET_START}
          setCameraOffset={setCameraOffset}
        ></ResetCamera>
      ) : null}
      <div className="board-container">
        <Canvas
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
        ></Canvas>
      </div>
      {mode === Mode.Draw ? (
        <DrawOptions
          STROKE_OPTIONS={STROKE_OPTIONS}
          stroke={stroke}
          setStroke={setStroke}
          color={color}
          setColor={setColor}
        ></DrawOptions>
      ) : null}
    </div>
  );
}

export default App;
