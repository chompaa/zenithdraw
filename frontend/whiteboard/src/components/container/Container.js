import { useState } from 'react';

import Board from '../board/Board';
import Tool from './Tool'
import Mode from './Mode'

import moveInActive from './moveInactive.png';
import moveActive from './moveActive.png';
import drawActive from './drawActive.png';
import drawInActive from './drawInactive.png'
import eraseActive from './eraseActive.png';
import eraseInActive from './eraseInActive.png'

import './style.css';

function Container() {
  const [mode, setMode] = useState(Mode.Draw);
  const [color, setColor] = useState("#000000");

  const changeColor = (e) => {
    setColor(e.target.value);
  }

  return (
    <div className="container" >
      <div className="tools-container" >
        <Tool
          activeImage={moveActive}
          inActiveImage={moveInActive}
          isActive={mode === Mode.Move}
          onClick={() => setMode(Mode.Move)}
        ></Tool>
        <Tool
          activeImage={drawActive}
          inActiveImage={drawInActive}
          isActive={mode === Mode.Draw}
          onClick={() => setMode(Mode.Draw)}
        ></Tool>
        <Tool
          activeImage={eraseActive}
          inActiveImage={eraseInActive}
          isActive={mode === Mode.Erase}
          onClick={() => setMode(Mode.Erase)}
        ></Tool>
        <input className="color-picker" type="color" onChange={changeColor} />
      </div>
      <div className="board-container">
        <Board size={{ width: 975, height: 650 }} color={color} backgroundColor={"#fcfcfc"} mode={mode}></Board>
      </div>
    </div>
  );
}

export default Container