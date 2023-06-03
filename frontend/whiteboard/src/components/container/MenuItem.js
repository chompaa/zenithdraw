import { createElement } from "react";

function MenuItem({ name, icon, onClick }) {
  return (
    <button
      className="menu-item-button"
      // promise resolution gets rid of click handler timing violation
      onClick={async () => {
        await Promise.resolve();
        onClick();
      }}
    >
      {createElement(icon, { size: 14 })}
      {name}
    </button>
  );
}

export default MenuItem;
