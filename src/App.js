import {Button, Col, Modal, Popover, Row} from "antd";
import "./App.css"
import {createRef, useEffect, useRef, useState} from "react";
import Calculator from "./calc/Calculator";

// TODO responsive
// TODO pause
// TODO record

export default function App() {

    const [color, setColor] = useState("#000000");
    const [brushColor, setBrushColor] = useState("#000000");
    const [size, setSize] = useState(2);
    const [brushSize, setBrushSize] = useState(2);
    const [fontSize, setFontSize] = useState(15);

    const [time, setTime] = useState(0);
    const [running, setRunning] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [isClicked, setClicked] = useState(false)
    const [zoom, setZoom] = useState(false);

    let inputFileRef = useRef(null);
    let _mediaRecorder = useRef(null)
    let videoSource = useRef("")
    let clickPos = useRef([]);
    let actionType = useRef("pen")
    let drawType = useRef("none");
    let text = useRef("")
    let ctx = useRef(null);

    let canvas = createRef()

    const canvasWidth = 1080;
    const canvasHeight = 610;

    useEffect(() => {
        ctx.current = canvas.current.getContext("2d");
    }, [canvas])

    useEffect(() => {
        let context = ctx.current
        context.fillStyle = "#fff"
        context.fillRect(0, 0, 2000, 2000);

        const mouseDown = () => setClicked(true)
        const mouseUp = () => {
            setClicked(false)
            if (actionType.current !== "text") {
                clickPos.current = []
            }
            ctx.current.closePath();
        }
        const clickEvent = (e) => {

            if (actionType.current === "text" && text.current.length > 0) {
                actionType.current = "pen"
                updateColorAndSize()
                text.current = ""
            }
        }

         const keyup = (e) => {
            if(e.key === 'z' && e.ctrlKey) {
                console.log()
            }
            if (actionType.current === "text") {
                if (e.key === "Enter") {
                    actionType.current = "pen"
                    updateColorAndSize()
                    text.current = ""
                }
                else {
                    text.current += e.key
                    ctx.current.font = fontSize + "px Arial";
                    ctx.current.fillStyle = brushColor
                    ctx.current.fillText(e.key, clickPos.current[0] + 8 * text.current.length, clickPos.current[1]);
                }
            }

        }

        window.addEventListener("click", clickEvent)
        window.addEventListener("mousedown", mouseDown)
        window.addEventListener("mouseup", mouseUp)
        window.addEventListener('keyup', keyup)

        return () => {
            window.removeEventListener("mousedown", mouseDown)
            window.removeEventListener("mouseup", mouseUp)
            window.removeEventListener('click', clickEvent);
            window.removeEventListener('keyup', keyup)


        }
    }, [])

    function drawImage(inputFile) {
        if (!inputFile) {
            return
        }
        let reader  = new FileReader();
        reader.onload = function(e)  {
            const img = new Image();
            img.src = e.target.result;
            img.addEventListener("load", (e) => {
                ctx.current.drawImage(img, 100, 100);

            })

        }
        reader.readAsDataURL(inputFile);
    }

    useEffect(() => {

        let interval;
        if (running) {
            interval = setInterval(() => {
                setTime((prevTime) => prevTime + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [running]);

    function updateColorAndSize() {
        let actionT = actionType.current
        if (actionT === "text") {
            setFontSize(11 + 4 * size)
        }
        else if (actionT === "pen") {
            setBrushSize(1.5 + size * 0.5)
        }
        else if (actionT === "marker" || actionT === "eraser") {
            setBrushSize(12 + size * 3)
        }
        if (actionT === "eraser") {
            setBrushColor("#FFFFFF")
        }
        else if (actionT === "pen" || actionT === "text") {
            setBrushColor(color)
        }
        else setBrushColor(color + Math.round(Math.min(Math.max(0.2 || 1, 0), 1) * 255).toString(16).toUpperCase());

    }
    function calcPos(e) {
        let rect = e.target.getBoundingClientRect();
        return [e.clientX - rect.left, e.clientY - rect.top];
    }

    async function startRecording() {
        setTime(0)
        setRunning(true)

        let recordedChunks = [];

        URL.revokeObjectURL(videoSource.current); // clear from memory

        let outer = canvas.current
        let mediaRecorder = await new MediaRecorder(await navigator.mediaDevices.getUserMedia({
            audio: true, video: false }).then(async (e) =>
            new MediaStream([ ...outer.captureStream(200).getTracks(), ...e.getTracks()])));

        mediaRecorder.ondataavailable = function (e) {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };
        mediaRecorder.onstop = function () {
            setRunning(false);

            const blob = new Blob(recordedChunks, {
                type: 'video/webm'
            });
            let filename = Date.now()
            let downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = `${filename}.webm`;

            videoSource.current = downloadLink.href
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            recordedChunks = [];
        };
        mediaRecorder.start(200); // For every 200ms the stream data will be stored in a separate chunk.
        console.log(mediaRecorder)
        return mediaRecorder
    }

  return (
    <div className="App">
        <Row className={"canvas"} style={{height: "90vh", margin: "2% 0 0 1%"}}>
            <Col className={"leftPane"} style={{width: "15%"}}>
                <div className={"line"}>
                    <i className="fa-solid fa-video"></i>
                    <label>Yeni Konu Anlatımı Oluştur</label>
                </div>
                <div className={"line"}>
                    <i className="fa-solid fa-film"></i>
                    <label>Konu Anlatımlarım</label>
                </div>
                <div className={"line"} style={{position: "absolute", top:"85vh"}}>
                    <i className="fa-solid fa-file-circle-plus"></i>
                    <label>Yeni Sayfa Oluştur</label>
                </div>
            </Col>
            <Col className={"center"}>
                <Modal open={isModalOpen} onOk={() => setModalOpen(false)} onCancel={() => setModalOpen(false)} width={850}
                       footer={[<Button type={"primary"} onClick={() => setModalOpen(false)}>OK</Button>]} >
                    <Row justify={"center"} align={"middle"} >
                        <video src={videoSource.current} controls style={{width: "720px", height: "100%"}}></video>
                    </Row>
                </Modal>
                <Row className={"up"} id={"canvasRow"} style={{marginBottom: "2%"}}>
                    <canvas width={canvasWidth}  ref={canvas} height={canvasHeight} style={{border: "3px solid black", borderRadius: "6px"}}
                            onMouseMove={(e) => {
                                if (actionType.current === "text" || !isClicked) {
                                    return
                                }
                                let pos = calcPos(e)
                                let context = ctx.current;

                                let cPos = clickPos.current
                                context.strokeStyle = brushColor;
                                context.lineWidth = brushSize;
                                context.lineCap = 'round';
                                context.beginPath();
                                context.moveTo(cPos[cPos.length - 2], cPos[cPos.length - 1])
                                clickPos.current.push(...calcPos(e))
                                context.lineTo(...pos);

                                // Draws the line.
                                context.stroke();

                            }
                        }
                    onClick={ (e) => {

                        if (drawType.current !== "none" || actionType.current === "text") {
                            clickPos.current.push(...calcPos(e))
                        }
                        let context = ctx.current;
                        let cPos = clickPos.current
                        if (actionType.current !== "text" && drawType.current === "none") {
                            context.strokeStyle = brushColor;
                            context.lineWidth = brushSize;
                            context.lineCap = 'round';
                            context.beginPath();
                            context.moveTo(cPos[cPos.length - 2], cPos[cPos.length - 1])
                        }


                        if (drawType.current === "line" && cPos.length === 4) {
                            context.strokeStyle = brushColor
                            context.lineWidth = brushSize * 3.75;
                            context.beginPath();
                            context.moveTo(cPos[0], cPos[1]);
                            context.lineTo(cPos[2], cPos[3]);
                            context.stroke();
                            drawType.current = "none"
                        }

                        else if (drawType.current === "square" && cPos.length === 6) {
                            context.fillStyle = brushColor
                            let top = cPos[1]
                            let left = cPos[0];
                            let tm = top;
                            let lm = left
                            for (let i = 1; i < 3; i++) {
                                top = Math.min(top, cPos[i * 2 + 1])
                                tm = Math.max(top, cPos[i * 2 + 1])
                                left = Math.min(left, cPos[i * 2])
                                lm = Math.max(lm, cPos[i * 2])
                            }
                            let size =  Math.min(lm - left, tm - top)
                            context.fillRect(left, top, size, size);
                            drawType.current = "none"
                        }

                        else if (drawType.current === "rectangle" && cPos.length === 4) {
                            context.fillStyle = brushColor
                            let top = cPos[1]
                            let left = cPos[0];
                            let tm = top;
                            let lm = left
                            for (let i = 1; i < 2; i++) {
                                top = Math.min(top, cPos[i * 2 + 1])
                                tm = Math.max(top, cPos[i * 2 + 1])
                                left = Math.min(left, cPos[i * 2])
                                lm = Math.max(lm, cPos[i * 2])
                            }
                            context.fillRect(left, top, lm - left, tm - top);
                            drawType.current = "none"
                        }

                        else if (drawType.current === "triangle" && cPos.length === 6) {
                            context.fillStyle = brushColor
                            context.beginPath();
                            context.moveTo(cPos[0], cPos[1])
                            for (let i = 1; i < 3; i++) {
                                context.lineTo(cPos[i * 2], cPos[i * 2 + 1]);
                            }
                            context.closePath();
                            context.fill();
                            drawType.current = "none"
                        }

                        else if (drawType.current === "polygon") {
                            context.fillStyle = brushColor
                            context.strokeStyle = brushColor
                            context.lineWidth = brushSize * 3.75;
                            context.lineCap = 'round';



                            if (cPos.length === 2) {

                                context.moveTo(cPos[cPos.length - 2], cPos[cPos.length - 1]);
                                context.lineTo(cPos[cPos.length - 2], cPos[cPos.length - 1]);

                                context.stroke();
                                context.beginPath();
                                context.moveTo(cPos[0], cPos[1])
                            }
                            else {
                                context.lineTo(cPos[cPos.length - 2], cPos[cPos.length - 1])
                                if (Math.pow(cPos[0] - cPos[cPos.length - 2], 2) +
                                    Math.pow(cPos[1] - cPos[cPos.length - 1], 2) < 100) {
                                    context.closePath();
                                    context.fill();
                                    drawType.current = "none"
                                }
                            }

                        }

                        }
                    }/>
                </Row>
                <Row>
                    <Col style={{marginRight: "25%"}}>
                        <i className="fa-solid fa-circle-dot" onClick={async () => _mediaRecorder.current = await startRecording()}></i>
                        <label style={{marginRight: "15px"}}>Başlat</label>
                        <i className="fa-solid fa-square" onClick={() => {
                            setRunning(false)
                            _mediaRecorder.current.stop();
                        }}></i>
                        <label style={{marginRight: "15px"}}>Durdur</label>
                        <i className="fa-solid fa-clapperboard" onClick={() => {
                            setModalOpen(true)
                        }}></i>
                        <label style={{marginRight: "15px"}}>İzle</label>
                    </Col>
                    <Col>
                        <i className="fa-solid fa-stopwatch"></i>
                        <label style={{fontSize: "24px"}}>{(time/60 < 10 ? "0" : "") + Math.floor(time / 60) + ":" + ( time % 60 < 10 ? "0" : "") + time % 60}</label>
                    </Col>
                </Row>
                <Row>
                    <i className="fa-solid fa-video"></i>
                    <label>VİDEO BİLGİSİ</label>
                </Row>
            </Col>
            <Col className={"rightPane"} style={{marginLeft: "6%", width: "6%"}}>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-solid fa-pen" onClick={() => {
                        actionType.current = "pen"
                        updateColorAndSize()
                    }}></i>
                    <i className="fa-solid fa-marker" onClick={() => {
                        actionType.current = "marker"
                        updateColorAndSize()
                    }}></i>
                    <i className="fa-solid fa-eraser" onClick={() => {
                        actionType.current = "eraser"
                        updateColorAndSize()
                    }}></i>
                </Row>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-solid fa-trash" onClick={() => {
                        ctx.current.fillStyle = "#fff"
                        ctx.current.fillRect(0, 0, 2000, 2000);
                        // TODO draw image
                    }}></i>
                    <i className="fa-solid fa-rotate-right"  onClick={() => console.log()}></i>
                    <i className="fa-solid fa-arrow-pointer" onClick={() => console.log()}></i>
                </Row>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-solid fa-copy"></i>
                    <i className="fa-solid fa-image" onClick={() => inputFileRef.current.click()}><input type='file' ref={inputFileRef} onChange={(e) => {
                        drawImage(e.target.files[0])
                    }} style={{display: 'none'}}/></i>
                    <i className="fa-solid fa-a" onClick={() => {
                        actionType.current = "text"
                        text.current = ""
                        updateColorAndSize()
                    }
                    }></i>

                </Row>
                <Row align={"middle"} justify={"center"}>
                    <Popover content={<Calculator/>} placement={"leftBottom"} trigger="click">
                        <i className="fa-solid fa-calculator" ></i>
                    </Popover>
                    <i className="fa-solid fa-circle-info"></i>
                </Row>
                <hr/>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-regular fa-square" style={{backgroundColor: "black", borderRadius: "3px"}} onClick={() => {
                        setColor("#000000")
                        updateColorAndSize()
                    }}></i>
                    <i className="fa-regular fa-square" style={{backgroundColor: "blue", borderRadius: "3px"}} onClick={() => {
                        setColor("#0000FF")
                        updateColorAndSize()

                    }}></i>
                    <i className="fa-regular fa-square" style={{backgroundColor: "green", borderRadius: "3px"}} onClick={() => {
                        setColor("#00FF00")
                        updateColorAndSize()

                    }}></i>
                </Row>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-regular fa-square" style={{backgroundColor: "yellow", borderRadius: "3px"}} onClick={() => {
                        setColor("#FFFF00")
                        updateColorAndSize()

                    }}></i>
                    <i className="fa-regular fa-square" style={{backgroundColor: "orange", borderRadius: "3px"}} onClick={() => {
                        setColor("#FFA500")
                        updateColorAndSize()

                    }}></i>
                    <i className="fa-regular fa-square" style={{backgroundColor: "red", borderRadius: "3px"}} onClick={() => {
                        setColor("#FF0000")
                        updateColorAndSize()

                    }}></i>
                </Row>
                <hr/>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-regular fa-circle" style={{fontSize: "8px"}} onClick={()=> setSize(1)}></i>
                    <i className="fa-regular fa-circle" style={{fontSize: "12px"}} onClick={()=> setSize(2)}></i>
                    <i className="fa-regular fa-circle" style={{fontSize: "16px"}} onClick={()=> setSize(3)}></i>
                </Row>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-regular fa-circle" style={{fontSize: "20px"}} onClick={()=> setSize(4)}></i>
                    <i className="fa-regular fa-circle" style={{fontSize: "24px"}} onClick={()=> setSize(5)}></i>
                    <i className="fa-regular fa-circle" style={{fontSize: "28px"}} onClick={()=> setSize(6)}></i>
                </Row>
                <hr/>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-solid fa-arrows-left-right" onClick={() => {
                       clickPos.current = []
                        drawType.current = "line"
                    }}></i>
                    <i className="fa-solid fa-caret-up" onClick={() => {
                        clickPos.current = []
                        drawType.current = "triangle"
                    }}></i>
                    <i className="fa-solid fa-square" onClick={() => {
                        clickPos.current = []
                        drawType.current = "square"
                    }}></i>
                </Row>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-solid fa-rectangle-xmark" onClick={() => {
                        clickPos.current = []
                        drawType.current = "rectangle"
                    }}></i>
                    <i className="fa-solid fa-draw-polygon" onClick={() => {
                        clickPos.current = []
                        drawType.current = "polygon"
                    }}></i>
                </Row>
                <hr/>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-solid fa-plus"></i>
                    <i className="fa-solid fa-arrow-right"></i>
                    <i className="fa-solid fa-code-branch"></i>
                </Row>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-solid fa-crop"></i>
                </Row>
            </Col>

        </Row>
    </div>
  );
}

