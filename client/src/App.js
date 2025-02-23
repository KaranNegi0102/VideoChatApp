import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'peerjs';

// Use ngrok URL later; start with localhost for testing
const socket = io('https://54d2-114-142-166-238.ngrok-free.app');

function App() {
  const [roomId, setRoomId] = useState('');
  const [userId, setUserId] = useState('');
  const [peers, setPeers] = useState({});
  const [joined, setJoined] = useState(false);
  const videoRef = useRef();
  const peerInstance = useRef(null);

  useEffect(() => {
    if (!joined) return;

    const peer = new Peer({
      host: '54d2-114-142-166-238.ngrok-free.app', // Update to ngrok URL later
      port: 443,
      path: '/peerjs',
      secure: true,
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

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        console.log('Got local media stream');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => console.error('Error playing video:', err));
        }

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
      if (peerInstance.current) peerInstance.current.destroy();
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
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Video Chat App</h1>
      {!joined ? (
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter Room ID"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
          />
          <button
            onClick={joinRoom}
            className="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-300"
          >
            Join Room
          </button>
        </div>
      ) : (
        <div className="w-full max-w-4xl space-y-6">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              My Video (ID: {userId || 'Waiting for ID...'})
            </h3>
            <video
              ref={videoRef}
              muted
              className="w-full max-w-md rounded-lg border border-gray-300"
            />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Other Users in Room: {roomId}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(peers).map(([peerId, stream]) => (
                <video
                  key={peerId}
                  ref={(ref) => {
                    if (ref && !ref.srcObject) {
                      ref.srcObject = stream;
                      ref.play().catch((err) => console.error('Error playing video:', err));
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;