import { useState, useRef, useLayoutEffect } from "react";

import Board from "../board/Board";
import Tool from "./Tool";
import Mode from "./Mode";

import { CiPen, CiEraser, CiImport, CiExport } from "react-icons/ci";
import { BsArrowsMove } from "react-icons/bs";

import "./style.css";

function Container() {
  const [mode, setMode] = useState(Mode.Draw);
  const [color, setColor] = useState("#000000");

  const CANVAS_WIDTH = 2000;
  const CANVAS_HEIGHT = 2000;

  const board = useRef(null);

  const Tools = {
    move: {
      type: "mode",
      mode: Mode.Move,
      icon: BsArrowsMove,
    },
    draw: {
      type: "mode",
      mode: Mode.Draw,
      icon: CiPen,
    },
    erase: {
      type: "mode",
      mode: Mode.Erase,
      icon: CiEraser,
    },
    export: {
      type: "event",
      icon: CiExport,
      clickHandler: () => showElementsJSON(),
    },
    import: {
      type: "event",
      icon: CiImport,
      clickHandler: () => showImportElementsDialog(),
    },
  };

  const changeColor = (e) => {
    setColor(e.target.value);
  };

  const showElementsJSON = () => {
    const blob = new Blob([JSON.stringify(board.current.getElements())], {
      type: "application/json",
    });

    window.open(window.URL.createObjectURL(blob));
  };

  const showImportElementsDialog = () => {
    const blob = window.prompt("Enter JSON");

    if (!blob) {
      return;
    }

    let blobToJSON;

    try {
      blobToJSON = JSON.parse(blob);
    } catch (e) {
      return;
    }

    board.current.setElements(blobToJSON);
  };

  return (
    <div className="container">
      <div className="tools-container">
        {Object.entries(Tools).map(([key, value]) => {
          return (
            <Tool
              key={key}
              name={key}
              icon={value.icon}
              active={mode === value.mode}
              clickHandler={() => {
                if (value.type === "mode") {
                  setMode(value.mode);
                } else {
                  value.clickHandler();
                }
              }}
            ></Tool>
          );
        })}
        <input className="color-picker" type="color" onChange={changeColor} />
      </div>
      <div className="board-container">
        <Board
          ref={board}
          size={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          color={color}
          backgroundColor={"#fcfcfc"}
          mode={mode}
        ></Board>
      </div>
    </div>
  );
}

export default Container;
