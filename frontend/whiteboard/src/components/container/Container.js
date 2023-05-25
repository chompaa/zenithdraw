import { useState, useRef, useEffect } from "react";

import Board from "../board/Board";
import Tool from "./Tool";
import Mode from "./Mode";

import moveInactive from "./icons/moveInactive.png";
import moveActive from "./icons/moveActive.png";
import drawActive from "./icons/drawActive.png";
import drawInactive from "./icons/drawInactive.png";
import eraseActive from "./icons/eraseActive.png";
import eraseInactive from "./icons/eraseInactive.png";

import downloadInactive from "./icons/downloadInactive.png";
import downloadActive from "./icons/downloadActive.png";
import uploadInactive from "./icons/uploadInactive.png";
import uploadActive from "./icons/uploadActive.png";

import "./style.css";

function Container() {
  const [mode, setMode] = useState(Mode.Draw);
  const [color, setColor] = useState("#000000");

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 575;

  const board = useRef(null);

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

  const Tools = {
    move: {
      type: "mode",
      mode: Mode.Move,
      images: { active: moveActive, inactive: moveInactive },
    },
    draw: {
      type: "mode",
      mode: Mode.Draw,
      images: { active: drawActive, inactive: drawInactive },
    },
    erase: {
      type: "mode",
      mode: Mode.Erase,
      images: { active: eraseActive, inactive: eraseInactive },
    },
    export: {
      type: "event",
      images: { active: downloadActive, inactive: downloadInactive },
      clickHandler: () => showElementsJSON(),
    },
    import: {
      type: "event",
      images: { active: uploadActive, inactive: uploadInactive },
      clickHandler: () => showImportElementsDialog(),
    },
  };

  return (
    <div className="container">
      <div className="tools-container">
        {Object.entries(Tools).map(([key, value]) => {
          return (
            <Tool
              key={key}
              name={key}
              images={value.images}
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
