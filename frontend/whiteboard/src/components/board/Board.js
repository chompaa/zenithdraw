import { socket } from "../../socket";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";

import { addAlpha, clamp, distance } from "../../utils";

import Mode from "../container/Mode";

import "./style.css";

const Board = forwardRef(({ size, color, backgroundColor, mode }, ref) => {
  const BORDER_SIZE = 20;

  const viewCanvas = useRef(null);
  const viewContext = useRef(null);

  // drawing
  const LINE_SIZE = 4;

  // erasing
  const ERASE_RADIUS = 5;
  const elementsToErase = useRef(new Set());

  // moving
  const moveStart = useRef({ x: 0, y: 0 });
  const pointer = useRef({ x: 0, y: 0 });
  const prevPointer = useRef({ x: 0, y: 0 });
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const cameraOffsetMax = useRef({ x: 0, y: 0 });

  // zooming
  const SCROLL_SENSITIVITY = 0.001;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 10;
  const [zoom, setZoom] = useState(2);
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

      element.every((p) => {
        const offset =
          distance(p.start, p.end) -
          (distance(p.start, loc) + distance(p.end, loc));

        if (Math.abs(offset) < ERASE_RADIUS) {
          position = index;
          return false;
        }

        return true;
      });

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
        x: clamp(x, canvas.width - maxOffset.x * zoom, maxOffset.x * zoom),
        y: clamp(y, canvas.height - maxOffset.y * zoom, maxOffset.y * zoom),
      };
    },
    [zoom]
  );

  const paint = useCallback((context, element) => {
    if (!context) {
      return;
    }

    const { start, end, color } = element;

    context.save();
    if (color && color.length >= 8 && color[6] !== "FF" && color[7] !== "FF") {
      context.globalCompositeOperation = "xor";
    }
    context.beginPath();
    context.lineWidth = LINE_SIZE;
    context.strokeStyle = color;
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.closePath();
    context.stroke();
    context.restore();
  }, []);

  const renderElements = useCallback(() => {
    elements.current.forEach((element) =>
      element.forEach((line) => paint(viewContext.current, line))
    );
  }, [paint]);

  const updateCanvas = useCallback(() => {
    if (!viewCanvas.current || !viewContext.current) {
      return;
    }

    const context = viewContext.current;
    const canvas = viewCanvas.current;

    context.resetTransform();
    context.clearRect(0, 0, canvas.width, canvas.height);
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

    renderElements();

    context.lineWidth = LINE_SIZE;
  }, [cameraOffset, getClampedCamera, renderElements, zoom]);

  const getPointer = useCallback(
    (location) => {
      let rect = viewCanvas.current.getBoundingClientRect();

      return {
        x: Math.floor((location.x - rect.left - cameraOffset.x) / zoom),
        y: Math.floor((location.y - rect.top - cameraOffset.y) / zoom),
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

      // update pointer locations
      prevPointer.current = pointer.current;
      pointer.current = getPointer(location);

      console.log(pointer.current.x, pointer.current.y);

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
          const element = {
            start: prevPointer.current,
            end: pointer.current,
            color: color,
          };

          paint(viewContext.current, element);

          elements.current[elements.current.length - 1].push(element);

          break;
        case Mode.Erase:
          const nearestElement = getElementAtLocation(pointer.current);

          if (
            nearestElement === undefined ||
            elementsToErase.current.has(nearestElement)
          ) {
            return;
          }

          sendErases.current.push(elements.current[nearestElement]);

          // make the element transparent
          elements.current[nearestElement].forEach((point) => {
            if (point.color.length >= 8) {
              return;
            }

            point.color = addAlpha(point.color, 0.5);
          });

          updateCanvas();

          elementsToErase.current.add(nearestElement);
          break;
        default:
          break;
      }
    },
    [color, getClampedCamera, mode, paint, updateCanvas, getPointer]
  );

  const handlePointerDown = useCallback(
    (e) => {
      pointerDown.current = true;

      switch (mode) {
        case Mode.Draw:
          elements.current.push([]);
          break;
        case Mode.Move:
          let location = getEventLocation(e);

          moveStart.current = {
            x: location.x - cameraOffset.x,
            y: location.y - cameraOffset.y,
          };

          break;
        default:
          break;
      }
    },
    [cameraOffset, mode]
  );

  const handlePointerUp = useCallback(
    (e) => {
      pointerDown.current = false;

      switch (mode) {
        case Mode.Draw:
          // push the most recent drawing for sending
          sendElements.current.push(
            elements.current[elements.current.length - 1]
          );
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

      const pointer = getPointer(getEventLocation(e));

      prevPointer.current = pointer;
      pointer.current = pointer;

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
    if (!receiveElements.length) {
      return;
    }

    receiveElements.forEach((element) => {
      // add to the front since user drawings are last
      elements.current.unshift(element);
      element.forEach((line) => paint(viewContext.current, line));
    });
  }, [receiveElements, paint]);

  useEffect(() => {
    if (!receiveErases.length) {
      return;
    }

    receiveErases.forEach((erasedElements) => {
      elements.current = elements.current.filter((element) =>
        element.every((line, index) => {
          if (index >= erasedElements.length) {
            // elements have different amount of lines
            return true;
          }

          const erasedLine = erasedElements[index];
          // account for change in alpha
          erasedLine.color = erasedLine.color.slice(0, 7);

          // perhaps there's a better approach..
          return JSON.stringify(line) !== JSON.stringify(erasedLine);
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
    if (!viewCanvas.current) {
      return;
    }

    initializeCanvas(viewCanvas, viewContext);

    viewContext.current.imageSmoothingEnabled = false;

    const canvasSize = {
      width: viewCanvas.current.width,
      height: viewCanvas.current.height,
    };

    setCameraOffset({ x: canvasSize.width / 2, y: canvasSize.height / 2 });
    cameraOffsetMax.current = {
      x: canvasSize.width,
      y: canvasSize.height,
    };

    // we use state for receiving drawings since we don't want paint to become a dependency here :)
    socket.on("draw-data", (data) => setReceiveElements(data));
    // similarly for erasing..
    socket.on("erase-data", (data) => setReceiveErases(data));

    const send = setInterval(() => {
      if (sendElements) {
        socket.emit("draw-data", sendElements.current);
        sendElements.current = [];
      }

      if (sendErases) {
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
