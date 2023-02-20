import {Button, Col, Modal, Popover, Row} from "antd";
import "./App.css"
import {createRef, useEffect, useRef, useState} from "react";
import Calculator from "./calc/Calculator";

// TODO responsive
// TODO pause
// TODO record

export default function App() {

    const [time, setTime] = useState(0);
    const [running, setRunning] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [isClicked, setClicked] = useState(false)

    let brushColor = useRef("#000000");
    let brushSize = useRef(2);
    let fontSize = useRef(15);
    let size = useRef(2);
    let color = useRef("#000000");
    let inputFileRef = useRef(null);
    let _mediaRecorder = useRef(null)
    let videoSource = useRef("")
    let penClickPos = useRef([]);
    let actionType = useRef("pen")
    let drawClickPos = useRef([]);
    let drawType = useRef("none");
    let text = useRef("")
    let ctx = useRef(null);
    let snapshots = useRef([]);
    let zooms = useRef([]);
    let scale = useRef(1);

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

         const keyup = (e) => {
            if(e.key === 'z' && e.ctrlKey) {
                undo()
            }
            if (actionType.current === "text") {
                if (e.key === "Enter") {
                    actionType.current = "pen"
                    updateColorAndSize()
                    text.current = ""
                }
                else if (e.key.length === 1) {
                    text.current += e.key
                    ctx.current.font = Math.round(fontSize.current) + "px Arial";
                    ctx.current.fillStyle = brushColor.current
                    ctx.current.fillText(e.key, penClickPos.current[0] + Math.round(fontSize.current * 0.6) * text.current.length, penClickPos.current[1]);
                }
            }

        }

        window.addEventListener('keyup', keyup)

        return () => {
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
            img.src = e.target.result.toString();
            img.addEventListener("load", () => {
                ctx.current.drawImage(img, 20, 20);

            })

        }
        reader.readAsDataURL(inputFile);
    }

    function undo() {
        if (!snapshots) {
            return
        }
        const img = new Image();
        img.src = snapshots.current.pop();
        img.addEventListener("load", () => {
            ctx.current.drawImage(img, 0, 0);

        })
    }

    function resize(type) {
        let src = zooms.current[0]
        let curScale = 1
        if (scale.current === 1) {
            src = canvas.current.toDataURL()
        }
        if (type === '+') {
            scale.current += 0.05;
        }
        else {
            scale.current -= 0.05
        }
        curScale = scale.current

        if (scale < 1) {
            if (type === '+') {
                if (!!zooms) {
                    src = zooms.current.pop()
                }
            }
            else {
                curScale = scale.current
            }
        }
        else if (scale > 1) {
            if (type === '-') {
                if (!!zooms) {
                    src = zooms.current.pop()
                }
            }
            else {
                curScale = scale.current
            }
        }
        const img = new Image();
        img.src = src
        img.addEventListener("load", () => {
            ctx.current.scale(curScale, curScale)
            ctx.current.drawImage(img, 0, 0);
        })
        ctx.current.scale(1, 1)
        zooms.current.push(zooms.current)
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
            fontSize.current = 12 + 3 * size.current
        }
        else if (actionT === "pen") {
            brushSize.current = 1.5 + size.current * 0.5
        }
        else if (actionT === "marker" || actionT === "eraser") {
            brushSize.current = 12 + size.current * 3
        }
        if (actionT === "eraser") {
            brushColor.current = "#FFFFFF"
        }
        else if (actionT === "pen" || actionT === "text") {
            brushColor.current = color.current
        }
        else brushColor.current = color.current + Math.round(Math.min(Math.max(0.2 || 1, 0), 1) * 255).toString(16).toUpperCase();
        let context = ctx.current
        context.fillStyle = brushColor.current
        context.strokeStyle = brushColor.current
        context.font = fontSize.current + "px Arial"
        context.lineWidth = brushSize.current
        penClickPos.current = []
        context.closePath()
    }
    function calcClickPos(e) {
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
                                if (actionType.current === "text" || !isClicked || drawType.current !== "none") {
                                    return
                                }
                                let pos = calcClickPos(e)
                                let context = ctx.current;

                                let penPos = penClickPos.current
                                context.strokeStyle = brushColor.current;
                                context.lineWidth = brushSize.current;
                                context.lineCap = 'round';
                                context.beginPath();
                                context.moveTo(penPos[penPos.length - 2], penPos[penPos.length - 1])
                                penClickPos.current.push(...pos)
                                context.lineTo(...pos);

                                // Draws the line.
                                context.stroke();
                        }
                     } onClick={(e) => {
                        if (actionType.current === "text" && text.current.length > 0) {
                            actionType.current = "pen"
                            updateColorAndSize()
                            text.current = ""
                            return
                        }

                        if (actionType.current === "text") {
                            penClickPos.current.push(...calcClickPos(e))
                        }

                        let context = ctx.current;
                        let drawT = drawType.current

                        if (drawT !== "none") {
                            drawClickPos.current.push(...calcClickPos(e))
                        }

                        let drawPos = drawClickPos.current


                        if (actionType.current !== "text" && drawT !== "none") {
                            context.strokeStyle = brushColor.current;
                            context.lineWidth = brushSize.current;
                            context.lineCap = 'round';
                            context.beginPath();
                            context.moveTo(drawPos[drawPos.length - 2], drawPos[drawPos.length - 1])
                        }


                        if (drawT === "line" && drawPos.length === 4) {
                            context.strokeStyle = brushColor.current
                            context.lineWidth = brushSize.current * 3.75;
                            context.beginPath();
                            context.moveTo(drawPos[0], drawPos[1]);
                            context.lineTo(drawPos[2], drawPos[3]);
                            context.stroke();
                            drawType.current = "none"
                            updateColorAndSize()
                        }

                        else if (drawT === "square" && drawPos.length === 6) {
                            context.fillStyle = brushColor.current
                            let top = drawPos[1]
                            let left = drawPos[0];
                            let tm = top;
                            let lm = left
                            for (let i = 1; i < 3; i++) {
                                top = Math.min(top, drawPos[i * 2 + 1])
                                tm = Math.max(top, drawPos[i * 2 + 1])
                                left = Math.min(left, drawPos[i * 2])
                                lm = Math.max(lm, drawPos[i * 2])
                            }
                            let size =  Math.min(lm - left, tm - top)
                            context.fillRect(left, top, size, size);
                            drawType.current = "none"
                            updateColorAndSize()
                        }

                        else if (drawT === "rectangle" && drawPos.length === 4) {
                            context.fillStyle = brushColor.current
                            let top = drawPos[1]
                            let left = drawPos[0];
                            let tm = top;
                            let lm = left
                            for (let i = 1; i < 2; i++) {
                                top = Math.min(top, drawPos[i * 2 + 1])
                                tm = Math.max(top, drawPos[i * 2 + 1])
                                left = Math.min(left, drawPos[i * 2])
                                lm = Math.max(lm, drawPos[i * 2])
                            }
                            context.fillRect(left, top, lm - left, tm - top);
                            drawType.current = "none"
                            updateColorAndSize()
                        }

                        else if (drawT === "triangle" && drawPos.length === 6) {
                            context.fillStyle = brushColor.current
                            context.beginPath();
                            context.moveTo(drawPos[0], drawPos[1])
                            for (let i = 1; i < 3; i++) {
                                context.lineTo(drawPos[i * 2], drawPos[i * 2 + 1]);
                            }
                            context.closePath();
                            context.fill();
                            drawType.current = "none"
                            updateColorAndSize()
                        }

                        else if (drawT === "polygon") {
                            context.fillStyle = brushColor.current
                            context.strokeStyle = brushColor.current
                            context.lineWidth = brushSize.current * 3.75;
                            context.lineCap = 'round';

                            if (drawPos.length === 2) {

                                context.moveTo(drawPos[0], drawPos[1]);
                                context.lineTo(drawPos[0], drawPos[1]);

                                context.stroke();
                                context.beginPath();
                                context.moveTo(drawPos[0], drawPos[1])
                            }
                            else {
                                context.lineTo(drawPos[drawPos.length - 2], drawPos[drawPos.length - 1])
                                if (Math.pow(drawPos[0] - drawPos[drawPos.length - 2], 2) +
                                    Math.pow(drawPos[1] - drawPos[drawPos.length - 1], 2) < 500) {
                                    context.closePath();
                                    context.fill();
                                    drawType.current = "none"
                                    updateColorAndSize()
                                }
                            }

                        }
                     }
                    } onMouseDown={() => {
                        setClicked(true)

                        snapshots.current.push(canvas.current.toDataURL());
                    }} onMouseUp={ () => {
                        setClicked(false)
                        if (actionType.current !== "text" && drawType.current === 'none') {
                            penClickPos.current = []
                        }
                        if (drawType.current === 'none') {
                            ctx.current.closePath();
                        }

                    }}/>
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
                        updateColorAndSize()
                    }}></i>
                    <i className="fa-solid fa-rotate-right"  onClick={() => undo()}></i>
                    <i className="fa-solid fa-arrow-pointer" onClick={() => resize("+")}></i>
                </Row>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-solid fa-copy"></i>
                    <i className="fa-solid fa-image" onClick={() => inputFileRef.current.click()}><input type='file' ref={inputFileRef} onChange={(e) => {
                        drawImage(e.target.files[0])
                        updateColorAndSize()
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
                        color.current = "#000000"
                        updateColorAndSize()
                    }}></i>
                    <i className="fa-regular fa-square" style={{backgroundColor: "blue", borderRadius: "3px"}} onClick={() => {
                        color.current = "#0000FF"
                        updateColorAndSize()

                    }}></i>
                    <i className="fa-regular fa-square" style={{backgroundColor: "green", borderRadius: "3px"}} onClick={() => {
                        color.current = "#00FF00"
                        updateColorAndSize()

                    }}></i>
                </Row>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-regular fa-square" style={{backgroundColor: "yellow", borderRadius: "3px"}} onClick={() => {
                        color.current = "#FFFF00"
                        updateColorAndSize()

                    }}></i>
                    <i className="fa-regular fa-square" style={{backgroundColor: "orange", borderRadius: "3px"}} onClick={() => {
                        color.current = "#FFA500"
                        updateColorAndSize()

                    }}></i>
                    <i className="fa-regular fa-square" style={{backgroundColor: "red", borderRadius: "3px"}} onClick={() => {
                        color.current = "#FF0000"
                        updateColorAndSize()

                    }}></i>
                </Row>
                <hr/>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-regular fa-circle" style={{fontSize: "8px"}} onClick={()=> {
                        size.current = 1
                        updateColorAndSize()

                    }}></i>
                    <i className="fa-regular fa-circle" style={{fontSize: "12px"}} onClick={()=> {
                        size.current = 2
                        updateColorAndSize()

                    }}></i>
                    <i className="fa-regular fa-circle" style={{fontSize: "16px"}} onClick={()=> {
                        size.current = 3
                        updateColorAndSize()
                    }}></i>
                </Row>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-regular fa-circle" style={{fontSize: "20px"}} onClick={()=> {
                        size.current = 4
                        updateColorAndSize()
                    }}></i>
                    <i className="fa-regular fa-circle" style={{fontSize: "24px"}} onClick={()=> {
                        size.current = 5
                        updateColorAndSize()
                    }}></i>
                    <i className="fa-regular fa-circle" style={{fontSize: "28px"}} onClick={()=> {
                        size.current = 6
                        updateColorAndSize()
                    }}></i>
                </Row>
                <hr/>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-solid fa-arrows-left-right" onClick={() => {
                        drawClickPos.current = []
                        drawType.current = "line"

                    }}></i>
                    <i className="fa-solid fa-caret-up" onClick={() => {
                        drawClickPos.current = []
                        drawType.current = "triangle"

                    }}></i>
                    <i className="fa-solid fa-square" onClick={() => {
                        drawClickPos.current = []
                        drawType.current = "square"

                    }}></i>
                </Row>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-solid fa-rectangle-xmark" onClick={() => {
                        drawClickPos.current = []
                        drawType.current = "rectangle"
                    }}></i>
                    <i className="fa-solid fa-draw-polygon" onClick={() => {
                        drawClickPos.current = []
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

