var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
  const isLoggedUser = req.cookies.user
    ? JSON.parse(req.cookies.user).ime.trim()
    : false;
  const userRole = req.cookies.user
    ? JSON.parse(req.cookies.user).uloga
      ? JSON.parse(req.cookies.user).uloga.trim()
      : 'Kupac'
    : false;

  const restaurantName = req.cookies.user
    ? JSON.parse(req.cookies.user).restoran
    : 'undefined';

  res.render('index', {
    title: 'Dobro došli',
    nazivRestorana: restaurantName,
    logged: isLoggedUser,
    role: userRole,
  });
});
var encrypt = require('../connection/enkripcija');
module.exports = {
  provjera: function (req, res, next) {
    var { id, ime, uloga, email, restoran, restoranId } = JSON.parse(
        req.cookies['user']
    );
    console.log(id, ime, uloga, email, restoran, restoranId);
    if (!id) {
      res.redirect('/users/login');
    } else {
      try {
        req.user_id = encrypt.decrypt(id);
        req.userEmail = email;
        req.userName = ime;
        req.role = uloga;
        req.restoran = restoran;
        req.restoranId = restoranId;
        if (req.originalUrl.includes('/customer') && req.role === 'Kupac') {
          // da li je kupac
          return next();
        } else if (
            req.originalUrl.includes('/delivery') &&
            req.role === 'Dostavljac'
        ) {
          return next();
        } else if (req.originalUrl.includes('/adm') && req.role === 'Admin') {
          return next();
        } else if (
            req.restoran !== req.params.restoranNaziv &&
            req.role !== 'Admin Restorana'
        )
          return res.render('error', {
            message: 'Nemate potrebnu autoritizaciju.',
            error: { status: 401 },
          });
        return next();
      } catch (error) {
        console.log(error);
        res.redirect('/users/login');
      }
    }
  },
  checkAdmin: function (req, res, next) {
    if (req.role !== 'Admin')
      res.render('error', {
        message: 'Nemate potrebnu autoritizaciju.',
        error: { status: 401 },
      });
    else {
      return next();
    }
  },
};


module.exports = router;
