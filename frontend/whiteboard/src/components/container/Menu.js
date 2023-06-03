import { useState } from "react";

import MenuItem from "./MenuItem";

import { Menu2, Download, Upload } from "tabler-icons-react";

function Menu({ elements, setElements, sendElements, setSendElements }) {
  const [active, setActive] = useState(false);

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

  return (
    <div className="menu-container">
      <button className="menu-button" onClick={() => setActive(!active)}>
        <Menu2 size={14}></Menu2>
      </button>
      {active ? (
        <div className="menu-items-container">
          <MenuItem
            name="Import"
            icon={Download}
            onClick={() => showImportElementsDialog()}
          ></MenuItem>
          <MenuItem
            name="Export"
            icon={Upload}
            onClick={() => showElementsJSON()}
          ></MenuItem>
        </div>
      ) : null}
    </div>
  );
}

export default Menu;
