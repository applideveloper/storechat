
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , mongoose = require('mongoose')
  , socketio = require('socket.io');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

console.log('保存できるちゃっとがはじまるよ～');

//3000番ポートで待ち受け
var server = http.createServer(app);
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
//待ち受けをSocket.IOに渡す
var io = socketio.listen(server);

//storechatというコレクションを使って（始めは作って）
var db = mongoose.connect('mongodb://localhost/storechat')
//スキーマ宣言
var ChatSchema = new mongoose.Schema({
  text:{type: String}
  ,name:{type: String}
  ,ipaddress:{type: String}
});
//スキーマからモデル生成
var Chat = db.model('chat', ChatSchema);


io.sockets.on('connection',function(socket){
  //初めにチャットの全データをもらう。
  Chat.find(function(err, items){
    if(err){console.log(err);}
    //接続ユーザにDBのデータ送信
    socket.emit('init', items);
  });

  // 個々のクライアントからの通信
  socket.on('message',function(data){
    // クライアントからもらってきたデータ（名前とメッセージ）を取得
    var chat = new Chat(data);
      // クライアントのアドレスを取得する
      chat.ipaddress = socket.handshake.address.address
        + ':' + socket.handshake.address.port;
    chat.save(function(err){
      if(err){return;}
      socket.broadcast.emit('message',chat);
    });
  });

});
