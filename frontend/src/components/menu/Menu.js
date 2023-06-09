import { useState, useRef } from "react";

import MenuItem from "./MenuItem";
import Separator from "./Separator";

import {
  IconMenu2,
  IconDownload,
  IconUpload,
  IconBrandGithub,
} from "@tabler/icons-react";

import "./style.css";

function Menu({
  elements,
  setElements,
  sendElements,
  setSendElements,
  backgroundColor,
  setBackgroundColor,
}) {
  const [active, setActive] = useState(false);
  const colorPicker = useRef(null);

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

    setElements([...elements, ...blobToJSON]);
    setSendElements([...sendElements, ...blobToJSON]);
  };

  const showElementsJSON = () => {
    const blob = new Blob([JSON.stringify(elements)], {
      type: "application/json",
    });

    window.open(window.URL.createObjectURL(blob));
  };

  const openSourceURL = () => {
    window.open("https://github.com/chompaa/whiteboard", "_blank");
  };

  return (
    <div className="menu-container">
      <button className="menu-button" onClick={() => setActive(!active)}>
        <IconMenu2 size={14}></IconMenu2>
      </button>
      {active ? (
        <div className="menu-items-container">
          <MenuItem
            name="Import"
            icon={IconDownload}
            onClick={() => showImportElementsDialog()}
          ></MenuItem>
          <MenuItem
            name="Export"
            icon={IconUpload}
            onClick={() => showElementsJSON()}
          ></MenuItem>
          <Separator></Separator>
          <MenuItem
            name="Source code"
            icon={IconBrandGithub}
            onClick={() => openSourceURL()}
          ></MenuItem>
          <Separator></Separator>
          <div className="background-container">
            Canvas background
            <input
              ref={colorPicker}
              className="background-picker"
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
            ></input>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Menu;
