import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const VideoChat = () => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const [callStarted, setCallStarted] = useState(false);
  const [users, setUsers] = useState([]); // State for connected users

  const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };

  useEffect(() => {
    peerConnectionRef.current = new RTCPeerConnection(configuration);

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach((track) =>
          peerConnectionRef.current.addTrack(track, stream)
        );
      })
      .catch((error) => console.error('Error accessing media devices:', error));

    peerConnectionRef.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', event.candidate);
      }
    };

    // Socket.io event listeners
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-list', (userList) => {
      console.log('Connected users:', userList);
      setUsers(userList); // Update user list
    });

    return () => {
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('user-list');
      peerConnectionRef.current.close();
    };
  }, []);

  const startCall = async () => {
    const offer = await peerConnectionRef.current.createOffer();
    await peerConnectionRef.current.setLocalDescription(offer);
    socket.emit('offer', offer);
    setCallStarted(true);
  };

  const handleOffer = async (offer) => {
    await peerConnectionRef.current.setRemoteDescription(
      new RTCSessionDescription(offer)
    );
    const answer = await peerConnectionRef.current.createAnswer();
    await peerConnectionRef.current.setLocalDescription(answer);
    socket.emit('answer', answer);
  };

  const handleAnswer = async (answer) => {
    await peerConnectionRef.current.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  };

  const handleIceCandidate = (candidate) => {
    peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
  };

  return (
    <div style={{ display: 'flex' }}>
      {/* Sidebar for connected users */}
      <div style={{
        width: '200px',
        backgroundColor: '#f4f4f4',
        padding: '10px',
        height: '100vh',
        overflowY: 'auto',
        borderRight: '1px solid #ccc'
      }}>
        <h3>Connected Users</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {users.map((userId) => (
            <li key={userId} style={{ margin: '5px 0' }}>
              User {userId.slice(0, 8)} {/* Shorten ID for readability */}
            </li>
          ))}
        </ul>
      </div>

      {/* Video chat area */}
      <div style={{ flex: 1, padding: '20px' }}>
        <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '300px' }} />
        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '300px' }} />
        <br />
        <button onClick={startCall} disabled={callStarted}>
          Start Call
        </button>
      </div>
    </div>
  );
};

export default VideoChat;