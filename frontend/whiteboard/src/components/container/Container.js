import { useState, useRef, useEffect } from "react";

import Board from "../board/Board";
import Menu from "./Menu";
import Tool from "./Tool";
import Mode from "./Mode";

import { Ballpen, Eraser, ArrowsMove } from "tabler-icons-react";

import "./style.css";

function Container() {
  const [mode, setMode] = useState(Mode.Draw);
  const [color, setColor] = useState("#000000");
  const [elements, setElements] = useState([]);
  const [sendElements, setSendElements] = useState([]);
  const [cameraOffset, setCameraOffset] = useState({});

  const cameraOffsetStart = useRef({ x: 0, y: 0 });

  const CANVAS_WIDTH = 2000;
  const CANVAS_HEIGHT = 2000;

  const board = useRef(null);

  const Tools = {
    move: {
      mode: Mode.Move,
      icon: ArrowsMove,
    },
    draw: {
      mode: Mode.Draw,
      icon: Ballpen,
    },
    erase: {
      mode: Mode.Erase,
      icon: Eraser,
    },
  };

  const changeColor = (e) => {
    setColor(e.target.value);
  };

  const resetCameraOffset = () => {
    setCameraOffset(cameraOffsetStart.current);
  };

  useEffect(() => {
    cameraOffsetStart.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
    };

    resetCameraOffset();
  }, []);

  return (
    <div className="container">
      <Menu
        board={board}
        elements={elements}
        setElements={setElements}
        sendElements={sendElements}
        setSendElements={setSendElements}
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
        <input className="color-picker" type="color" onChange={changeColor} />
      </div>
      {cameraOffset.x !== cameraOffsetStart.current.x ||
      cameraOffset.y !== cameraOffsetStart.current.y ? (
        <button className="center-button" onClick={() => resetCameraOffset()}>
          Reset camera
        </button>
      ) : null}
      <div className="board-container">
        <Board
          size={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          color={color}
          backgroundColor={"#fcfcfc"}
          mode={mode}
          elements={elements}
          setElements={setElements}
          sendElements={sendElements}
          setSendElements={setSendElements}
          cameraOffset={cameraOffset}
          setCameraOffset={setCameraOffset}
        ></Board>
      </div>
    </div>
  );
}

export default Container;
