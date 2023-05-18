import { socket } from "../../socket";

import { useState, useRef, useEffect, useCallback } from "react";

import Mode from "../container/Mode";

import "./style.css";

function Board({ size, color, backgroundColor, mode }) {
  const BORDER_SIZE = 20;

  const viewCanvas = useRef(null);
  const drawCanvas = useRef(null);
  const viewContext = useRef(null);
  const drawContext = useRef(null);
  const [canvasImage, setCanvasImage] = useState(null);

  // drawing
  const LINE_SIZE = 4;
  const isDrawing = useRef(false);

  // moving
  const isMoving = useRef(false);
  const moveStart = useRef({ x: 0, y: 0 });
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [prevMouse, setPrevMouse] = useState({ x: 0, y: 0 });
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const cameraOffsetMax = useRef({ x: 0, y: 0 });

  // erasing
  const ERASE_SIZE = 50;
  const isErasing = useRef(false);

  // zooming
  const SCROLL_SENSITIVITY = 0.001;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 5;
  const [zoom, setZoom] = useState(1);
  const pinchDistanceStart = useRef(null);

  // sending & receiving drawings
  const SEND_INTERVAL = 1000;
  const sendDrawings = useRef([]);
  const sendErases = useRef([]);
  const [receivedDrawings, setReceivedDrawings] = useState([]);
  const [receivedErases, setReceivedErases] = useState([]);

  // caching
  // keep this offset from SEND_INTERVAL, potential race condition (?)
  const CACHE_INTERVAL = 1500;
  const animationFrameStart = useRef(0);

  const draw = useCallback((context, start, end, strokeColor) => {
    if (!context) {
      return;
    }

    context.beginPath();
    context.strokeStyle = strokeColor;
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.closePath();
    context.stroke();

    requestAnimationFrame(() => draw(context, start, end, strokeColor));
  }, []);

  const erase = useCallback((context, start, end) => {
    context.globalCompositeOperation = "destination-out";
    context.lineWidth = ERASE_SIZE;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.closePath();
    context.stroke();
    context.globalCompositeOperation = "source-over";
    context.lineWidth = LINE_SIZE;

    requestAnimationFrame(() => erase(context, start, end));
  }, []);

  const getEventLocation = (e) => {
    if (e.touches && e.touches.length === 1) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.clientX && e.clientY) {
      return { x: e.clientX, y: e.clientY };
    }
  };

  const clamp = (n, min, max) => {
    return Math.max(min, Math.min(n, max));
  };

  const getClampedCamera = useCallback(
    (canvas, x, y) => {
      if (!canvas) {
        return { x: 0, y: 0 };
      }

      let maxOffset = cameraOffsetMax.current;

      return {
        x: clamp(x, canvas.width - maxOffset.x * zoom, maxOffset.x * zoom),
        y: clamp(y, canvas.height - maxOffset.y * zoom, maxOffset.y * zoom),
      };
    },
    [zoom]
  );

  const mouseMove = (e) => {
    if (!viewCanvas.current) {
      return;
    }

    let location = getEventLocation(e);

    if (!location) {
      return;
    }

    let rect = viewCanvas.current.getBoundingClientRect();

    if (isMoving.current) {
      setCameraOffset(
        getClampedCamera(
          viewCanvas.current,
          location.x - moveStart.current.x,
          location.y - moveStart.current.y
        )
      );
    }

    setPrevMouse(mouse);
    setMouse({
      x: (location.x - rect.left - cameraOffset.x) / zoom,
      y: (location.y - rect.top - cameraOffset.y) / zoom,
    });

    if (isDrawing.current) {
      draw(viewContext.current, prevMouse, mouse, color);
      draw(drawContext.current, prevMouse, mouse, color);

      sendDrawings.current.push({ start: prevMouse, end: mouse, color: color });
    }

    if (isErasing.current) {
      erase(drawContext.current, prevMouse, mouse);
      erase(viewContext.current, prevMouse, mouse);

      sendErases.current.push({ start: prevMouse, end: mouse });
    }
  };

  const mouseDown = (e) => {
    switch (mode) {
      case Mode.Draw:
        isDrawing.current = true;
        break;
      case Mode.Erase:
        isErasing.current = true;
        break;
      case Mode.Move:
        isMoving.current = true;

        let location = getEventLocation(e);

        moveStart.current = {
          x: location.x - cameraOffset.x,
          y: location.y - cameraOffset.y,
        };

        break;
      default:
        break;
    }
  };

  const mouseUp = (e) => {
    switch (mode) {
      case Mode.Draw:
        isDrawing.current = false;
        break;
      case Mode.Erase:
        isErasing.current = false;
        break;
      case Mode.Move:
        isMoving.current = false;
        pinchDistanceStart.current = false;
        break;
      default:
        break;
    }
  };

  const wheel = (amount) => {
    setZoom(clamp(zoom + amount, MIN_ZOOM, MAX_ZOOM));
  };

  const pinch = (e) => {
    const touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    const touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };

    const currentDistance =
      Math.pow(touch1.x - touch2.x, 2) + Math.pow(touch1.y - touch2.y, 2);

    if (!pinchDistanceStart.current) {
      pinchDistanceStart.current = currentDistance;
    } else {
      setZoom(
        clamp(
          zoom * 0.5 * (currentDistance / pinchDistanceStart),
          MIN_ZOOM,
          MAX_ZOOM
        )
      );
    }
  };

  const resetMouse = (e) => {
    let location = getEventLocation(e);
    let rect = viewCanvas.current.getBoundingClientRect();

    setPrevMouse({
      x: (location.x - rect.left - cameraOffset.x) / zoom,
      y: (location.y - rect.top - cameraOffset.y) / zoom,
    });

    setMouse({
      x: (location.x - rect.left - cameraOffset.x) / zoom,
      y: (location.y - rect.top - cameraOffset.y) / zoom,
    });
  };

  const touch = (e, singleTouchHandler) => {
    if (e.touches.length < 2) {
      singleTouchHandler(e);
    } else if (
      e.type === "touchmove" &&
      e.touches.length === 2 &&
      mode === Mode.Move
    ) {
      pinch(e);
    }
  };

  const clearCanvas = (canvas, context) => {
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    if (!viewCanvas.current || !viewContext.current) {
      return;
    }

    const context = viewContext.current;
    const canvas = viewCanvas.current;

    context.resetTransform();

    clearCanvas(canvas, context);

    context.translate(canvas.width / 2, canvas.height / 2);

    let origin = {
      x: -canvas.width / 2,
      y: -canvas.height / 2,
    };

    const offset = getClampedCamera(canvas, cameraOffset.x, cameraOffset.y);

    if (
      Math.abs(cameraOffset.x - offset.x) > 0 ||
      Math.abs(cameraOffset.y - offset.y) > 0
    ) {
      // if the camera went out of bounds, correct it and re-render
      setCameraOffset({
        x: offset.x,
        y: offset.y,
      });

      return;
    }

    context.translate(origin.x + offset.x, origin.y + offset.y);

    context.scale(zoom, zoom);
    context.lineWidth = BORDER_SIZE;
    // ctx.strokeStyle = "#393541";
    context.strokeStyle = "#191a1f";

    let offsetMax = cameraOffsetMax.current;
    context.strokeRect(
      -offsetMax.x,
      -offsetMax.y,
      offsetMax.x * 2,
      offsetMax.y * 2
    );

    context.lineWidth = LINE_SIZE;

    if (!canvasImage) {
      return;
    }

    context.drawImage(canvasImage, origin.x, origin.y);
  }, [cameraOffset, zoom, getClampedCamera, backgroundColor, canvasImage]);

  const initializeCanvas = (canvasRef, contextRef) => {
    let style = getComputedStyle(canvasRef.current);

    canvasRef.current.width = parseInt(style.getPropertyValue("width"));
    canvasRef.current.height = parseInt(style.getPropertyValue("height"));

    contextRef.current = canvasRef.current.getContext("2d", {
      willReadFrequently: true,
    });

    contextRef.imageSmoothingEnabled = false;
    contextRef.current.lineCap = "round";
    contextRef.current.lineJoin = "round";
    contextRef.current.lineWidth = LINE_SIZE;
    contextRef.current.translate(
      canvasRef.current.width / 2,
      canvasRef.current.height / 2
    );
  };

  useEffect(() => {
    if (!receivedDrawings) {
      return;
    }

    receivedDrawings.forEach((drawing) =>
      draw(drawContext.current, drawing.start, drawing.end, drawing.color)
    );
  }, [receivedDrawings, draw]);

  useEffect(() => {
    if (!receivedErases) {
      return;
    }

    receivedErases.forEach((drawing) =>
      erase(drawContext.current, drawing.start, drawing.end)
    );
  }, [receivedErases, erase]);

  useEffect(() => {
    if (!viewCanvas.current || !drawCanvas.current) {
      return;
    }

    initializeCanvas(viewCanvas, viewContext);
    initializeCanvas(drawCanvas, drawContext);

    viewContext.current.imageSmoothingEnabled = false;

    const canvasSize = {
      width: viewCanvas.current.width,
      height: viewCanvas.current.height,
    };

    setCameraOffset({ x: canvasSize.width / 2, y: canvasSize.height / 2 });
    cameraOffsetMax.current = {
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
    };

    // we use state for receiving drawings since we don't want draw to become a dependency here :)
    socket.on("draw-data", (data) => setReceivedDrawings(data));
    // similarly for erasing..
    socket.on("erase-data", (data) => setReceivedErases(data));

    const send = setInterval(() => {
      if (!sendDrawings) {
        return;
      }

      socket.emit("draw-data", sendDrawings.current);
      socket.emit("erase-data", sendErases.current);
      sendDrawings.current = [];
      sendErases.current = [];
    }, SEND_INTERVAL);

    const cache = setInterval(() => {
      // cache the image before we cancel animations
      const canvasImageURL = drawCanvas.current.toDataURL("image/png");

      let animationFrameLast = requestAnimationFrame(() => {});

      // clear all animation frames up to this point
      while (animationFrameLast-- > animationFrameStart.current) {
        cancelAnimationFrame(animationFrameLast);
      }

      const updatedCanvasImage = new Image();

      updatedCanvasImage.addEventListener("load", () => {
        const request = requestAnimationFrame(() => {});
        animationFrameStart.current = request;

        // make sure we cache the image in the draw port, too!
        clearCanvas(drawCanvas.current, drawContext.current);
        drawContext.current.drawImage(
          updatedCanvasImage,
          -canvasSize.width / 2,
          -canvasSize.height / 2
        );

        setCanvasImage(updatedCanvasImage);
      });

      updatedCanvasImage.src = canvasImageURL;
    }, CACHE_INTERVAL);

    return () => {
      clearInterval(send);
      clearInterval(cache);
    };
  }, []);

  return (
    <>
      <canvas
        ref={drawCanvas}
        width={size.width}
        height={size.height}
        className="board"
        id="board"
      ></canvas>
      <div
        style={{
          width: size.width,
          height: size.height,
          backgroundColor: backgroundColor,
        }}
      ></div>
      <canvas
        ref={viewCanvas}
        width={size.width}
        height={size.height}
        className="board"
        id="board"
        onMouseMove={mouseMove}
        onMouseDown={mouseDown}
        onMouseUp={mouseUp}
        onWheel={(e) => wheel(-e.deltaY * SCROLL_SENSITIVITY)}
        onTouchMove={(e) => touch(e, mouseMove)}
        onTouchStart={(e) => {
          resetMouse(e);
          touch(e, mouseDown);
        }}
        onTouchEnd={(e) => touch(e, mouseUp)}
      ></canvas>
    </>
  );
}

export default Board;
