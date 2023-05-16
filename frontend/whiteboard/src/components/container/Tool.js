import { useState } from 'react';

function Tool({ activeImage, inActiveImage, isActive, onClick }) {
  const [hover, setHover] = useState(false);

  const SCALE_FACTOR = 1.2;

  return (
    <>
      <img
        className="tool"
        src={isActive ? activeImage : inActiveImage}
        style={{ transform: isActive ? `scale(${SCALE_FACTOR})` : hover ? `scale(${SCALE_FACTOR})` : `scale(1)` }}
        alt='move'
        onClick={onClick}
        onMouseOver={() => setHover(true)}
        onMouseOut={() => setHover(false)}
      ></img>
    </>
  )
}

export default Tool;