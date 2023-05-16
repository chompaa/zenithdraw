import { socket } from '../../socket';

import { useCallback } from 'react';
import { useEffect } from 'react';
import { useState } from 'react';
import { useRef } from 'react';

import Mode from '../container/Mode';

import './style.css'

function Board({ color, mode }) {
  let canvas = useRef(null);

  const [ctx, setCtx] = useState(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [prevMouse, setPrevMouse] = useState({ x: 0, y: 0 });

  const BORDER_SIZE = 20;
  const LINE_SIZE = 2;

  // drawing
  const [drawing, setDrawing] = useState(false);

  // moving
  const [moving, setMoving] = useState(false);
  const [moveStart, setMoveStart] = useState({ x: 0, y: 0 });
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [maxCameraOffset, setMaxCameraOffset] = useState({ x: 0, y: 0 });

  // zooming
  const SCROLL_SENSITIVITY = 0.001
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 5;
  const [zoom, setZoom] = useState(1);
  const [initialPinchDistance, setInitialPinchDistance] = useState(null);

  const [sendDrawings, setSendDrawings] = useState([]);
  const [receiveDrawings, setReceiveDrawings] = useState([]);

  const draw = useCallback((start, end, strokeColor) => {
    if (!ctx || !canvas.current) {
      return;
    }

    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.closePath();
    ctx.stroke();


    requestAnimationFrame(() => draw(start, end, strokeColor));
  }, [ctx]);

  const getEventLocation = (e) => {
    if (e.touches && e.touches.length === 1) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    } else if (e.clientX && e.clientY) {
      return { x: e.clientX, y: e.clientY }
    }
  }

  const clamp = (n, min, max) => {
    return Math.max(min, Math.min(n, max));
  }

  const clampToCamera = useCallback((x, y) => {
    if (!canvas.current) {
      return { x: 0, y: 0 }
    }

    return {
      x: clamp(x, (canvas.current.width - (maxCameraOffset.x * zoom)), maxCameraOffset.x * zoom),
      y: clamp(y, (canvas.current.height - (maxCameraOffset.y * zoom)), maxCameraOffset.y * zoom)
    }
  }, [maxCameraOffset, zoom]);

  const mouseMove = (e) => {
    if (!canvas.current || !ctx) {
      return;
    }

    let location = getEventLocation(e);
    let rect = canvas.current.getBoundingClientRect();

    if (moving) {
      let clampedOffset = clampToCamera(
        location.x - moveStart.x,
        location.y - moveStart.y,
      );
      console.log(clampedOffset);

      setCameraOffset({ x: clampedOffset.x, y: clampedOffset.y });
    }

    setPrevMouse(mouse);
    setMouse({
      x: (location.x - rect.left - cameraOffset.x) / zoom,
      y: (location.y - rect.top - cameraOffset.y) / zoom,
    });

    console.log(prevMouse, mouse);

    if (drawing) {
      draw(prevMouse, mouse, color);
      setSendDrawings([...sendDrawings, { start: prevMouse, end: mouse, color: color }]);
    }
  }

  const mouseDown = (e) => {
    if (!canvas.current) {
      return;
    }

    if (mode === Mode.Draw) {
      setDrawing(true);
    } else {
      setMoving(true);
      let location = getEventLocation(e);
      setMoveStart({
        x: location.x - cameraOffset.x,
        y: location.y - cameraOffset.y,
      });
    }
  }

  const mouseUp = (e) => {
    if (!canvas.current) {
      return;
    }

    console.log("mouse up!")

    if (mode === Mode.Draw) {
      setDrawing(false);
      socket.emit('draw-data', sendDrawings);
      setSendDrawings([]);
    } else {
      setMoving(false);
    }
  }

  const wheel = (amount) => {
    let newZoom = zoom + amount;

    if (newZoom < MIN_ZOOM || newZoom > MAX_ZOOM) {
      return;
    }

    setZoom(newZoom);
  }

  const resetMouse = (e) => {
    let location = getEventLocation(e);
    let rect = canvas.current.getBoundingClientRect();

    setPrevMouse({
      x: (location.x - rect.left - cameraOffset.x) / zoom,
      y: (location.y - rect.top - cameraOffset.y) / zoom,
    });

    setMouse({
      x: (location.x - rect.left - cameraOffset.x) / zoom,
      y: (location.y - rect.top - cameraOffset.y) / zoom,
    });
  }

  const touch = (e, singleTouchHandler) => {
    if (e.touches.length < 2) {
      singleTouchHandler(e);
    } else if (e.type === "touchmove" && e.touches.length === 2 && mode === Mode.Move) {
      e.preventDefault();

      let touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      let touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY }

      let currentDistance = (touch1.x - touch2.x) ** 2 + (touch1.y - touch2.y) ** 2

      if (initialPinchDistance == null) {
        setInitialPinchDistance(currentDistance);
      }
      else {
        setZoom(zoom * (currentDistance / initialPinchDistance));
      }
    }
  }

  useEffect(() => {
    if (!canvas.current || !ctx) {
      return;
    }

    const width = canvas.current.width;
    const height = canvas.current.height;

    ctx.resetTransform();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fcfcfc";
    ctx.fillRect(0, 0, canvas.current.width, canvas.current.height);
    ctx.translate(width / 2, height / 2);
    const offset = clampToCamera(cameraOffset.x, cameraOffset.y);
    ctx.translate(-width / 2 + offset.x, -height / 2 + offset.y);
    ctx.scale(zoom, zoom);
    ctx.lineWidth = BORDER_SIZE;
    // ctx.strokeStyle = "#393541";
    ctx.strokeStyle = "#191a1f";
    ctx.strokeRect(-maxCameraOffset.x, -maxCameraOffset.y, maxCameraOffset.x * 2, maxCameraOffset.y * 2);
    ctx.lineWidth = LINE_SIZE;

  }, [cameraOffset, zoom, clampToCamera, ctx, maxCameraOffset]);

  useEffect(() => {
    if (!ctx) {
      return;
    }

    ctx.strokeStyle = color;
  }, [color, ctx])

  useEffect(() => {
    if (!receiveDrawings) {
      return;
    }

    receiveDrawings.forEach(drawing => draw(drawing.start, drawing.end, drawing.color));
  }, [receiveDrawings, draw])

  useEffect(() => {
    if (!canvas.current) {
      return;
    }

    let style = getComputedStyle(canvas.current);

    canvas.current.width = parseInt(style.getPropertyValue('width'));
    canvas.current.height = parseInt(style.getPropertyValue('height'));

    let canvasCtx = canvas.current.getContext('2d', { willReadFrequently: true });

    canvasCtx.lineCap = 'round';
    canvasCtx.lineJoin = 'round'
    canvasCtx.lineWidth = LINE_SIZE;
    canvasCtx.translate(canvas.current.width / 2, canvas.current.height / 2)

    setCtx(canvasCtx);

    setCameraOffset({ x: canvas.current.width / 2, y: canvas.current.height / 2 });
    setMaxCameraOffset({ x: canvas.current.width * 0.5, y: canvas.current.height * 0.5 });

    socket.on('draw-data', (drawings) => setReceiveDrawings(drawings));
  }, [])

  return (
    <>
      <canvas
        ref={canvas}
        className='board'
        id='board'
        onMouseMove={mouseMove}
        onMouseDown={mouseDown}
        onMouseUp={mouseUp}
        onWheel={(e) => {
          wheel(-e.deltaY * SCROLL_SENSITIVITY)
        }}
        onTouchMove={(e) => touch(e, mouseMove)}
        onTouchStart={(e) => {
          resetMouse(e);
          touch(e, mouseDown);
        }}
        onTouchEnd={(e) => {
          console.log(e.touches.length);
          touch(e, mouseUp);
        }}
      >
      </canvas>
      {/* <button onClick={() => wheel(SCROLL_SENSITIVITY * 50)}>Zoom in</button>
      <button onClick={() => wheel(-SCROLL_SENSITIVITY * 50)}>Zoom out</button> */}
    </>
  );
}

export default Board;