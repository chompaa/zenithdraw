import { socket } from "../../socket";

import { useState, useRef, useEffect, useCallback } from "react";

import { clamp, distance, squareDifferenceSum } from "../../utils";

import Mode from "../tool/Mode";

import "./style.css";

const Canvas = ({
  size,
  color,
  stroke,
  backgroundColor,
  mode,
  elements,
  setElements,
  sendElements,
  setSendElements,
  cameraOffset,
  setCameraOffset,
  CAMERA_OFFSET_MAX,
}) => {
  const viewCanvas = useRef(null);
  const viewContext = useRef(null);

  // erasing
  const ERASE_RADIUS = 5;
  const elementsToErase = useRef(new Set());

  // moving
  const moveStart = useRef({ x: 0, y: 0 });
  const pointer = useRef({ x: 0, y: 0 });

  // zooming
  const SCROLL_SENSITIVITY = 0.001;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 30;
  const [zoom, setZoom] = useState(1);
  const pinchStart = useRef({ distance: undefined, zoom: undefined });
  const pinchDistanceStart = useRef(null);

  // sending & receiving drawings
  const SEND_INTERVAL = 1000;
  const sendErases = useRef([]);
  const [receiveElements, setReceiveElements] = useState([]);
  const [receiveErases, setReceiveErases] = useState([]);

  const useDpr = useRef(true);

  const [pointerDisplay, setPointerDisplay] = useState("pointer");

  const pointerDown = useRef(false);

  const getElementAtLocation = useCallback(
    (loc) => {
      let position = undefined;
      const currPointer = pointer.current;

      elements.every((element, index) => {
        // if we've found a position or moved the pointer, stop searching
        if (position !== undefined || currPointer !== pointer.current) {
          return false;
        }

        const points = element.points;

        for (let i = 0; i < points.length - 1; i++) {
          const offset =
            distance(points[i], points[i + 1]) -
            (distance(points[i], loc) + distance(points[i + 1], loc));

          if (Math.abs(offset) < ERASE_RADIUS) {
            position = index;
            break;
          }
        }

        return true;
      });

      return position;
    },
    [elements]
  );

  const getEventLocation = (e) => {
    if (e.touches && e.touches.length === 1) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.clientX && e.clientY) {
      return { x: e.clientX, y: e.clientY };
    }
  };

  const handleWheel = (amount) => {
    setZoom(clamp(zoom + amount, MIN_ZOOM, MAX_ZOOM));
  };

  const getClampedCamera = useCallback(
    (canvas, x, y) => {
      if (!canvas) {
        return { x: 0, y: 0 };
      }

      return {
        x: clamp(
          x,
          canvas.width - CAMERA_OFFSET_MAX.x * zoom,
          CAMERA_OFFSET_MAX.x * zoom
        ),
        y: clamp(
          y,
          canvas.height - CAMERA_OFFSET_MAX.y * zoom,
          CAMERA_OFFSET_MAX.y * zoom
        ),
      };
    },
    [zoom, CAMERA_OFFSET_MAX]
  );

  const paintLine = useCallback(
    (context, points) => {
      if (!context) {
        return;
      }

      context.beginPath();
      context.lineWidth = stroke;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = color;
      context.globalAlpha = 1;
      context.moveTo(points.start.x, points.start.y);
      context.lineTo(points.end.x, points.end.y);
      context.stroke();
    },
    [color, stroke]
  );

  const paintElement = useCallback((context, element) => {
    if (!context || !element.points.length) {
      return;
    }

    const { stroke, color, opacity, points } = element;

    context.lineWidth = stroke;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = color;
    context.globalAlpha = opacity;

    const start = points[0];
    context.moveTo(start.x, start.y);

    if (points.length < 2) {
      return;
    }

    context.beginPath();

    for (let i = 0; i < points.length - 1; i++) {
      const control = {
        x: (points[i].x + points[i + 1].x) / 2,
        y: (points[i].y + points[i + 1].y) / 2,
      };

      context.quadraticCurveTo(points[i].x, points[i].y, control.x, control.y);
    }

    context.stroke();
    // not sure why, but not clearing the path here gives unwanted results
    context.beginPath();
  }, []);

  const renderElements = useCallback(() => {
    if (!elements.length) {
      return;
    }

    elements.forEach((element) => paintElement(viewContext.current, element));
  }, [elements, paintElement]);

  const updateCanvas = useCallback(() => {
    if (!viewCanvas.current || !viewContext.current) {
      return;
    }

    let dpr = 1;

    if (useDpr.current) {
      dpr = window.devicePixelRatio;
    }

    const context = viewContext.current;
    const canvas = viewCanvas.current;

    context.resetTransform();
    context.clearRect(0, 0, canvas.width, canvas.height);

    // scale the context to ensure correct drawing operations
    context.scale(dpr, dpr);

    context.translate(canvas.width / 2 / dpr, canvas.height / 2 / dpr);
    context.scale(zoom, zoom);

    const origin = {
      x: -canvas.width / 2 / dpr,
      y: -canvas.height / 2 / dpr,
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

    renderElements();
  }, [cameraOffset, getClampedCamera, renderElements, zoom, setCameraOffset]);

  const setCanvasQuality = useCallback(
    (dpr) => {
      const canvas = viewCanvas.current;

      canvas.width = size.width * dpr;
      canvas.height = size.height * dpr;

      // set the "drawn" size of the canvas
      canvas.style.width = `${size.width}px`;
      canvas.style.height = `${size.height}px`;

      useDpr.current = dpr === 1 ? false : true;

      updateCanvas();
    },
    [size, updateCanvas]
  );

  const getPointer = useCallback(
    (location) => {
      const canvas = viewCanvas.current;
      const rect = canvas.getBoundingClientRect();
      const dpr = useDpr.current ? window.devicePixelRatio : 1;

      return {
        // we essentially apply the same translation operations as in `updateCanvas`
        x:
          (location.x - rect.left - canvas.width / 2 / dpr) / zoom -
          (-canvas.width / 2 / dpr + cameraOffset.x),
        y:
          (location.y - rect.top - canvas.height / 2 / dpr) / zoom -
          (-canvas.height / 2 / dpr + cameraOffset.y),
      };
    },
    [cameraOffset, zoom]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!viewCanvas.current) {
        return;
      }

      let location = getEventLocation(e);

      if (!location) {
        return;
      }

      const prevPointer = { ...pointer.current };
      pointer.current = getPointer(location);

      if (!pointerDown.current) {
        return;
      }

      switch (mode) {
        case Mode.Move:
          const clampedCamera = getClampedCamera(
            viewCanvas.current,
            location.x / zoom - moveStart.current.x,
            location.y / zoom - moveStart.current.y
          );

          setCameraOffset(clampedCamera);

          break;
        case Mode.Draw:
          const point = {
            x: pointer.current.x,
            y: pointer.current.y,
          };

          elements.map((element, index) => {
            if (index === elements.length - 1) {
              element.points.push(point);
              return element;
            }

            return element;
          });

          paintLine(viewContext.current, {
            start: prevPointer,
            end: pointer.current,
          });

          break;
        case Mode.Erase:
          const nearestElementIndex = getElementAtLocation(pointer.current);

          if (
            nearestElementIndex === undefined ||
            elementsToErase.current.has(nearestElementIndex)
          ) {
            return;
          }

          const nearestElement = elements[nearestElementIndex];

          sendErases.current.push(nearestElement);

          // make the element transparent
          nearestElement.opacity = 0.5;

          updateCanvas();

          elementsToErase.current.add(nearestElementIndex);
          break;
        default:
          break;
      }
    },
    [
      getClampedCamera,
      mode,
      updateCanvas,
      getPointer,
      elements,
      getElementAtLocation,
      setCameraOffset,
      paintLine,
      zoom,
    ]
  );

  const handlePointerDown = useCallback(
    (e) => {
      pointerDown.current = true;

      switch (mode) {
        case Mode.Draw:
          setElements([
            ...elements,
            { stroke: stroke, color: color, opacity: 1, points: [] },
          ]);
          break;
        case Mode.Move:
          let location = getEventLocation(e);

          moveStart.current = {
            x: location.x / zoom - cameraOffset.x,
            y: location.y / zoom - cameraOffset.y,
          };

          setPointerDisplay("grabbing");
          setCanvasQuality(1);

          break;
        default:
          break;
      }
    },
    [
      cameraOffset,
      mode,
      stroke,
      color,
      elements,
      setElements,
      setCanvasQuality,
      zoom,
    ]
  );

  const handlePointerUp = useCallback(
    (e) => {
      pointerDown.current = false;

      switch (mode) {
        case Mode.Draw:
          const lastElement = elements[elements.length - 1];

          if (!lastElement.points.length) {
            setElements(elements.slice(0, -1));
            return;
          }

          // push the most recent drawing for sending
          setSendElements([...sendElements, lastElement]);

          updateCanvas();

          break;
        case Mode.Erase:
          setElements(
            elements.filter((_, index) => !elementsToErase.current.has(index))
          );

          elementsToErase.current = new Set();

          updateCanvas();

          break;
        case Mode.Move:
          pinchDistanceStart.current = false;

          setPointerDisplay("grab");
          setCanvasQuality(window.devicePixelRatio);

          break;
        default:
          break;
      }
    },
    [
      mode,
      updateCanvas,
      elements,
      setElements,
      sendElements,
      setSendElements,
      setCanvasQuality,
    ]
  );

  const getPinchTouches = (e) => {
    return {
      touch1: { x: e.touches[0].clientX, y: e.touches[0].clientY },
      touch2: { x: e.touches[1].clientX, y: e.touches[1].clientY },
    };
  };

  const handleTouchMove = useCallback(
    (e) => {
      e.preventDefault();

      if (mode === Mode.Move && e.touches.length === 2) {
        const { touch1, touch2 } = getPinchTouches(e);

        const currentDistance = squareDifferenceSum(touch1, touch2);

        const start = pinchStart.current;

        setZoom(
          clamp(
            (start.zoom * currentDistance) / start.distance,
            MIN_ZOOM,
            MAX_ZOOM
          )
        );
      }

      handlePointerMove(e);
    },
    [mode, handlePointerMove]
  );

  const handleTouchStart = useCallback(
    (e) => {
      e.preventDefault();

      if (mode === Mode.Move && e.touches.length === 2) {
        const { touch1, touch2 } = getPinchTouches(e);

        pinchStart.current = {
          distance: squareDifferenceSum(touch1, touch2),
          zoom: zoom,
        };

        setCanvasQuality(1);

        return;
      }

      // don't draw unless using a stylus on mobile
      if (mode === Mode.Draw && e.touches[0].touchType === "direct") {
        return;
      }

      // reset the pointer each touch since we can't keep track of it
      pointer.current = getPointer(getEventLocation(e));

      handlePointerDown(e);
    },
    [mode, getPointer, handlePointerDown, zoom, setCanvasQuality]
  );

  const handleTouchEnd = useCallback(
    (e) => {
      e.preventDefault();
      setCanvasQuality(window.devicePixelRatio);
      handlePointerUp(e);
    },
    [handlePointerUp, setCanvasQuality]
  );

  useEffect(() => {
    switch (mode) {
      case Mode.Draw:
        setPointerDisplay("crosshair");
        break;
      case Mode.Move:
        setPointerDisplay("grab");
        break;
      case Mode.Erase:
        setPointerDisplay("cell");
        break;
      default:
        setPointerDisplay("default");
        break;
    }
  }, [mode]);

  useEffect(() => {
    updateCanvas();
  }, [backgroundColor, cameraOffset, updateCanvas, zoom]);

  useEffect(() => {
    if (!receiveElements.length) {
      return;
    }

    setElements([...elements, ...receiveElements]);
    setReceiveElements([]);

    updateCanvas();
  }, [receiveElements, updateCanvas, elements, setElements]);

  useEffect(() => {
    if (!receiveErases.length) {
      return;
    }

    let erasedElementIndicies = [];

    receiveErases.forEach((erasedElement) => {
      elements.forEach((element, elementIndex) => {
        element.points.forEach((point, pointIndex) => {
          if (pointIndex >= erasedElement.points.length) {
            return;
          }

          const erasedPoint = erasedElement.points[pointIndex];

          if (point.x === erasedPoint.x && point.y === erasedPoint.y) {
            erasedElementIndicies.push(elementIndex);
          }
        });
      });
    });

    setElements(
      elements.filter((_, index) => !erasedElementIndicies.includes(index))
    );

    setReceiveErases([]);

    updateCanvas();
  }, [receiveErases, updateCanvas, elements, setElements]);

  useEffect(() => {
    const canvas = viewCanvas.current;

    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

    canvas.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });

    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd, handleTouchMove]);

  useEffect(() => {
    const send = setInterval(() => {
      if (sendElements.length) {
        socket.emit("draw-data", sendElements);
        setSendElements([]);
      }

      if (sendErases.current.length) {
        socket.emit("erase-data", sendErases.current);
        sendErases.current = [];
      }
    }, SEND_INTERVAL);

    return () => {
      clearInterval(send);
    };
  }, [sendElements, setSendElements]);

  useEffect(() => {
    const canvas = viewCanvas.current;

    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // set the "drawn" size of the canvas
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    viewContext.current = canvas.getContext("2d");

    // we use state for receiving drawings since we don't want paint to become a dependency here :)
    socket.on("draw-data", (data) => setReceiveElements(data));
    // similarly for erasing..
    socket.on("erase-data", (data) => setReceiveErases(data));
  }, []);

  return (
    <>
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
        onMouseMove={handlePointerMove}
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onWheel={(e) => handleWheel(-e.deltaY * SCROLL_SENSITIVITY)}
        style={{ cursor: pointerDisplay }}
      ></canvas>
    </>
  );
};

export default Canvas;
