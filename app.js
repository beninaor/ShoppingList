//jshint esversion:6


require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const _ = require('lodash');
const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// mongoose.connect("mongodb://0.0.0.0:27017/ShoppingListDB", { useNewUrlParser: true });
mongoose.connect('mongodb+srv://BeniDB:blablabla2022@benidb.txihsun.mongodb.net/ShoppingListDB', {useNewUrlParser: true});
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);


// User Modal Schema
const userSchema = new mongoose.Schema({
  username: String,  // the email is username
  password: String,
  googleId: String,
  firstname: String,
});

// Items Modal Schema
const itemsSchema = new mongoose.Schema({
  name: String,
});

// List Modal Schema
const listSchema = new mongoose.Schema({
  username: String,
  firstname: String,
  items: [{
    type: String
  }],

});



userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// Creating model objects
const User = new mongoose.model('User', userSchema);
const Item = mongoose.model('Item', itemsSchema);
const List = mongoose.model('List', listSchema);


passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});


var userNameGlobal = "";

app.get("/", function (req, res) {
  res.render("home");
});


app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/list", function (req, res) {
  List.findOne({ username: userNameGlobal }, function (err, foundList) {
    if (err) {
      console.log(err);
    } else {
      if (foundList) {

        res.render('list', { list_items: foundList.items, listOf: foundList.firstname });
      }
    }
  });
});

app.get("/err", function (req, res) {
  res.render("err");
});

app.post("/register", function (req, res) {
  const username = req.body.username;
  const firstname = req.body.firstName;
  User.register({ username, firstName: firstname }, req.body.password, function (err, user) {
    if (err) {
      res.render("err", { err: err, page: "register" });

    } else {
      console.log("Register user Successfully");
      passport.authenticate("local")(req, res, function () {
        const initList = [{
          username: username,
          firstname: firstname,
          items: [],
        }]
        List.insertMany(initList)
          .then(value => {
            console.log("Init list for user Successfully");
          })
          .catch(error => {
            console.log(error);
          })

      });
      res.redirect("/login");
    }
  });

});


app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function (err) {
    if (err) {
      // return next(err);
      console.log(err);
      console.log(next(err));

    } else {

      passport.authenticate("local")(req, res, function () {

        List.findOne({ username: req.body.username }, function (err, foundList) {
          if (err) {

            console.log(err);
          } else {
            if (foundList) {
              userNameGlobal = foundList.username;
              res.redirect("/list");
            }
          }
        });
      });
    }
    
  });

});

app.post("/list", function (req, res) {
  List.findOne({ username: userNameGlobal }, function (err, foundList) {
    foundList.items.push(req.body.newItem);
    foundList.save();
    res.redirect("/list");
  })
})





app.post("/delete", function (req, res) {

  console.log("req.body.list_updated = " + req.body.list_updated.length);
  var newArrayItems = [];
  if (req.body.list_updated.length > 0) {
    newArrayItems = req.body.list_updated.split(',');
  }

  List.findOneAndUpdate({ username: userNameGlobal }, { items: newArrayItems }, function (err, foundList) {
    if (err) {
      console.log(err)
    }
    else {
      console.log("Update items  Successfully");
      res.redirect("/list");
    }
  });
});


app.get("/logout", (req, res) => {
  req.logout(req.user, err => {
    if (err) return next(err);
    userNameGlobal = "";
    res.redirect("/");
  });
});


app.post("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) { return next(err); }
    userNameGlobal = "";
    res.redirect('/');
  });
});



app.listen(3000, function () {
  console.log("Server started on port 3000.");
});
