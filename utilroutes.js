const routes = require('express').Router();
var LineUser = require('./models/LineUser');
var LineRoom = require('./models/LineRoom');
const Client = require('@line/bot-sdk').Client;

const lineconfig = {
    channelSecret: process.env.CHANNEL_SECRET,
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
};

const client = new Client(lineconfig);

routes.get('/users/all', (req, res) => {
    LineUser.find().lean().exec(function (err, users) {
        return res.end(JSON.stringify(users));
    });
});

routes.get('/users/update', (req, res) => {
    LineUser.find({}, function (err, docs) {
        docs.forEach((user, i) => {
            client.getProfile(user.line_id).then((profile) => {                
                var query   = { line_id: user.line_id }; 
                var update  = { 
                    name: profile.displayName,
                    picture: ((profile.pictureUrl == null) ? process.env.DEFAULT_PICTURE : profile.pictureUrl),
                    status_message: profile.statusMessage
                }; 
                var options = { new: true }; 
                LineUser.findOneAndUpdate(query, update, options, function(err, doc){ 
                    if(err) console.log(err);
                });
            });
        });
        res.json({status: "Update success"});
    });    
});

routes.get('/rooms/all', (req, res) => {
    LineRoom.find().lean().exec(function (err, rooms) {
        return res.end(JSON.stringify(rooms));
    });
});

routes.get('/rooms/:groupId/member/:userId', (req, res) => {
    client.getGroupMemberProfile(req.params.groupId, req.params.userId).then((profile) => {
        console.log(profile);
    });
    res.json({});
});

module.exports = routes;