import {Button, Col, Modal, Popover, Row} from "antd";
import "./App.css"
import {createRef, useEffect, useRef, useState} from "react";
import Calculator from "./calc/Calculator";

// TODO responsive
// TODO pause
// TODO record

export default function App() {

    const [brushColor, setBrushColor] = useState("#000000");
    const [originalColor, setOriginalColor] = useState("#000000");
    const [brushSize, setBrushSize] = useState(2);
    const [isPen, setPen] = useState(true);
    const [time, setTime] = useState(0);
    const [running, setRunning] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [isClicked, setClicked] = useState(false)
    const [inputFile, setInputFile] = useState(null)
    const [panAndZoom, setPanAndZoom] = useState(false);

    let inputFileRef = useRef(null);
    let mediaRecorder = useRef(null)
    let videoSource = useRef("")
    let write = useRef([])
    let clickPos = useRef([]);
    let isText = useRef(false);
    let text = useRef("")
    let ctx = useRef(null);
    let isEraser = useRef(false);
    let drawType = useRef("none");

    let canvas = createRef()

    useEffect(() => {
        ctx.current = canvas.current.getContext("2d");
    }, [canvas])

    useEffect(() => {
        ctx.current.fillStyle = "#fff"
        ctx.current.fillRect(0, 0, 2000, 2000);

        document.addEventListener("mousedown", () => {
            setClicked(true)

        })
        document.addEventListener("mouseup", () => {
            setClicked(false)
        })

    }, [])

    useEffect(() => {
        console.log(inputFile)
        if (!inputFile) {
            return
        }
        let reader  = new FileReader();
        reader.onload = function(e)  {
            const img = new Image();
            img.src = e.target.result;
            ctx.current.drawImage(img, 0, 0);
        }
        reader.readAsDataURL(inputFile);

    }, [inputFile])
    useEffect(() => {
        document.addEventListener("click", (e) => {

            if (!isText.current && write.current.length > 0) {
                isText.current = false
                write.current = []
            }
        })
    }, [isText])

    useEffect(() => {
        document.addEventListener('keyup', (e) => {
            if(!isText.current && e.key === 'z' && e.ctrlKey) {
                console.log()
            }
            if (write.current.length > 0) {
                if (e.key === "Enter") {
                     write.current = []
                }
                else {
                    text.current += e.key
                    let posx = write.current[0]
                    let posy = write.current[1]
                    ctx.current.fillStyle = brushColor
                    ctx.current.font = "30px Arial";
                    ctx.current.fillText(text.current.substring(0, text.current.includes('£') ? text.current.indexOf("£") : text.current.length), posx, posy);
                    isText.current = false
                }
            }

        });
    }, [brushColor, isText])

    useEffect(() => {

        let interval;
        if (running) {
            interval = setInterval(() => {
                setTime((prevTime) => prevTime + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [running]);

    const canvasWidth = window.innerWidth * 0.7;
    const canvasHeight = window.innerHeight * 0.65;

    function setColor(color, isMarker) {
        // coerce values so ti is between 0 and 1.
        if (isMarker === false || (isMarker == null && isPen)) {
            return color;
        }
        let _opacity = Math.round(Math.min(Math.max(0.2 || 1, 0), 1) * 255);
        return color + _opacity.toString(16).toUpperCase();
    }

    async function createStream() {

        URL.revokeObjectURL(videoSource.current); // clear from memory

        return await navigator.mediaDevices.getUserMedia({
            audio: true, video: false }).then(async (e) =>
            new MediaStream([ ...canvas.current.captureStream(200).getTracks(), ...e.getTracks()]))
    }

    function startRecording(combined) {
        setTime(0)
        setRunning(true)

        let recordedChunks = [];

        let mediaRecorder = new MediaRecorder(combined);

        mediaRecorder.ondataavailable = function (e) {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };
        mediaRecorder.onstop = function () {
            saveFile(recordedChunks);
            recordedChunks = [];
        };
        mediaRecorder.start(200); // For every 200ms the stream data will be stored in a separate chunk.
        return mediaRecorder
    }


    function saveFile(recordedChunks){

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
        setRunning(false);
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
                                if (isText.current || !isClicked) {
                                    return
                                }
                                let rect = e.target.getBoundingClientRect();
                                let posx = e.clientX - rect.left;
                                let posy = e.clientY - rect.top;

                                if (isEraser.current) {
                                    setBrushColor(setColor("#ffffff", false))
                                }
                                ctx.current.strokeStyle = brushColor;
                                ctx.current.beginPath();

                                ctx.current.lineWidth = brushSize * 3.75;
                                ctx.current.lineCap = 'round';


                                // The cursor to start drawing
                                // moves to this coordinate
                                ctx.current.moveTo(posx, posy);
                                ctx.current.lineTo(posx , posy);

                                // Draws the line.
                                ctx.current.stroke();

                            }
                        }
                    onClick={ (e) => {
                        if (drawType.current !== "none") {
                            let rect = e.target.getBoundingClientRect();
                            clickPos.current.push(...[e.clientX - rect.left, e.clientY - rect.top])
                        }

                        if (drawType.current === "line" && clickPos.current.length === 4) {
                            ctx.strokeStyle = brushColor
                            ctx.current.lineWidth = brushSize * 3.75;
                            ctx.current.beginPath();
                            ctx.current.moveTo(clickPos.current[0], clickPos.current[1]);
                            ctx.current.lineTo(clickPos.current[2], clickPos.current[3]);
                            ctx.current.stroke();
                            drawType.current = "none"
                        }

                        if (drawType.current === "square" && clickPos.current.length === 6) {
                            ctx.current.fillStyle = brushColor
                            let top = clickPos.current[1]
                            let left = clickPos.current[0];
                            let tm = top;
                            let lm = left
                            for (let i = 1; i < 3; i++) {
                                top = Math.min(top, clickPos.current[i * 2 + 1])
                                tm = Math.max(top, clickPos.current[i * 2 + 1])
                                left = Math.min(left, clickPos.current[i * 2])
                                lm = Math.max(lm, clickPos.current[i * 2])
                            }
                            ctx.current.fillRect(left, top, lm - left, tm - top);
                            drawType.current = "none"
                        }

                        if (drawType.current === "rectangle" && clickPos.current.length === 4) {
                            ctx.current.fillStyle = brushColor
                            let top = clickPos.current[1]
                            let left = clickPos.current[0];
                            let tm = top;
                            let lm = left
                            for (let i = 1; i < 2; i++) {
                                top = Math.min(top, clickPos.current[i * 2 + 1])
                                tm = Math.max(top, clickPos.current[i * 2 + 1])
                                left = Math.min(left, clickPos.current[i * 2])
                                lm = Math.max(lm, clickPos.current[i * 2])
                            }
                            ctx.current.fillRect(left, top, lm - left, tm - top);
                            drawType.current = "none"
                        }

                        if (drawType.current === "triangle" && clickPos.current.length === 6) {
                            ctx.current.fillStyle = brushColor
                            ctx.current.beginPath();
                            ctx.current.moveTo(clickPos.current[0], clickPos.current[1])
                            for (let i = 1; i < 3; i++) {
                                ctx.current.lineTo(clickPos.current[i * 2], clickPos.current[i * 2 + 1]);
                            }
                            ctx.current.closePath();
                            ctx.current.fill();
                            drawType.current = "none"
                        }

                        if (drawType.current === "polygon") {
                            ctx.current.fillStyle = brushColor
                            ctx.current.strokeStyle = brushColor
                            ctx.current.lineWidth = brushSize * 3.75;
                            ctx.current.lineCap = 'round';



                            if (clickPos.current.length === 2) {

                                ctx.current.moveTo(clickPos.current[clickPos.current.length - 2], clickPos.current[clickPos.current.length - 1]);
                                ctx.current.lineTo(clickPos.current[clickPos.current.length - 2], clickPos.current[clickPos.current.length - 1]);

                                ctx.current.stroke();
                                ctx.current.beginPath();
                                ctx.current.moveTo(clickPos.current[0], clickPos.current[1])
                            }
                            else {
                                ctx.current.lineTo(clickPos.current[clickPos.current.length - 2], clickPos.current[clickPos.current.length - 1])
                                if (Math.pow(clickPos.current[0] - clickPos.current[clickPos.current.length - 2], 2) +
                                    Math.pow(clickPos.current[1] - clickPos.current[clickPos.current.length - 1], 2) < 100) {
                                    ctx.current.closePath();
                                    ctx.current.fill();
                                    drawType.current = "none"
                                }
                            }

                        }



                        if (isText.current) {
                            let rect = e.target.getBoundingClientRect();
                            let posx = e.clientX - rect.left;
                            let posy = e.clientY - rect.top;
                            write.current = [posx, posy]
                        }

                        }
                    }/>
                {/*     imgSrc={inputFile != null ? URL.createObjectURL(inputFile) : ""*/}
                </Row>
                <Row>
                    <Col style={{marginRight: "25%"}}>
                        <i className="fa-solid fa-circle-dot" onClick={async () => {
                            mediaRecorder.current = await startRecording(await createStream());
                        }}></i>
                        <label style={{marginRight: "15px"}}>Başlat</label>
                        <i className="fa-solid fa-square" onClick={() => {
                            setRunning(false)
                            mediaRecorder.current.stop();
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
                        isText.current = false
                        setPen(true)
                        setBrushSize(2)
                        setBrushColor(setColor(originalColor, false))
                        setPanAndZoom(false)
                        isEraser.current = false;
                    }}></i>
                    <i className="fa-solid fa-marker" onClick={() => {
                        isText.current = false
                        setPen(false)
                        setBrushSize(10)
                        setBrushColor(setColor(originalColor, true))
                        setPanAndZoom(false)
                        isEraser.current = false;
                    }}></i>
                    <i className="fa-solid fa-eraser" onClick={() => isEraser.current = true}></i>
                </Row>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-solid fa-trash" onClick={() => {
                        ctx.current.fillStyle = "#fff"
                        ctx.current.fillRect(0, 0, 2000, 2000);
                    }}></i>
                    <i className="fa-solid fa-rotate-right"  onClick={() => console.log()}></i>
                    <i className="fa-solid fa-arrow-pointer" onClick={() => console.log()}></i>
                </Row>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-solid fa-copy"></i>
                    <i className="fa-solid fa-image" onClick={() => inputFileRef.current.click()}><input type='file' ref={inputFileRef} onChange={(e) => setInputFile(e.target.files[0])} style={{display: 'none'}}/></i>
                    <i className="fa-solid fa-a" onClick={() => {
                        isText.current = true
                        text.current = ""
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
                        setBrushColor(setColor("#000000"))
                        setOriginalColor("#000000")
                    }}></i>
                    <i className="fa-regular fa-square" style={{backgroundColor: "blue", borderRadius: "3px"}} onClick={() => {
                        setBrushColor(setColor("#0000FF"))
                        setOriginalColor("#0000FF")
                    }}></i>
                    <i className="fa-regular fa-square" style={{backgroundColor: "green", borderRadius: "3px"}} onClick={() => {
                        setBrushColor(setColor("#00FF00"))
                        setOriginalColor("#00FF00")
                    }}></i>
                </Row>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-regular fa-square" style={{backgroundColor: "yellow", borderRadius: "3px"}} onClick={() => {
                        setBrushColor(setColor("#FFFF00"))
                        setOriginalColor("#FFFF00")
                    }}></i>
                    <i className="fa-regular fa-square" style={{backgroundColor: "orange", borderRadius: "3px"}} onClick={() => {
                        setBrushColor(setColor("#FFA500"))
                        setOriginalColor("#FFA500")
                    }}></i>
                    <i className="fa-regular fa-square" style={{backgroundColor: "red", borderRadius: "3px"}} onClick={() => {
                        setBrushColor(setColor("#FF0000"))
                        setOriginalColor("#FF0000")
                    }}></i>
                </Row>
                <hr/>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-regular fa-circle" style={{fontSize: "8px"}} onClick={()=> setBrushSize(isPen ? 1 : 3)}></i>
                    <i className="fa-regular fa-circle" style={{fontSize: "12px"}} onClick={()=> setBrushSize(isPen ? 1.5 : 5)}></i>
                    <i className="fa-regular fa-circle" style={{fontSize: "16px"}} onClick={()=> setBrushSize(isPen ? 2 : 7)}></i>
                </Row>
                <Row align={"middle"} justify={"center"}>
                    <i className="fa-regular fa-circle" style={{fontSize: "20px"}} onClick={()=> setBrushSize(isPen ? 2.3 : 10)}></i>
                    <i className="fa-regular fa-circle" style={{fontSize: "24px"}} onClick={()=> setBrushSize(isPen ? 2.6 : 13)}></i>
                    <i className="fa-regular fa-circle" style={{fontSize: "28px"}} onClick={()=> setBrushSize(isPen ? 3 : 15)}></i>
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

