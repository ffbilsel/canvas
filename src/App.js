import CanvasDraw from "react-canvas-draw";
import {Button, Col, Modal, Popover, Row} from "antd";
import "./App.css"
import {useEffect, useRef, useState} from "react";
import Calculator from "./calc/Calculator";

// TODO responsive

function App() {
    let canvas = useRef(null);

    const [brushColor, setBrushColor] = useState("#000000");
    const [originalColor, setOriginalColor] = useState("#000000");
    const [brushSize, setBrushSize] = useState(2);
    const [panAndZoom, setPanAndZoom] = useState(false);
    const [isPen, setPen] = useState(true);
    const [time, setTime] = useState(0);
    const [running, setRunning] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    let mediaRecorder = useRef(null)
    let videoSource = useRef("")

    useEffect(() => {
        let interval;
        if (running) {
            interval = setInterval(() => {
                setTime((prevTime) => prevTime + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [running]);

    const keydownHandler = (e) => {
        if(e.key === 'z' && e.ctrlKey) {
            canvas.current.undo();
        }
    };
    useEffect(() => {
        document.addEventListener('keydown', (e) => {
            keydownHandler(e);
        });
    }, []);

    let inputFileRef = useRef(null);
    const [inputFile, setInputFile] = useState(null)
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

        return await navigator.mediaDevices.getDisplayMedia({
            video: {
                mediaSource: 'screen',
            },
            audio: false,
        })
            .then(async (e) => {

                // For recording the mic audio
                let audio = await navigator.mediaDevices.getUserMedia({
                    audio: true, video: false })


                return new MediaStream(
                    [...e.getTracks(), ...audio.getTracks()]);
            })

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
        URL.revokeObjectURL(blob); // clear from memory
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
                <Modal open={isModalOpen} onOk={() => setIsModalOpen(false)} onCancel={() => setIsModalOpen(false)} width={850}
                       footer={[<Button type={"primary"} onClick={() => setIsModalOpen(false)}>OK</Button>]} >
                    <Row justify={"center"} align={"middle"}>
                        <video src={videoSource.current} controls style={{width: "720px", height: "100%"}}></video>
                    </Row>
                </Modal>
                <Row className={"up"} style={{marginBottom: "2%"}}>
                    <CanvasDraw ref={canvasDraw => (canvas.current = canvasDraw)} brushRadius={brushSize} brushColor={brushColor}
                                canvasWidth={canvasWidth} canvasHeight={canvasHeight} imgSrc={inputFile != null ? URL.createObjectURL(inputFile) : ""}
                    enablePanAndZoom={panAndZoom}/>
                </Row>
                <Row>
                    <Col style={{marginRight: "25%"}}>
                        <i className="fa-solid fa-circle-dot" onClick={async () => {
                            mediaRecorder.current = await startRecording(await createStream());
                            console.log(mediaRecorder)
                        }}></i>
                        <label style={{marginRight: "15px"}}>Başlat</label>
                        <i className="fa-solid fa-square" onClick={() => {
                            setRunning(false)
                            mediaRecorder.current.stop();
                        }}></i>
                        <label style={{marginRight: "15px"}}>Durdur</label>
                        <i className="fa-solid fa-clapperboard" onClick={() => {
                            setIsModalOpen(true)
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
                <Row>
                    <i className="fa-solid fa-pen" onClick={() => {
                        setPen(true)
                        setBrushSize(2)
                        setBrushColor(setColor(originalColor, false))
                        setPanAndZoom(false)
                    }}></i>
                    <i className="fa-solid fa-marker" onClick={() => {
                        setPen(false)
                        setBrushSize(10)
                        setBrushColor(setColor(brushColor, true))
                        setPanAndZoom(false)
                    }}></i>
                    <i className="fa-solid fa-eraser" onClick={() => canvas.current.undo()}></i>
                </Row>
                <Row>
                    <i className="fa-solid fa-trash" onClick={() => canvas.current.eraseAll()}></i>
                    <i className="fa-solid fa-rotate-right"  onClick={() => canvas.current.undo()}></i>
                    <i className="fa-solid fa-arrow-pointer" onClick={() => setPanAndZoom(true)}></i>
                </Row>
                <Row>
                    <i className="fa-solid fa-copy"></i>
                    <i className="fa-solid fa-image" onClick={() => inputFileRef.current.click()}><input type='file' ref={inputFileRef} onChange={(e) => setInputFile(e.target.files[0])} style={{display: 'none'}}/></i>
                    <i className="fa-solid fa-a"></i>

                </Row>
                <Row>
                    <Popover content={<Calculator/>} placement={"leftBottom"} trigger="click">
                        <i className="fa-solid fa-calculator" ></i>
                    </Popover>
                    <i className="fa-solid fa-circle-info"></i>
                </Row>
                <Row>
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
                <Row>
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
                <Row align={"middle"}>
                    <i className="fa-regular fa-circle" style={{fontSize: "8px"}} onClick={()=> setBrushSize(isPen ? 1 : 3)}></i>
                    <i className="fa-regular fa-circle" style={{fontSize: "12px"}} onClick={()=> setBrushSize(isPen ? 1.5 : 5)}></i>
                    <i className="fa-regular fa-circle" style={{fontSize: "16px"}} onClick={()=> setBrushSize(isPen ? 2 : 7)}></i>
                </Row>
                <Row align={"middle"}>
                    <i className="fa-regular fa-circle" style={{fontSize: "20px"}} onClick={()=> setBrushSize(isPen ? 2.3 : 10)}></i>
                    <i className="fa-regular fa-circle" style={{fontSize: "24px"}} onClick={()=> setBrushSize(isPen ? 2.6 : 13)}></i>
                    <i className="fa-regular fa-circle" style={{fontSize: "28px"}} onClick={()=> setBrushSize(isPen ? 3 : 15)}></i>
                </Row>
            </Col>

        </Row>
    </div>
  );
}

export default App;
