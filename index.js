const express = require('express');
var request = require("request");
const jwt = require('jsonwebtoken');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const BearerStrategy = require('passport-http-bearer').Strategy;
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const line = require('@line/bot-sdk');
const Client = require('@line/bot-sdk').Client;
require('dotenv').config();

const lineroutes = require('./lineroutes');
const utilroutes = require('./utilroutes');

var Backend = require('./models/Backend');
var LineUser = require('./models/LineUser');
var LineRoom = require('./models/LineRoom');
var UserEvent = require('./models/UserEvent');
var ReplyTemp = require('./models/ReplyTemp');
var pkginfo = require('pkginfo')(module);
var secret = process.env.JWT_SECRET;
var jsonParser = bodyParser.json();

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://'+process.env.DB_HOST+':'+process.env.DB_PORT+'/'+process.env.DB_NAME, {
    useMongoClient: true,
})
.then(() =>  console.log('Connection Succesful'))
.catch((err) => console.error(err));

const app = express();
const port = process.env.PORT || 8010;
app.listen(port , () => console.log('Line Gateway listening on port ' + port));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({    
        usernameField: 'consumer',        
        session: false
    },
    function(consumer, password, done) {
        Backend.findOne({
          consumer: consumer 
        }, function(err, consumer) {
            if (err) {
                return done(err);
            }
            if (!consumer) {
                return done(null, false);
            }        
            consumer.comparePassword(password, function(err, isMatch) {
                if (err) throw err;                
                if(isMatch) return done(null, consumer);                
                else return done(null, false);
            });          
        });
    }
));

passport.use(new BearerStrategy(function (token, cb) {
    jwt.verify(token, secret, function(err, decoded) {
      if (err) return cb(err);      
      Backend.findById(decoded.id, function(err, user) {
        cb(err, user);
      });      
    });
}));

const lineconfig = {
    channelSecret: process.env.CHANNEL_SECRET,
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
};

const client = new Client(lineconfig);

app.get('/', (req, res) => {
    String.prototype.toHHMMSS = function () {
        var sec_num = parseInt(this, 10); // don't forget the second param
        var hours   = Math.floor(sec_num / 3600);
        var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds = sec_num - (hours * 3600) - (minutes * 60);
    
        if (hours   < 10) {hours   = "0"+hours;}
        if (minutes < 10) {minutes = "0"+minutes;}
        if (seconds < 10) {seconds = "0"+seconds;}
        var time    = hours+':'+minutes+':'+seconds;
        return time;
    }
    var time = process.uptime();
    var uptime = (time + "").toHHMMSS();
    res.json({
        "name":module.exports.name, 
        "version":module.exports.version,
        "uptime": uptime
    });
});

app.post('/api/webhook', line.middleware(lineconfig), (req, res) => {    
    const event = req.body.events[0];    
    console.log(JSON.stringify(req.body, undefined, 2));
    var line_id = "";
    if (event.source.type === 'user'){
        line_id = event.source.userId;
        var query = {line_id:event.source.userId},
            update = { expire: new Date() },
            options = { upsert: true, new: true, setDefaultsOnInsert: true };
        LineUser.findOneAndUpdate(query, update, options, function(error, result) {
            if (error) return;
            var user_event = new UserEvent ({
                _id: new mongoose.Types.ObjectId(),
                direction: 'in',
                user: result._id,
                type: event.type,
                message: event.message
            });
            user_event.save(function(error){
                if(error){
                    console.log(error);
                }                
            });
        });
    }
    else {
        if (event.source.type === 'room') {
            line_id = event.source.roomId;
            var query = {
                line_id:event.source.roomId,
                type: 'room'
            };
        }
        else if (event.source.type === 'group') {
            line_id = event.source.groupId;
            var query = {
                line_id:event.source.groupId,
                type: 'group'
            };
        }
        var update = { expire: new Date() },
            options = { upsert: true, new: true, setDefaultsOnInsert: true };
        LineRoom.findOneAndUpdate(query, update, options, function(error, result) {
            if (error) return;
        });
    }

    var reply_temp = new ReplyTemp({
        line_id: line_id,
        reply_token: event.replyToken,
        type: event.source.type
    });

    reply_temp.save(function(error){
        if(error){
            console.log(error);
        }                
    });

    var hook_options = { 
        method: 'POST',
        url: process.env.CORE_WEBHOOK,
        headers: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/json' 
        },
        body: req.body,
        json: true 
    };

    request(hook_options, function (error, response, body) {
        if (error) throw new Error(error);
    });
    
    res.json({});
});

app.post('/login', jsonParser, function(req, res, next) {
    passport.authenticate('local', function(err, consumer, info) {
      if (err) return next(err);
      if (!consumer) {
        return res.status(401).json({ status: 'error', code: 'unauthorized' });
      } else {
        return res.json({ token: jwt.sign({id: consumer.id}, secret) });
      }
    })(req, res, next);
});

app.post('/consumer', jsonParser, function (req, res) {
    if((!req.body.consumer)||(!req.body.password)){
        res.send("Missing Field");
    }
    else{    
        Backend.findOne({ 'consumer': req.body.consumer }).count(function(error, nbDocs) {
            if(nbDocs>0){
                res.send("Consumer Exist"); 
            }
            else {
                Backend.create({consumer: req.body.consumer, password: req.body.password}, function (err, post) {
                    if (err) console.log(err);
                    res.send("Consumer Created");
                });
            }
        });
    }
});

app.use('/util', utilroutes);

app.all(['/v2/*'], function(req, res, next) {
    passport.authenticate('bearer', function(err, consumer, info) {
        if (err) return next(err);
        if (consumer) {
            req.consumer = consumer;
            return next();
        } else {
            return res.status(401).json({ status: 'error', code: 'unauthorized' });
        }
    })(req, res, next);
});

app.use('/v2/bot', lineroutes);

app.use(function(err, req, res, next) {
    console.error(err);
    return res.status(500).json({ status: 'error', code: 'unauthorized' });
});