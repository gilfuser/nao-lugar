// Initialise DataChannel.js
const datachannel = new DataChannel();

// Set the userid based on what has been defined by DataChannel
// https://github.com/muaz-khan/WebRTC-Experiment/tree/master/DataChannel#use-custom-user-ids
datachannel.userid = window.userid;

// Open a connection to Pusher
const pusher = new Pusher('72bd0eccc241c799a018', { cluster: 'us2' });

// Storage of Pusher connection socket ID
let socketId;

Pusher.log = (message) => {
  if (window.console && window.console.log) {
    window.console.log(message);
  }
};

// Monitor Pusher connection state
pusher.connection.bind('state_change', (states) => {
  switch (states.current) {
    case 'connected':
      socketId = pusher.connection.socket_id;
      break;
    // default:
    //   socketId = pusher.connection.socket_id;
    //   break;
    case 'disconnected':
    case 'failed':
    case 'unavailable':
      break;
  }
});

// Set custom Pusher signalling channel
// https://github.com/muaz-khan/WebRTC-Experiment/blob/master/Signaling.md
datachannel.openSignalingChannel = (config) => {
  const channel = config.channel || this.channel || 'default-channel';
  let xhrErrorCount = 0;

  let socket = {
    send(message) {
      $.ajax({
        type: 'POST',
        url: '/message', // Node.js & Ruby (Sinatra)
        // url: "_servers/php/message.php", // PHP
        data: {
          socketId,
          channel,
          message,
        },
        timeout: 1000,
        success(data) {
          xhrErrorCount = 0;
        },
        error(xhr, type) {
          // Increase XHR error count
          xhrErrorCount += 1;

          // Stop sending signaller messages if it's down
          if (xhrErrorCount > 5) {
            console.log('Disabling signaller due to connection failure');
            datachannel.transmitRoomOnce = true;
          }
        },
      });
    },
    channel,
  };

  // Subscribe to Pusher signalling channel
  const pusherChannel = pusher.subscribe(channel);

  // Call callback on successful connection to Pusher signalling channel
  pusherChannel.bind('pusher:subscription_succeeded', () => {
    if (config.callback) config.callback(socket);
  });

  // Proxy Pusher signaller messages to DataChannel
  pusherChannel.bind('message', (message) => {
    config.onmessage(message);
  });

  return socket;
};

// Demo DOM elements
const channelInput = document.querySelector('.demo-chat-channel-input');
const createChannelBtn = document.querySelector('.demo-chat-create');
const joinChannelBtn = document.querySelector('.demo-chat-join');
const messageInput = document.querySelector('.demo-chat-message-input');
let sendBtn = document.querySelector('.demo-chat-send');
const messageList = document.querySelector('.demo-chat-messages');

const disableConnectInput = () => {
  channelInput.disabled = true;
  createChannelBtn.disabled = true;
  joinChannelBtn.disabled = true;
};

const onCreateChannel = () => {
  const channelName = cleanChannelName(channelInput.value);

  if (!channelName) {
    console.log('No channel name given');
    return;
  }

  disableConnectInput();

  datachannel.open(channelName);
};

const onJoinChannel = () => {
  const channelName = cleanChannelName(channelInput.value);

  if (!channelName) {
    console.log('No channel name given');
    return;
  }

  disableConnectInput();

  // Search for existing data channels
  datachannel.connect(channelName);
};

const cleanChannelName = channel => channel.replace(/(\W)+/g, '-').toLowerCase();


const addMessage = (message, userId, self) => {
  const messages = messageList.getElementsByClassName('list-group-item');

  // Check for any messages that need to be removed
  let messageCount = messages.length;
  for (let i = 0; i < messageCount; i += 1) {
    let msg = messages[i];

    if (msg.dataset.remove === 'true') {
      messageList.removeChild(msg);
    }
  };

  const newMessage = document.createElement('li');
  newMessage.classList.add('list-group-item');

  if (self) {
    newMessage.classList.add('self');
    /* eslint-disable template-curly-spacing */
    newMessage.innerHTML = `<span class='badge'>You</span><p>${ message }</p>`;
  } else {
    newMessage.innerHTML = `<span class='badge'>${ userId }</span><p>${ message }</p>`;
  }
  /* eslint-enable template-curly-spacing */

  messageList.appendChild(newMessage);
};

const onSendMessage = () => {
  let message = messageInput.value;

  if (!message) {
    console.log('No message given');
    return;
  }

  datachannel.send(message);
  addMessage(message, window.userid, true);

  messageInput.value = '';
};

const onMessageKeyDown = (event) => {
  if (event.keyCode === 13) {
    onSendMessage();
  }
};


// Set up DOM listeners
createChannelBtn.addEventListener('click', onCreateChannel);
joinChannelBtn.addEventListener('click', onJoinChannel);
sendBtn.addEventListener('click', onSendMessage);
messageInput.addEventListener('keydown', onMessageKeyDown);

// Set up DataChannel handlers
datachannel.onopen = (userId) => {
  document.querySelector('.demo-connect').classList.add('inactive');
  document.querySelector('.demo-chat').classList.remove('inactive');
  messageInput.focus();
};

datachannel.onmessage = (message, userId) => {
  addMessage(message, userId);
};
