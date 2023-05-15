import { useState } from 'react';
import Board, { Mode } from '../board/Board';

import './style.css';

function Container() {
  const [mode, setMode] = useState<Mode>(Mode.Draw);
  const [color, setColor] = useState("#000000");

  const changeColor = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        mode === Mode.Draw ? setMode(Mode.Move) : setMode(Mode.Draw)
        console.log(mode);
      }}>Hi</button>
    </div>
  );
}

export default Container