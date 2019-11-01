const child_process = require('child_process');
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use((req, res, next) => {
  console.log('HTTP Request: ' + req.method + ' ' + req.originalUrl);
  return next();
});

app.use(express.static(__dirname + '/public'));

io.on('connection', (socket) => {
  console.log('connection');
  let rtmpUrl;
  if (!(rtmpUrl = socket.handshake.query.streamUrl)) {
    socket.disconnect(true);
    return;
  }
  console.log(`Target RTMP URL: rtmpUrl ${rtmpUrl}`);

  const ffmpeg = child_process.spawn('ffmpeg', [
    '-f', 'lavfi', '-i', 'anullsrc',
    '-i', '-',
    '-shortest',
    '-vcodec', 'copy',
    '-acodec', 'aac',
    '-f', 'flv',
    rtmpUrl
  ]);

  ffmpeg.on('close', (code, signal) => {
    console.log('FFmpeg child process closed, code ' + code + ', signal ' + signal);
    socket.disconnect(true);
  });

  ffmpeg.stdin.on('error', (e) => {
    console.log('FFmpeg STDIN Error', e);
  });

  ffmpeg.stderr.on('data', (data) => {
    console.log('FFmpeg STDERR:', data.toString());
  });

  socket.on('message', (msg) => {
    console.log('DATA', msg);
    ffmpeg.stdin.write(msg);
  })

  socket.on('disconnect', function() {
    ffmpeg.kill('SIGINT');
  })
});

http.listen(1337, function () {
  console.log('listening on *:3000');
});
