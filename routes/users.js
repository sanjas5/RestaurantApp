var express = require('express');
var url = require('url');
var router = express.Router();

var pg = require('pg');
var conn = require('../connection/connection');
var pool = new pg.Pool(conn);

var enkripcija = require('../connection/enkripcija');
const checkLoggedUser = require('../middleware/checkLoggedUser');

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

router.get('/login', function (req, res, next) {
  const { error } = req.query || '';
  res.render('login', { errorMessage: error });
});

router.post('/login', function (req, res, next) {
  console.log(req.body);

  pool.query(
    'select * from korisnik where email = $1 and pwd = $2',
    [req.body.email, enkripcija.encrypt(req.body.pwd)],
    (err, resp) => {
      if (err) {
        console.log(err);
        return res.redirect('/users/login');
      }
      if (!resp.rows[0]) {
        res.redirect(
          url.format({
            pathname: '/users/login',
            query: {
              error: true,
            },
          })
        );
      } else {
        pool.query(
          `select ko.id, res.naziv nazivRestorana, ime, prezime, tip as uloga, res.id as restoranid
          from korisnik_uloga_korisnika_restoran ur 
            join korisnik ko on ko.id = ur.id_korisnika
            join uloga_korisnika uk on uk.id = id_uloga_korisnika 
            left join restoran res on ko.id = res.administrator_restorana_id
          where email = $1`,
          [req.body.email],
          (err, response) => {
            if (err) {
              console.error(err);
              next(err);
            } else {
              if (response.rows.length >= 1) {
                const { ime, uloga, email, nazivrestorana, restoranid } =
                  response.rows[0];
                res.cookie(
                  'user',
                  JSON.stringify({
                    id: enkripcija.encrypt(String(response.rows[0].id)),
                    ime: ime ? ime.trim() : '',
                    uloga: uloga ? uloga.trim() : '',
                    email: email ? email.trim() : '',
                    restoran: nazivrestorana ? nazivrestorana.trim() : '',
                    restoranId: restoranid ? restoranid : '',
                  }),
                  {
                    expires: new Date(Date.now() + 2 * 604800000),
                  }
                );
                res.redirect('/');
              } else {
                res.cookie(
                  'user',
                  JSON.stringify({
                    id: enkripcija.encrypt(String(resp.rows[0].id)),
                    ime: resp.rows[0].ime,
                    uloga: 'Kupac',
                    email: req.body.email,
                    restoran: '',
                  }),
                  {
                    expires: new Date(Date.now() + 2 * 604800000),
                  }
                );
                res.redirect('/');
              }
            }
          }
        );
      }
    }
  );
});

router.get('/register', function (req, res, next) {
  res.render('register');
});

router.post('/register', function (req, res, next) {
  const adresa = JSON.parse(req.body.adresa);
  pool.query(
    'insert into lokacija(latituda, longituda, ulica, grad) values ($1,$2,$3,$4) returning id',
    [
      adresa.latitude,
      adresa.longitude,
      adresa.formattedAddress,
      adresa.addressComponents.city,
    ],
    (err, resp) => {
      if (err) {
        console.error(err);
        return res.render('error');
      }
      pool.query(
        'insert into korisnik(ime,prezime,email,pwd,telefon,adresa) values ($1,$2,$3,$4,$5,$6)',
        [
          req.body.firstname,
          req.body.surname,
          req.body.email,
          enkripcija.encrypt(req.body.pwd),
          req.body.telefon,
          resp.rows[0].id,
        ],
        (err, resp) => {
          if (err) {
            console.error(err);
            return res.render('error');
          }
          res.status(200).json({ msg: 'Usjpešna registracija' });
        }
      );
    }
  );
});

router.get('/logout', (req, res, next) => {
  res.clearCookie('user');
  res.redirect('/');
});

module.exports = router;
