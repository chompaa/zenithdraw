import { useState } from 'react';
import Board from '../board/Board';

import './style.css';

function Container() {
  const [mode, setMode] = useState("draw");
  const [color, setColor] = useState("#000000");

  const changeColor = (e) => {
    setColor(e.target.value);
  }

  return (
    <div className="container" >
      <div className="color-picker-container" >
        <input type="color" onChange={changeColor} />
      </div>
      <div className="board-container">
        <Board color={color} mode={mode}></Board>
      </div>
      <button onClick={() => {
        mode === "draw" ? setMode("move") : setMode("draw")
      }}>Hi</button>
    </div>
  );
}

export default Container