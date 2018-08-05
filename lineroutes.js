const routes = require('express').Router();
const bodyParser = require('body-parser');
const Client = require('@line/bot-sdk').Client;
const mongoose = require('mongoose');
var jsonParser = bodyParser.json();

var LineUser = require('./models/LineUser');
var LineRoom = require('./models/LineRoom');
var UserEvent = require('./models/UserEvent');
var ReplyTemp = require('./models/ReplyTemp');

const lineconfig = {
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
};

const client = new Client(lineconfig);

routes.post('/message/push', jsonParser, (req, res) => {    
  var messages = req.body.messages;
  messages.forEach((message, i) => {
    client.pushMessage(req.body.to, message);
  });

  messages.forEach((message, i) => {    
    LineUser.findOne({line_id:req.body.to}, function(error, result) {
        if (error) return;
        if(result != null){
          var user_event = new UserEvent ({
              _id: new mongoose.Types.ObjectId(),
              direction: 'out',
              user: result._id,
              message: message,
              sender: req.consumer.consumer            
          });
          user_event.save(function(error){
              if(error){
                  console.log(error);
              }                
          });
        }
    });
  });

  res.status(200).json({ message: 'Success!' });
});

routes.post('/message/reply', jsonParser, (req, res) => {    
  var messages = req.body.messages;
  messages.forEach((message, i) => {
    client.replyMessage(req.body.replyToken, message);
  });

  ReplyTemp.findOne({reply_token:req.body.replyToken}, function(err, temp){
    if(err) console.log(err);
    messages.forEach((message, i) => {
      if(temp.type == 'user'){
        LineUser.findOne({line_id: temp.line_id}, function(error, result) {
            if (error) return;
            else {
              var user_event = new UserEvent ({
                  _id: new mongoose.Types.ObjectId(),
                  direction: 'out',
                  user: result._id,            
                  message: message,
                  sender: req.consumer.consumer            
              });
              user_event.save(function(error){
                  if(error){
                      console.log(error);
                  }                
              });
            }
        });
      }
    });
  });

  res.status(200).json({ message: 'Success!' });
});

module.exports = routes;