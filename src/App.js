import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io(`/webRTCPeers`, { path: `/webrtc` });

function App() {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const pc = useRef(new RTCPeerConnection(null));
  const textRef = useRef();
  const candidates = useRef([]);
  const [offerVisible, setOfferVisible] = useState(true);
  const [answerVisible, setanswerVisible] = useState(false);
  const [status, setstatus] = useState("Make a call Now");

  useEffect(() => {
    socket.on("connection-success", (success) => {
      console.log("connection-success", success);
    });

    socket.on("sdp", (data) => {
      console.log("data", data);
      pc.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      textRef.current.value = JSON.stringify(data.sdp);

      if (data.sdp.type == "offer") {
        setOfferVisible(false);
        setanswerVisible(true);
        setstatus("Incoming call...");
      } else {
        setstatus("Call Established...");
      }
    });

    socket.on("candidate", (candidate) => {
      console.log("🚀 ~ socket.on ~ candidate", candidate);
      candidates.current = [...candidates.current, candidate];
      pc.current.addIceCandidate(new RTCIceCandidate(candidate));
    });

    const constrains = {
      audio: true,
      video: true,
    };

    navigator.mediaDevices
      .getUserMedia(constrains)
      .then((stream) => {
        // display stream
        localVideoRef.current.srcObject = stream;

        stream.getTracks().forEach((track) => {
          _pc.addTrack(track, stream);
        });
      })
      .catch((e) => console.log("getUserMedia error", e));

    const _pc = new RTCPeerConnection(null);

    _pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log(JSON.stringify(e.candidate));
        // socket.emit("candidate", e.candidate);
        sendToPeer("candidate", e.candidate);
      }
    };

    _pc.oniceconnectionstatechange = (e) => {
      console.log("E", e);
    };

    _pc.ontrack = (e) => {
      //here we got remote stream
      remoteVideoRef.current.srcObject = e.streams[0];
    };

    pc.current = _pc;
  }, [navigator]);

  const sendToPeer = (eventType, payload) => {
    // send SDP to server
    // socket.emit("sdp", {
    //   sdp,
    // });
    socket.emit(eventType, payload);
  };

  const processSDP = (sdp) => {
    console.log("sdp", JSON.stringify(sdp));
    pc.current.setLocalDescription(sdp);

    sendToPeer("sdp", { sdp });
  };

  const createOffer = () => {
    pc.current
      .createOffer({ offerToReceiveAudio: 1, offerToReceiveVideo: 1 })
      .then((sdp) => {
        // send SDP to server by calling belowed method
        processSDP(sdp);
        setOfferVisible(false);
        setstatus("Calling....");
      })
      .catch((e) => console.log("error", e));
  };

  const createAnswer = () => {
    pc.current
      .createAnswer({ offerToReceiveAudio: 1, offerToReceiveVideo: 1 })
      .then((sdp) => {
        // send the answer sdp to offering peer
        processSDP(sdp);
        setanswerVisible(false);
        setstatus("Call Established...");
      })
      .catch((e) => console.log("error", e));
  };

  // const setRemoteDiscription = () => {
  //   console.log("🚀 ~ setRemoteDiscription ~ calling...");
  //   // get the SDP value from text editor
  //   const sdp = JSON.parse(textRef.current.value);
  //   console.log("🚀 ~ setRemoteDiscription ~ sdp", sdp);

  //   pc.current.setRemoteDescription(new RTCSessionDescription(sdp));
  // };

  // const addCandidate = () => {
  //   // console.log("🚀 ~ addCandidate ~ calling...");
  //   // const candidate = JSON.parse(textRef.current.value);
  //   // console.log("🚀 ~ addCandidate ~ candidate", candidate);

  //   candidates.current.forEach((candidate) => {
  //     pc.current.addIceCandidate(new RTCIceCandidate(candidate));
  //   });
  // };

  const showHideButtons = () => {
    if (offerVisible) {
      return (
        <div>
          <button onClick={createOffer}>Call</button>
        </div>
      );
    } else if (answerVisible) {
      return (
        <div>
          <button onClick={createAnswer}>Answer</button>
        </div>
      );
    }
  };
  return (
    <div style={{ margin: 10 }}>
      <video
        style={{
          width: "45%",
          height: "70%",
          margin: 5,
          backgroundColor: "black",
        }}
        ref={localVideoRef}
        autoPlay
      ></video>
      <video
        style={{
          width: "45%",
          height: "70%",
          margin: 5,
          backgroundColor: "black",
        }}
        ref={remoteVideoRef}
        autoPlay
      ></video>
      <br />
      {/* <button onClick={createOffer}>Create Offer</button>
      <button onClick={createAnswer}>Create Answer</button> */}
      {showHideButtons()}
      <div>{status}</div>
      <br />
      <textarea ref={textRef} style={{ display: "none" }}></textarea>
      <br />
      {/* <button onClick={() => setRemoteDiscription()}>
        Set Remote Description
      </button>
      <button onClick={() => addCandidate()}>Add Candidates</button> */}
    </div>
  );
}

export default App;
