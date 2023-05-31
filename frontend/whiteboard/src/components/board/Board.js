import { socket } from "../../socket";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";

import { clamp, distance } from "../../utils";

import Mode from "../container/Mode";

import "./style.css";

const Board = forwardRef(({ size, color, backgroundColor, mode }, ref) => {
  const BORDER_SIZE = 20;

  const viewCanvas = useRef(null);
  const viewContext = useRef(null);

  // drawing
  const LINE_SIZE = 5;

  // erasing
  const ERASE_RADIUS = 5;
  const elementsToErase = useRef(new Set());

  // moving
  const moveStart = useRef({ x: 0, y: 0 });
  const pointer = useRef({ x: 0, y: 0 });
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const cameraOffsetMax = useRef({ x: 0, y: 0 });

  // zooming
  const SCROLL_SENSITIVITY = 0.001;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 30;
  const [zoom, setZoom] = useState(1);
  const pinchDistanceStart = useRef(null);

  // sending & receiving drawings
  const SEND_INTERVAL = 1000;
  const sendElements = useRef([]);
  const sendErases = useRef([]);
  const [receiveElements, setReceiveElements] = useState([]);
  const [receiveErases, setReceiveErases] = useState([]);

  const pointerDown = useRef(false);
  const elements = useRef([]);

  useImperativeHandle(ref, () => {
    return {
      getElements() {
        return elements.current;
      },
      setElements(newElements) {
        elements.current = [...newElements];
        sendElements.current = [...newElements];
        updateCanvas();
      },
    };
  });

  const getElementAtLocation = (loc) => {
    let position = undefined;
    const currPointer = pointer.current;

    elements.current.every((element, index) => {
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
  };

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

      let maxOffset = cameraOffsetMax.current;

      return {
        x: clamp(
          x,
          canvas.width - maxOffset.x * zoom * window.devicePixelRatio,
          maxOffset.x * zoom * window.devicePixelRatio
        ),
        y: clamp(
          y,
          canvas.height - maxOffset.y * zoom * window.devicePixelRatio,
          maxOffset.y * zoom * window.devicePixelRatio
        ),
      };
    },
    [zoom]
  );

  const paint = useCallback((context, element) => {
    if (!context) {
      return;
    }

    console.log("paint", element.points.length);
    const { color, opacity, points } = element;

    context.lineWidth = LINE_SIZE;
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
    elements.current.forEach((element) => paint(viewContext.current, element));
  }, [paint]);

  const updateCanvas = useCallback(() => {
    if (!viewCanvas.current || !viewContext.current) {
      return;
    }

    const context = viewContext.current;
    const canvas = viewCanvas.current;

    context.resetTransform();
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.translate(canvas.width / 2 + 0.5, canvas.height / 2 + 0.5);

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

    context.scale(
      window.devicePixelRatio * zoom,
      window.devicePixelRatio * zoom
    );
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

    renderElements();

    context.lineWidth = LINE_SIZE;
  }, [cameraOffset, getClampedCamera, renderElements, zoom]);

  const getPointer = useCallback(
    (location) => {
      let rect = viewCanvas.current.getBoundingClientRect();

      return {
        x:
          (location.x - rect.left - cameraOffset.x) /
          (zoom * window.devicePixelRatio),
        y:
          (location.y - rect.top - cameraOffset.y) /
          (zoom * window.devicePixelRatio),
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

      console.log("moveLocation", location.x, location.y);

      pointer.current = getPointer(location);

      if (!pointerDown.current) {
        return;
      }

      switch (mode) {
        case Mode.Move:
          setCameraOffset(
            getClampedCamera(
              viewCanvas.current,
              location.x - moveStart.current.x,
              location.y - moveStart.current.y
            )
          );
          break;
        case Mode.Draw:
          const point = {
            x: pointer.current.x,
            y: pointer.current.y,
          };

          elements.current.at(-1).points.push(point);
          updateCanvas();

          break;
        case Mode.Erase:
          const nearestElementIndex = getElementAtLocation(pointer.current);

          if (
            nearestElementIndex === undefined ||
            elementsToErase.current.has(elements.current[nearestElementIndex])
          ) {
            return;
          }

          const nearestElement = elements.current[nearestElementIndex];

          // push a copy since we will modify the opacity of the existing element
          sendErases.current.push(structuredClone(nearestElement));

          // make the element transparent
          nearestElement.opacity = 0.5;

          updateCanvas();

          elementsToErase.current.add(nearestElementIndex);
          break;
        default:
          break;
      }
    },
    [getClampedCamera, mode, updateCanvas, getPointer]
  );

  const handlePointerDown = useCallback(
    (e) => {
      pointerDown.current = true;

      switch (mode) {
        case Mode.Draw:
          elements.current.push({ color: color, opacity: 1, points: [] });
          break;
        case Mode.Move:
          let location = getEventLocation(e);

          console.log("downLocation", location);

          moveStart.current = {
            x: location.x - cameraOffset.x,
            y: location.y - cameraOffset.y,
          };

          break;
        default:
          break;
      }
    },
    [cameraOffset, mode, color]
  );

  const handlePointerUp = useCallback(
    (e) => {
      pointerDown.current = false;

      switch (mode) {
        case Mode.Draw:
          const lastElement = elements.current.at(-1);

          if (!lastElement.points.length) {
            elements.current = elements.current.slice(0, -1);
            return;
          }

          // push the most recent drawing for sending
          sendElements.current.push(elements.current.at(-1));
          updateCanvas();
          break;
        case Mode.Erase:
          elements.current = elements.current.filter(
            (_, index) => !elementsToErase.current.has(index)
          );
          elementsToErase.current = new Set();
          updateCanvas();
          break;
        case Mode.Move:
          pinchDistanceStart.current = false;
          break;
        default:
          break;
      }
    },
    [mode, updateCanvas]
  );

  const handleTouchMove = useCallback(
    (e) => {
      e.preventDefault();

      if (e.touches.length === 2 && mode === Mode.Move) {
        const touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        const touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };

        const currentDistance =
          Math.pow(touch1.x - touch2.x, 2) + Math.pow(touch1.y - touch2.y, 2);

        if (!pinchDistanceStart.current) {
          pinchDistanceStart.current = currentDistance;
        } else {
          setZoom((zoom) =>
            clamp(
              zoom * Math.sqrt(currentDistance / pinchDistanceStart.current),
              MIN_ZOOM,
              MAX_ZOOM
            )
          );
        }
      }

      handlePointerMove(e);
    },
    [mode, handlePointerMove]
  );

  const handleTouchStart = useCallback(
    (e) => {
      e.preventDefault();

      // don't draw unless using a stylus on mobile
      if (
        e.touches.length === 2 ||
        (mode === Mode.Draw && e.touches[0].touchType === "direct")
      ) {
        return;
      }

      console.log("touch start");

      // reset the pointer each touch since we can't keep track of it
      pointer.current = getPointer(getEventLocation(e));

      handlePointerDown(e);
    },
    [mode, getPointer, handlePointerDown]
  );

  const handleTouchEnd = useCallback(
    (e) => {
      e.preventDefault();
      handlePointerUp(e);
    },
    [handlePointerUp]
  );

  useEffect(() => {
    updateCanvas();
  }, [backgroundColor, cameraOffset, updateCanvas, zoom]);

  useEffect(() => {
    if (!receiveElements.length) {
      return;
    }

    receiveElements.forEach((element) => {
      // add to the front since user drawings are last
      console.log("length", element.points.length);
      elements.current.push(element);
    });

    updateCanvas();
  }, [receiveElements, updateCanvas]);

  useEffect(() => {
    if (!receiveErases.length) {
      return;
    }

    receiveErases.forEach((erasedElement) => {
      elements.current = elements.current.filter((element) =>
        element.points.every((point, index) => {
          if (index >= erasedElement.points.length) {
            // elements have different amount of points
            return true;
          }

          const erasedPoint = erasedElement.points[index];

          return point.x !== erasedPoint.x || point.y !== erasedPoint.y;
        })
      );
    });

    updateCanvas();
  }, [receiveErases, updateCanvas]);

  useEffect(() => {
    const canvas = viewCanvas.current;

    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });

    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd, handleTouchMove]);

  useEffect(() => {
    cameraOffsetMax.current = {
      x: size.width * devicePixelRatio,
      y: size.height * devicePixelRatio,
    };
  }, [size]);

  useEffect(() => {
    const canvas = viewCanvas.current;

    if (!canvas) {
      return;
    }

    setCameraOffset({ x: canvas.width / 2, y: canvas.height / 2 });

    const context = canvas.getContext("2d");

    context.imageSmoothingEnabled = false;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = LINE_SIZE;
    viewContext.current = context;

    // we use state for receiving drawings since we don't want paint to become a dependency here :)
    socket.on("draw-data", (data) => setReceiveElements(data));
    // similarly for erasing..
    socket.on("erase-data", (data) => setReceiveErases(data));

    const send = setInterval(() => {
      if (sendElements.current.length) {
        socket.emit("draw-data", sendElements.current);
        sendElements.current = [];
      }

      if (sendErases.current.length) {
        socket.emit("erase-data", sendErases.current);
        sendErases.current = [];
      }
    }, SEND_INTERVAL);

    return () => {
      clearInterval(send);
    };
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
      ></canvas>
    </>
  );
});

export default Board;
