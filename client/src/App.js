import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'peerjs';

const socket = io('http://localhost:5000');

function App() {
  const [roomId, setRoomId] = useState('');
  const [userId, setUserId] = useState('');
  const [peers, setPeers] = useState({});
  const [joined, setJoined] = useState(false);
  const videoRef = useRef();
  const peerInstance = useRef(null);

  useEffect(() => {
    if (!joined) return;

    // Initialize PeerJS with local server
    const peer = new Peer({
      host: 'localhost',
      port: 5001,
      path: '/peerjs',
    });
    peerInstance.current = peer;

    peer.on('open', (id) => {
      console.log('PeerJS connection opened. My ID:', id);
      setUserId(id);
      socket.emit('join-room', roomId, id);
    });

    peer.on('error', (err) => {
      console.error('PeerJS error:', err);
    });

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        console.log('Got local media stream');
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        peer.on('call', (call) => {
          console.log('Receiving call from:', call.peer);
          call.answer(stream);
          call.on('stream', (remoteStream) => {
            addPeerStream(call.peer, remoteStream);
          });
          call.on('close', () => {
            removePeerStream(call.peer);
          });
        });

        socket.on('user-connected', (newUserId) => {
          if (newUserId !== userId) {
            console.log('Calling new user:', newUserId);
            const call = peer.call(newUserId, stream);
            call.on('stream', (remoteStream) => {
              addPeerStream(newUserId, remoteStream);
            });
            call.on('close', () => {
              removePeerStream(newUserId);
            });
          }
        });

        socket.on('user-disconnected', (disconnectedUserId) => {
          console.log('User disconnected:', disconnectedUserId);
          removePeerStream(disconnectedUserId);
        });
      })
      .catch((err) => console.error('Error accessing media devices:', err));

    return () => {
      console.log('Cleaning up PeerJS and Socket.IO');
      socket.disconnect();
      peer.destroy();
    };
  }, [joined, roomId]);

  const addPeerStream = (peerId, stream) => {
    setPeers((prev) => {
      if (!prev[peerId]) {
        console.log('Adding peer stream:', peerId);
        return { ...prev, [peerId]: stream };
      }
      return prev;
    });
  };

  const removePeerStream = (peerId) => {
    setPeers((prev) => {
      console.log('Removing peer stream:', peerId);
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });
  };

  const joinRoom = () => {
    if (roomId.trim()) {
      console.log('Joining room:', roomId);
      setJoined(true);
    } else {
      alert('Please enter a room ID');
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Video Chat App</h1>
      {!joined ? (
        <div>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter Room ID"
            style={{ padding: '5px', margin: '10px' }}
          />
          <button onClick={joinRoom} style={{ padding: '5px 10px' }}>
            Join Room
          </button>
        </div>
      ) : (
        <>
          <div>
            <h3>My Video (ID: {userId || 'Waiting for ID...'})</h3>
            <video ref={videoRef} muted style={{ width: '300px', border: '1px solid black' }} />
          </div>
          <div>
            <h3>Other Users in Room: {roomId}</h3>
            {Object.entries(peers).map(([peerId, stream]) => (
              <video
                key={peerId}
                ref={(ref) => {
                  if (ref && !ref.srcObject) {
                    ref.srcObject = stream;
                    ref.play().catch((err) => console.error('Error playing video:', err));
                  }
                }}
                style={{ width: '300px', border: '1px solid black', margin: '5px' }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App;